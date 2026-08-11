# ListItem Decomposition — Minimal Path Proposal Artifact

This document captures the before/after diff for the minimal-path implementation (primitives + `useListItemHighlight` + first consumers).

## TaskListItem: before → after

**Before (~70 lines of highlight/style wiring):**

```tsx
const listItemPressableStyle = [
    styles.selectionListPressableItemWrapper,
    styles.pv3,
    styles.ph3,
    styles.bgTransparent,
    isSelected && styles.activeComponentBG,
    styles.mh0,
    isLargeScreenWidth && StyleUtils.getSearchTableRowPressableStyle(!!isLastItem, isSelected, {vertical: variables.tableRowPaddingVertical}),
];

const animatedHighlightStyle = useAnimatedHighlightStyle({
    borderRadius: StyleUtils.getSearchTableHighlightBorderRadius(isLargeScreenWidth),
    shouldHighlight: item?.shouldAnimateInHighlight ?? false,
    highlightColor: theme.messageHighlightBG,
    backgroundColor: theme.highlightBG,
    shouldApplyOtherStyles: !isLargeScreenWidth,
});

// ...
pressableStyle={listItemPressableStyle}
pressableWrapperStyle={[styles.mh5, animatedHighlightStyle, isLargeScreenWidth && isLastItem && [styles.tableBottomRadius, styles.overflowHidden]]}
```

**After (~10 lines):**

```tsx
import ListItem, {useListItemHighlight} from '@components/SelectionList/ListItemComposed';

const {pressableStyle, pressableWrapperStyle} = useListItemHighlight({
    shouldHighlight: item?.shouldAnimateInHighlight ?? false,
    isSelected,
    variant: 'searchTable',
    isLargeScreenWidth,
    isLastItem,
});

// ...
pressableStyle={pressableStyle}
pressableWrapperStyle={pressableWrapperStyle}
```

Removed imports: `useAnimatedHighlightStyle`, `useStyleUtils`, `useTheme`, `variables`.

## Rows owning their own pressable layout

`TransactionListItemWide`, `TransactionListItemNarrow`, `TransactionGroupListItem` and `ExpenseReportListItem` keep their bespoke pressable styles and take `animatedHighlightStyle` alone. The saving is the config block plus the `useAnimatedHighlightStyle` import, not the style bundle:

```tsx
const {animatedHighlightStyle} = useListItemHighlight({
    borderRadius: 0,
    shouldHighlight: item?.shouldAnimateInHighlight ?? false,
    isSelected,
    shouldTrackSelectedBackground: true,
    shouldApplyOtherStyles: false,
});
```

`highlightColor` and the resting-background rule are now centralized, which is the part that makes "every styling fix lands once" true for these rows. `ExpenseReportListItem` needs no `shouldApplyOtherStyles` override at all — `variant: 'searchTable'` already derives `!isLargeScreenWidth`.

All six rows are converted here because the POC lands everything at once. The plan splits them in two: `TaskListItem`/`ChatListItem` in PR 1 (they consume the pressable bundle), and the four Search rows in PR 7, which also adds the three hook params they need. Only `SplitListItem` stays on raw `useAnimatedHighlightStyle` (different trigger and timing params); `GroupHeader` and `GroupChildrenContainer` are not rows and have no pressable. See the implementation plan's disposition table.

## UserListItemContent: drift fixes

| Drift | Before | After |
|-------|--------|-------|
| Avatar border on keyboard focus | `isFocused` (UserListItemContent) vs `isFocusVisible` (InviteMemberListItem, TableListItem) | Unified on `isFocusVisible` via `ListItemAvatar` |
| ~~Title active text~~ | `isFocusVisible ? sidebarLinkActiveText : sidebarLinkText` (BaseSelectListItem) vs `isFocused ? …` (UserListItemContent) | **Resolved by deletion, not unification.** `sidebarLinkActiveText` was byte-identical to `sidebarLinkText`, so the toggle was a no-op. Removed in `d45764d97c9`, already in `main`. `ListItemTitle` applies `sidebarLinkText` + `sidebarLinkTextBold` unconditionally and has no focus branch. |
| Right caret hover | Opacity dimming (BaseListItem) vs `getButtonState` fill (UserListItemContent) | Unified `getButtonState` fill via `ListItemRightCaret` |
| Right element focus context | Wrapped in Provider (UserListItemContent) vs raw (TableListItem) | Unified via `ListItemRightElement` |

## Avatar focus-highlight drift (visual)

When keyboard-navigating a user list:

- **Before:** `UserListItemContent` keyed avatar borders off `isFocused`, so avatar highlight could differ from `InviteMemberListItem` rows that use `isFocusVisible` for the same visual row type.
- **After:** All rows using `ListItemAvatar` share `isFocusVisible` semantics — avatar border tracks keyboard focus-visible state consistently.

> **Screenshot TODO:** Capture side-by-side keyboard navigation on a workspace member list (UserListItem) vs invite flow (InviteMemberListItem) before/after merge to confirm unified avatar highlight. Run on web with Tab/Arrow keys focused on adjacent rows.

## BaseListItem composition (1b)

Render-prop children now receive a second argument: `(hovered, {isSelected})`. Existing `(hovered) => ...` callbacks remain valid.

The interaction core lives in `ListItem.Pressable` (`ListItemComposed/ListItemPressable.tsx`): `OfflineWithFeedback` + `PressableWithFeedback` + press/hover/focus/a11y handling, zero layout opinions. `BaseListItem` is now a thin adapter over it that reproduces the legacy fixed layout (`ListItem.Row` wrapper + RBR indicator + `rightHandSideComponent` slot + right caret + `FooterComponent`), so all existing consumers work unchanged. Fully composed rows can use `ListItem.Pressable` directly and render `ListItem.Row`, content, `ListItem.RBRIndicator`, `ListItem.RightCaret`, and a footer as plain children.

`SelectableListItem` injects the checkbox/radio through composition around the row content (instead of the `rightHandSideComponent` slot) and owns RBR placement so the legacy order (content → RBR → button → RHS → caret) is preserved. It also gained `showSelectionButton?: boolean`, which collapsed the `BaseListItem`-vs-`SelectableListItem` wrapper fork inside `InviteMemberListItem`.

## Flag-ectomy showcase: InviteMemberListItem fully composed

`InviteMemberListItem` was the flag-densest wrapper call in the tree. Before, every piece of the row it wanted to control had to be expressed as a computed flag or a configured slot on `SelectableListItem`:

```tsx
<SelectableListItem
    // ...12 forwarded behavior props...
    shouldDisplayRBR={!(canSelectMultiple && !item.isDisabled)}   // double-negative flag
    showSelectionButton={!(item.isDisabled && !item.isSelected)}  // another computed flag
    FooterComponent={item.invitedSecondaryLogin ? <Text .../> : undefined} // configured slot
    rightHandSideComponent={rightHandSideComponent}               // opaque slot
    wrapperStyle={[...]}                                          // forwarded to a hidden View
    testID={item.text}                                            // forwarded to a hidden View
>
    {(hovered) => (/* content only — RBR/button/footer placement invisible from here */)}
</SelectableListItem>
```

After, it sits directly on `ListItem.Pressable` and the flags become plain conditional JSX in reading order — what renders and where is visible in the file itself:

```tsx
<ListItemComposed.Pressable item={item} /* behavior props only */>
    {(hovered, {isSelected}) => (
        <>
            <ListItemComposed.Row testID={item.text} style={[...]}>
                <ListItemComposed.Avatar ... isHovered={hovered} />
                <ListItemComposed.TextColumn>...</ListItemComposed.TextColumn>
                {(!canSelectMultiple || !!item.isDisabled) && <ListItemComposed.RBRIndicator ... isSelected={isSelected} />}
                {showsSelectionButton && <SelectionButton item={item} onSelectRow={onSelectionButtonPress ?? onSelectRow} ... />}
                {typeof rightHandSideComponent === 'function' ? rightHandSideComponent(item, isFocused) : rightHandSideComponent}
            </ListItemComposed.Row>
            {!!item.invitedSecondaryLogin && <Text ...>{translate('workspace.people.invitedBySecondaryLogin', ...)}</Text>}
        </>
    )}
</ListItemComposed.Pressable>
```

Gone from the call: `shouldDisplayRBR`, `showSelectionButton`, `FooterComponent`, `wrapperStyle`/`testID` forwarding, and the `SelectableListItem` layer entirely. `SearchQueryListItem` got the same treatment.

**Scoreboard — once all rows compose, these wrapper props can be deleted from the shared `BaseListItemProps` surface:** `shouldDisplayRBR`, `shouldShowRightCaret`, `rightHandSideComponent`, `FooterComponent`, `wrapperStyle`, `testID`, plus `SelectableListItem`'s `showSelectionButton`/`selectionButtonPosition`. Rows stop paying for layout opt-outs they never asked for (e.g. `ExpenseReportListItem` passing `shouldShowRightCaret={false}` today).

## New building blocks

| Unit | Path | Role |
|------|------|------|
| `ListItem.Pressable` | `ListItemComposed/ListItemPressable.tsx` | Interaction core (press/hover/focus/a11y, no layout) |
| `ListItem.Row` | `ListItemComposed/primitives/ListItemRow.tsx` | Main content row wrapper (style/testID/fsClass) |
| `ListItem.Title` | `ListItemComposed/primitives/ListItemTitle.tsx` | Focus-aware title text |
| `ListItem.Subtitle` | `ListItemComposed/primitives/ListItemSubtitle.tsx` | Supporting text |
| `ListItem.TextColumn` | `ListItemComposed/primitives/ListItemTextColumn.tsx` | Title/subtitle column |
| `ListItem.Avatar` | `ListItemComposed/primitives/ListItemAvatar.tsx` | ReportActionAvatars + border logic |
| `ListItem.CompactAvatar` | `ListItemComposed/primitives/ListItemCompactAvatar.tsx` | Small avatar for multi-select |
| `ListItem.RightCaret` | `ListItemComposed/primitives/ListItemRightCaret.tsx` | Unified caret |
| `ListItem.RightElement` | `ListItemComposed/primitives/ListItemRightElement.tsx` | Focus-context wrapper |
| `ListItem.RBRIndicator` | `ListItemComposed/primitives/ListItemRBRIndicator.tsx` | Brick-road dot |
| `useListItemHighlight` | `ListItemComposed/hooks/useListItemHighlight.ts` | Highlight + pressable bundle |

## Rollout status

1. ✅ Rewired variants: UserListItemContent, InviteMemberListItem, CardListItem, UserSelectionListItem, BaseSelectListItem, TravelDomainListItem
2. ✅ `showSelectionButton` added to SelectableListItem; InviteMemberListItem wrapper fork collapsed
3. ✅ `useListItemHighlight` adopted in TaskListItem and ChatListItem
4. ✅ Dead `TableListItem` deleted (only the `ValidListItem` union referenced it)
5. ✅ Fully composed rows on `ListItem.Pressable`: InviteMemberListItem (flags → conditional JSX, `SelectableListItem` layer dropped) and SearchQueryListItem (BaseListItem layer dropped)

Deliberately not migrated: `SplitListItem` and `ExpenseReportListItem` keep hand-rolled highlight bundles — their recipes differ materially (selection-driven highlight, custom radii/fades, responsive paddings), and folding them into `useListItemHighlight` would recreate the config bloat this effort removes.
