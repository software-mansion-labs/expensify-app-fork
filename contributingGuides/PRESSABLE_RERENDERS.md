# Pressable stack: stable props so `Pressable` can bail out

## Problem

Every interactive element renders through `PressableWithFeedback → GenericPressable (web wrapper) → BaseGenericPressable
→ react-native-web Pressable → View`. react-native-web's `Pressable` is `React.memo`, but it never bailed out because
`BaseGenericPressable` handed it a fresh value for almost every prop on every render:

- `disabledStyle = {}`, `hoverStyle = {}`, `focusStyle = {}`, `pressStyle = {}`, `screenReaderActiveStyle = {}` and
  `wrapperStyle = []` defaults created new objects per render, which invalidated the React Compiler memo of the
  `style` function and everything derived from it.
- Inline `onHoverIn` / `onHoverOut` / `onPressIn` / `onPressOut` wrappers changed identity whenever the parent passed
  a new callback (parents do that on nearly every render).
- `children` was always wrapped in a new render function, even when it was a plain element.
- `dataSet`, `accessibilityState` and `style` arrived as new objects with identical content.

Measured with the local re-render profiler (Chrome, dev build, real account): 60–68% of `Pressable` /
`GenericPressable` / `PressableWithFeedback` renders had no content change at all, and the Pressable family plus the
`View`/`Text` leaves under it accounted for ~38% of all React render time in a sweep over the main screens.

## Change

- `BaseGenericPressable`: frozen shared default styles; `style`, the four state styles, `dataSet`, `accessibilityState`
  and element `children` are content-stabilized (`useStablePressableInputs`, the "storing information from previous
  renders" `useState` pattern); consumer handlers are read through a `useRef` at event time so the functions passed to
  `Pressable` are created once; every prop for `Pressable` is computed as its own statement so the `{...rest}` spread
  does not invalidate them. Function children are passed through untouched (they are a real change by definition).
- `PressableWithFeedback`: frozen `wrapperStyle` default, `wrapperStyle` content-stabilized, stable hover/press
  handlers, `children` passed through instead of being wrapped.
- `OpacityView`: frozen `style` default. `ActiveHoverable`: stable `onHoverIn` / `onHoverOut`.
- New helpers: `src/hooks/useStableReference.ts`, `src/utils/referenceEquality.ts` (shallow / bounded-deep / element
  equality).

Behaviour is unchanged: same handlers fire with the latest callbacks, hover and press dimming verified against the
previous code, `npm run typecheck`, the React Compiler compliance check (Babel and OXC) and the Pressable-related Jest
suites pass.

## Gains

Medians over 4 baseline and 3 post-change sweeps (Home → Inbox → chat → composer → LHN scroll → Spend → Workspaces →
Account), dev build, React render self time:

| Metric | Before | After | Δ |
|---|---|---|---|
| react-native-web `Pressable` renders | 1918 | 1133 | −41% |
| … of which with no content change | 1412 | 553 | −61% |
| Pressable family self time | 123 ms | 105 ms | −15% |
| `View` / `Text` leaves self time | 321 ms | 274 ms | −15% |
| Total React self time in the sweep | 1162 ms | 1018 ms | −12% |

Read the total with care: phases whose commit count is stable (Workspaces, Account, Inbox, typing) improved by 2–8%;
the rest of the delta sits in phases with large run-to-run variance. The remaining `Pressable` re-renders come from
render-prop children (`{({hovered}) => …}`) that parents legitimately recreate; those have to be addressed at the call
sites. This is a hygiene win that applies to every screen and compounds with fixes to the real triggers (large
contexts such as `SearchResultsProvider`, unselected `useOnyx` collection subscriptions).

## Pitfalls worth remembering

- A ref returned from a custom hook is not recognized as a ref by React Compiler: it puts `ref.current` into the memo
  dependencies and recreates every handler each render. Call `useRef` in the component itself and update it in a
  layout effect.
- Default parameter values like `= {}` or `= []` are new objects on every render; hoist them to module constants.
- When a component spreads `{...rest}` into a memoized child, compute the props you want stable as separate
  statements above the JSX; the compiler memoizes each statement on its own inputs.
