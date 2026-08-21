# Temporary Activity audit suite for Search

These tests exist to check the Search screen against the lifecycle described in
[ACTIVITY_SCREENS.md](../../../contributingGuides/ACTIVITY_SCREENS.md) before Search opts into
`nonTopScreenBehavior: 'activity'`. They are scaffolding for that decision, not a suite meant to stay in the repo.

Every test states an invariant that holds today and asserts the delta over one cover and uncover cycle rather than an
absolute call count, so the dev-only StrictMode double mount an Activity screen runs under never enters the numbers.

## Running

```bash
# What Search does today: its navigator sets no behavior at all
npx jest tests/ui/activitySearchEffects

# The same suite with Activity turned on for the covered screen
NON_TOP_SCREEN_BEHAVIOR=activity npx jest tests/ui/activitySearchEffects
```

The switch reaches the real `nonTopScreenBehavior` option of the screen, so the wrapper under test is the one the
navigator picks in production. The harness lives in
[`tests/utils/NonTopScreenBehaviorCycleTestUtils.tsx`](../../utils/NonTopScreenBehaviorCycleTestUtils.tsx).

The baseline is `none`, because `SearchFullscreenNavigator` sets no behavior and only the whole navigator is frozen,
when the user switches tabs. The question every test answers is therefore the migration question: with Activity on,
does the screen still behave the way it does today? `freeze` is deliberately out of the comparison. Search never runs
it, and measuring it here would also need work: the global setup replaces `react-freeze` with a pass-through and the
native wrapper only freezes after a 500 ms delay.

## Reading the result

A test that passes under `none` and fails under `activity` is a regression the migration would ship. A test that
passes under both documents behavior the migration does not change, which is worth keeping visible because several
findings of the audit turned out to be focus-driven rather than Activity-driven.

The findings each test maps to are numbered after `repo/activity-search-audit/EFFECTS.md`.

Three things the per-finding tests do not say on their own:

- **How Search is covered matters.** An RHP leaves Search the topmost fullscreen route, another fullscreen route does
  not, and the cleanups in `components/Search` guard on exactly that. Tests that touch those guards drive
  `isSearchTopmostFullScreenRoute` explicitly instead of inheriting whatever the harness stack happens to report.
- **One cycle is not enough for leaks.** `measureCycles` runs the cover and uncover cycle repeatedly and hands back
  the per-cycle count, so a test can tell a fixed per-reveal cost from one that grows with every reveal.
- **The screen is more than its page hooks.** `SearchSelectionEffectsTest` and `SearchOptimisticTrackingEffectsTest`
  cover the provider and the hooks that `<Search>` mounts inside the screen, which the first pass of the audit missed
  because it followed the hooks of `SearchPage` rather than the render tree below it.
