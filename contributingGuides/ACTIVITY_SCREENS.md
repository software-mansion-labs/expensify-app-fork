# React `<Activity>` screens

A covered screen (one below the top of a stack navigator) can opt into being wrapped in React `<Activity>` by setting the `nonTopScreenBehavior: 'activity'` navigation option. `ScreenActivityWrapper` then deprioritizes its rendering while it is covered. The other behaviors are `'freeze'` (react-freeze, the previous default) and `'none'`. Migration is a per-screen decision tracked in the [rollout issue](https://github.com/Expensify/App/issues/98254).

## The lifecycle model (read this before opting a screen in)

In this wrapper, `AlwaysPaintedView` keeps the screen painted in both Activity modes. Its lifecycle still changes:

- **On hide**: React runs the cleanup of every effect in the subtree and detaches element refs, but state, ref values, and the fiber tree survive.
- **While hidden**: the screen keeps re-rendering at background priority, but effects do not run, so torn-down subscriptions stay down and events fired in this window are lost.
- **On reveal**: every effect runs again from scratch with the preserved state, and refs reattach.

The mental model: **hide + reveal = full effect unmount + remount with surviving state**. Every effect on an Activity screen must tolerate being cleaned up and re-run any number of times with unchanged dependencies. This is the same cycle StrictMode's dev-only double effect mount exercises, which is why `ScreenActivityWrapper` wraps opted-in screens in `StrictMode` in dev (see [STRICT_MODE.md](STRICT_MODE.md#strictmode-on-screens-that-opt-into-react-activity)). A screen that misbehaves under StrictMode will misbehave under Activity.

## What the wrapper already handles

`ScreenActivityWrapper` (in `src/libs/Navigation/PlatformStackNavigation/createPlatformStackNavigatorComponent/`) takes care of:

- A screen that mounts while already covered renders its first frame as visible.
- The reveal waits for the navigation transition to end, so it does not block the animation.
- During a window resize, the screen stays in visible mode to recalculate its layout.
- While covered, the content stays painted but is inert to touch and accessibility.

## Effects that must survive a cover

`useScreenActivityEffect` is a passive-effect escape hatch for work that must remain set up while an Activity screen is covered. It keeps the existing setup through a hide/reveal cycle, but still runs its cleanup when the dependencies change, the component is removed, or the screen leaves the navigation stack. It pairs an insertion effect, which React runs for a mount, a dependency change and a removal only, with the passive effect that does the work: the insertion effect records what the call site owes, and the passive effect, which may set state and read refs, settles it. A component removed while hidden gets no passive cleanup, so its insertion cleanup hands the release to the boundary of the screen instead; the `react-native` patch `044` makes that cleanup run inside a hidden subtree on native, as `react-dom` already does. An `<Activity>` the screen renders itself hides its subtree the same way a cover does. Outside a screen activity boundary the hook behaves like `useEffect`.

It does not make the hidden subtree live: other effects and `useOnyx` subscriptions remain disconnected, and element refs remain detached. A retained listener must therefore tolerate running while the rest of its component is inactive. It is also not a replacement for `useLayoutEffect`.

Compared with `useEffect` on a screen that stays live, it has these limits:

- Dependency changes while hidden are deferred and coalesced until the reveal, so the hook cannot observe every intermediate value, and a change that was undone before the reveal still runs the effect once there, because React compares the dependencies render to render. A change that lands in the commit that covers the screen is applied at the cover, so the setup for the new value is the one that survives it.
- A component removed while hidden is released on the reveal of the screen, or, before that, right before the setup of the next `useScreenActivityEffect` body of the screen that runs, or when the screen is popped. A plain `useEffect` body of the same reveal runs before that release, because the effects of the subtree run before the boundary above them.
- A commit that covers or reveals the screen runs every pending release of the subtree before any setup, releasing components removed while hidden first, so a single-owner resource is never held by two owners at once. Work that lands in a later commit runs inline, as on a live screen. A screen popped while visible releases every cleanup at its own place in tree order, exactly as `useEffect` does; a screen popped while covered releases the cleanups the cover skipped in the order React reported the removals, before any `useEffect` cleanup of the screen.
- A cleanup that throws is reported and the rest of the batch still runs, including the next setup of the call site whose cleanup threw, which is what React does with a destroy that throws. Where the error surfaces depends on who ran the batch: an error the boundary hits on a cover, on a reveal or on the pop of a covered screen is rethrown from the boundary and reaches the error boundary above the screen, not one inside it. An error a body hits, which is a cleanup of another component swept right before its setup, is only reported, because a body that threw would leave React without the cleanup of a setup that just ran.
- `StrictMode` does not double-invoke the hook: React double-invokes layout and passive effects only, never the insertion effect the hook records its work with, so the setup runs once under the wrapper's own gate and under `USE_REACT_STRICT_MODE_IN_DEV` alike, and the reveal of an `<Activity>` under a `StrictMode` leaves the setup alone. The gate therefore checks the plain effects of a screen only; a cleanup written with the hook gets no rehearsal from it.

## Regressions caused by unsafe effects

Effects that assume "mount happens once" or "cleanup means the user left" cause these classes of bugs:

- **Once-per-mount work re-fires on every reveal**: repeated API fetches, scroll resets, focus or keyboard stealing, analytics events.
- **"When X changes, do Y" effects re-fire on reveal with X unchanged**, discarding user state (selection, drafts).
- **Destructive cleanups fire on hide**: wiping module-level state, cancelling a debounced save without flushing it, or aborting in-flight requests while a surviving "already started" guard blocks the restart.
- **Missed events while hidden**: one-shot events (emitters, DOM events, store transitions that round-trip while hidden) are lost.
- **Timers restart from zero on reveal**; a cleanup that nulls timer state can make a poll loop spin or never resume.
- **Navigation guards** (`beforeRemove`) registered in effects are detached while hidden.
- **Reanimated entering/exiting animations replay on reveal** (web).

The fix is almost always to make the effect idempotent and symmetric, or to key the work on data identity (route params, report ID) instead of mount count.

## Opting a screen in

1. Set `nonTopScreenBehavior: 'activity'` in the screen's options (or a navigator's `screenOptions`). Persistent screens (for example the sidebar on web) are never wrapped.
2. Run the screen in dev and exercise cover/uncover flows (open and close an RHP over it, navigate away and back). The StrictMode gate will surface unsafe effects as double-invocations. Note that StrictMode catches only part of the issues: its double-invocation happens right after mount, so it will not catch cleanups that wipe state the user introduces only later (selection, drafts, in-progress input).
3. Audit the screen's effects against the regression list above, including hooks and components it renders.
