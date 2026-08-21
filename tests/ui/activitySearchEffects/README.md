# Temporary Activity audit suite for Search

These tests exist to check the Search screen against the lifecycle described in
[ACTIVITY_SCREENS.md](../../../contributingGuides/ACTIVITY_SCREENS.md) before Search opts into
`nonTopScreenBehavior: 'activity'`. They are scaffolding for that decision, not a suite meant to stay in the repo.

Every test states an invariant that holds today, with covered screens frozen, and asserts the delta over one cover and
uncover cycle rather than an absolute call count, so the dev-only StrictMode double mount an Activity screen runs under
never enters the numbers.

## Running

```bash
# What a covered screen of a split navigator does today
npx jest tests/ui/activitySearchEffects

# What Search itself does today: its navigator sets no behavior at all
NON_TOP_SCREEN_BEHAVIOR=none npx jest tests/ui/activitySearchEffects

# The same suite with Activity turned on for the covered screen
NON_TOP_SCREEN_BEHAVIOR=activity npx jest tests/ui/activitySearchEffects
```

The switch reaches the real `nonTopScreenBehavior` option of the screen, so the wrapper under test is the one the
navigator picks in production. The harness lives in
[`tests/utils/NonTopScreenBehaviorCycleTestUtils.tsx`](../../utils/NonTopScreenBehaviorCycleTestUtils.tsx).

`none` is the baseline that matters for the decision, because `SearchFullscreenNavigator` sets no behavior and only
the whole navigator is frozen, when the user switches tabs. `freeze` is kept because it says whether a finding also
applies to the screens of a split navigator. Both produce the same set of green tests today.

## Reading the result

A test that passes under `freeze` and fails under `activity` is a regression the migration would ship. A test that
passes under both documents behavior the migration does not change, which is worth keeping visible because several
findings of the audit turned out to be focus-driven rather than Activity-driven.

The findings each test maps to are numbered after `repo/activity-search-audit/EFFECTS.md`.

Two things the per-finding tests do not say on their own:

- **How Search is covered matters.** An RHP leaves Search the topmost fullscreen route, another fullscreen route does
  not, and the cleanups in `components/Search` guard on exactly that. Tests that touch those guards drive
  `isSearchTopmostFullScreenRoute` explicitly instead of inheriting whatever the harness stack happens to report.
- **One cycle is not enough for leaks.** `measureCycles` runs the cover and uncover cycle repeatedly and hands back
  the per-cycle count, so a test can tell a fixed per-reveal cost from one that grows with every reveal.
- **The screen is more than its page hooks.** `SearchSelectionEffectsTest` and `SearchOptimisticTrackingEffectsTest`
  cover the provider and the hooks that `<Search>` mounts inside the screen, which the first pass of the audit missed
  because it followed the hooks of `SearchPage` rather than the render tree below it.
