# Temporary Activity audit suite for Search

These tests exist to check the Search screen against the lifecycle described in
[ACTIVITY_SCREENS.md](../../../contributingGuides/ACTIVITY_SCREENS.md) before Search opts into
`nonTopScreenBehavior: 'activity'`. They are scaffolding for that decision, not a suite meant to stay in the repo.

Every test states an invariant that holds today, with covered screens frozen, and asserts the delta over one cover and
uncover cycle rather than an absolute call count, so the dev-only StrictMode double mount an Activity screen runs under
never enters the numbers.

## Running

```bash
# The baseline: covered screens keep the freeze behavior they have today
npx jest tests/ui/activitySearchEffects

# The same suite with Activity turned on for the covered screen
NON_TOP_SCREEN_BEHAVIOR=activity npx jest tests/ui/activitySearchEffects
```

The switch reaches the real `nonTopScreenBehavior` option of the screen, so the wrapper under test is the one the
navigator picks in production. The harness lives in
[`tests/utils/NonTopScreenBehaviorCycleTestUtils.tsx`](../../utils/NonTopScreenBehaviorCycleTestUtils.tsx).

## Reading the result

A test that passes under `freeze` and fails under `activity` is a regression the migration would ship. A test that
passes under both documents behavior the migration does not change, which is worth keeping visible because several
findings of the audit turned out to be focus-driven rather than Activity-driven.

The findings each test maps to are numbered after `repo/activity-search-audit/EFFECTS.md`.
