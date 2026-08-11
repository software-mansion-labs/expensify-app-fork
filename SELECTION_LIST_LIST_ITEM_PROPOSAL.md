*Composition over configuration: SelectionList ListItem*

The `ListItem` layer under `SelectionList` carries **33 unique boolean props** (47 declarations - 14 are re-declared across the stacked prop types) and renders on **155 call sites**, spread across two list components (`SelectionList` and `SelectionListWithSections`).

Since we're actively decomposing large components in the codebase, it's a solid next candidate - the 15 live variants (`UserListItem`, `InviteMemberListItem`, `CardListItem`, …) copy-paste the same content recipes over and over (title 7x, alternate text 6x, avatar-with-focus/hover-border 2x, `rightElement` + focus context 2x, right caret 3x), and the Search results rows (`TaskListItem`, `ChatListItem`) each hand-roll their own animated-highlight style bundle. The copies have already drifted: avatar borders and title highlight key off `isFocused` in `UserListItemContent` but `isFocusVisible` in `InviteMemberListItem`, and the caret dims by opacity in `BaseListItem` but by `getButtonState` fill in `UserListItemContent`.

I suggest the interface be granular (flexibility for the custom rows - Search results, split editors), with the existing variants acting as the presets covering most of the app. The 155 call sites need **zero code changes** - variants just become thin wiring over shared primitives, so every styling/a11y fix lands once and reaches all of them. 

State sharing works like the decomposed `Button`: hover/focus/selection reach primitives through row context, which is also what lets the render-prop children go away. `ListItemFocusContext` already does this for `item.rightElement`; the row context supersedes it, scoped to the row instead of one slot. This is how it could look:

```tsx
// Preset - the ~90% case: pages keep passing a variant, completely unchanged
<SelectionList ListItem={UserListItem} ... />

// Granular - full control for custom rows (e.g. Search results). No state threading and no render
// prop: primitives that care (avatar border, title active state, brick-road indicator gating,
// caret fill) read hover/focus/selection from row context.
<ListItem.Pressable item={item} onSelectRow={onSelectRow}>
    <ListItem.Row style={rowStyle}>
        <ListItem.Avatar reportID={item.reportID} />
        <ListItem.TextColumn>
            <ListItem.Title text={item.text} />
            <ListItem.Subtitle text={item.alternateText} />
        </ListItem.TextColumn>
        <ListItem.RBRIndicator brickRoadIndicator={item.brickRoadIndicator} />
        <ListItem.RightCaret />
    </ListItem.Row>
</ListItem.Pressable>

// Style bundle - replaces the ~18 lines of copied highlight wiring per Search row with one hook call
const {pressableStyle, pressableWrapperStyle} = useListItemHighlight({shouldHighlight, isSelected, variant: 'searchTable', isLargeScreenWidth, isLastItem});
```

The existing `<BaseListItem>` / `<SelectableListItem>` APIs stay as-is during the migration (eventually they become thin adapters over the composed core), so nothing has to move at once. The prop surface shrinks along the way toward **~28 unique booleans** (what survives is item data, not config), and follow-ups can cut 1-3 boilerplate props from most call sites.
