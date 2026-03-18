# Autoperf: Expensify App Render & Compute Performance

## Objective

Optimize the heaviest React Native components and utility functions in the Expensify App.
We measure render duration (ms) and render count using [Reassure](https://callstack.github.io/reassure/)
performance tests. The optimization target is **total render/execution duration** (ms, lower is better).

## How to Run

```bash
./auto/bench.sh <track>
```

Tracks: `sidebar`, `search`, `reportactions`, `utils`, `all`

The script runs typecheck (tsgo) as a correctness gate, then Reassure perf tests for the selected
track, and outputs parseable `METRIC` lines. Exit code 0 means everything passed.

## Metrics

- **Primary (optimization target)**: `total_duration_ms` — sum of all mean durations across track tests (lower is better)
- **Secondary (regression guard)**: `total_count` — sum of all mean render counts (must NOT increase)
- **Per-test**: `<test_name>_duration_ms` and `<test_name>_count` for each individual test

Reassure runs each scenario 10 times and averages. Due to variance, an improvement must exceed
**5% of baseline** to be considered real (not noise).

## Tracks

### Track: sidebar (LHN — Left Hand Navigation)

The sidebar is the first thing every user sees. It renders a FlashList of up to 500+ reports,
each with multiple Onyx data dependencies.

**Primary metric**: SidebarLinks + SidebarUtils duration

**Perf tests**:
- `tests/perf-test/SidebarLinks.perf-test.tsx` — renders sidebar with 500 reports, measures click interaction
- `tests/perf-test/SidebarUtils.perf-test.ts` — `getOptionData` and `getReportsToDisplayInLHN` on 15k reports

**Files in scope**:
- `src/components/LHNOptionsList/LHNOptionsList.tsx` — main list component (~15 useOnyx calls)
- `src/components/LHNOptionsList/OptionRowLHNData.tsx` — per-row data wrapper (memo with custom comparator)
- `src/components/LHNOptionsList/OptionRowLHN.tsx` — per-row renderer (memoized)
- `src/components/LHNOptionsList/LHNAvatar.tsx` — avatar component
- `src/libs/SidebarUtils.ts` — `getOptionData`, `getReportsToDisplayInLHN`, sorting
- `src/hooks/useSidebarOrderedReports.tsx` — report ordering/filtering hook
- `src/pages/inbox/sidebar/SidebarLinksData.tsx` — data layer above SidebarLinks

**Optimization hints**:
- Reduce the ~15 useOnyx subscriptions in LHNOptionsList (combine, lift to provider, use selectors)
- Improve OptionRowLHNData memo comparator to skip unnecessary re-renders
- Optimize `getReportsToDisplayInLHN` — this processes 15k reports and is a pure function
- Avoid allocations in `getOptionData` hot path (called per-row)

---

### Track: search

Search UI with autocomplete, multiple Onyx subscriptions, and large option lists.

**Primary metric**: SearchRouter + OptionsListUtils duration

**Perf tests**:
- `tests/perf-test/SearchRouter.perf-test.tsx` — search UI rendering with autocomplete
- `tests/perf-test/OptionsListUtils.perf-test.ts` — `createOptionList`, `filterAndOrderOptions`, `getValidOptions` with 5k reports

**Files in scope**:
- `src/components/Search/SearchRouter/SearchRouter.tsx` — main search router component
- `src/components/Search/SearchRouter/SearchRouterUtils.ts` — search utilities
- `src/components/Search/SearchAutocompleteList.tsx` — autocomplete dropdown (~10 useOnyx calls)
- `src/components/Search/SearchAutocompleteInput.tsx` — autocomplete input
- `src/components/Search/SearchList/` — search results list (FlashList)
- `src/libs/OptionsListUtils/index.ts` — option list creation, filtering, ordering (heavy)
- `src/libs/SearchUIUtils.ts` — search UI utilities with early-return optimizations

**Optimization hints**:
- `OptionsListUtils` processes 5k reports — reduce iterations, use Maps instead of repeated finds
- Reduce useOnyx calls in SearchAutocompleteList and SearchRouter
- Memoize intermediate option list computations
- Consider lazy computation of search results

---

### Track: reportactions (Chat)

The chat message list is the core UX. Uses InvertedFlatList for messages with complex
per-item renderers.

**Primary metric**: ReportActionsList + ReportActionsUtils duration

**Perf tests**:
- `tests/perf-test/ReportActionsList.perf-test.tsx` — renders chat list with report actions
- `tests/perf-test/ReportActionsUtils.perf-test.ts` — `getSortedReportActionsForDisplay`, `getLastVisibleAction`, `getLastVisibleMessage` with 10k actions

**Files in scope**:
- `src/pages/inbox/report/ReportActionsList.tsx` — main chat list (~950 lines, InvertedFlatList)
- `src/pages/inbox/report/ReportActionsListItemRenderer.tsx` — per-message renderer (memoized)
- `src/libs/ReportActionsUtils.ts` — action sorting, filtering, visibility checks

**Optimization hints**:
- `getSortedReportActionsForDisplay` processes 10k actions — optimize sort and filter
- Improve ReportActionsListItemRenderer memo comparator
- Reduce work in `getLastVisibleAction` / `getLastVisibleMessage` hot paths
- Consider caching sorted actions

---

### Track: utils (Pure Functions — Fastest Feedback Loop)

Pure utility function benchmarks via `measureFunction`. No rendering involved.
This is the fastest track for iteration (~30s per experiment).

**Primary metric**: Total function execution duration

**Perf tests**:
- `tests/perf-test/OptionsListUtils.perf-test.ts` — 5k reports, 1k personal details
- `tests/perf-test/ReportUtils.perf-test.ts` — 1k reports/policies
- `tests/perf-test/PolicyUtils.perf-test.ts` — 500 policy members
- `tests/perf-test/SidebarUtils.perf-test.ts` — 15k reports

**Files in scope**:
- `src/libs/OptionsListUtils/index.ts` — option list creation, filtering, search
- `src/libs/ReportUtils.ts` — report display, preview messages, permissions
- `src/libs/PolicyUtils.ts` — workspace member lookups, submit-to logic
- `src/libs/SidebarUtils.ts` — LHN data preparation, report sorting

**Optimization hints**:
- Replace O(n) lookups with Map/Set for large collections
- Use early returns to skip work when possible (already partially done in SearchUIUtils)
- Reduce temporary object/array allocations in tight loops
- Avoid repeated property access chains — destructure once
- Cache intermediate results in multi-pass algorithms
- Consider typed arrays or pre-sorted structures for 10k+ item operations

## Off Limits

- `tests/` — tests must continue to pass, do not modify
- `tests/perf-test/` — benchmark tests, do not modify
- `tests/utils/collections/` — benchmark data generators, do not modify
- `src/ONYXKEYS.ts` — data key definitions
- External package code / node_modules

## Constraints

1. TypeScript must compile: `npm run typecheck-tsgo`
2. All existing unit tests for modified files must pass
3. Reassure **render count** must NOT increase (deviation = 0)
4. No new npm dependencies
5. Semantic correctness must be preserved — identical behavior
6. Code must pass prettier: `npx prettier --write <files>`
7. Code must pass eslint: `npx eslint <files> --max-warnings=0`

## Baseline

> Fill this section after the first `./auto/bench.sh <track>` run.

### sidebar
```
(run ./auto/bench.sh sidebar to collect)
```

### search
```
(run ./auto/bench.sh search to collect)
```

### reportactions
```
(run ./auto/bench.sh reportactions to collect)
```

### utils
```
METRIC total_duration_ms=190.6
METRIC total_count=31.0
METRIC num_tests=31
Top tests by duration:
  SidebarUtils.getReportsToDisplayInLHN (default) = 66.4ms
  SidebarUtils.getReportsToDisplayInLHN (GSD) = 67.7ms
  ReportUtils.pushTransactionViolationsOnyxData = 22.1ms
  OptionsListUtils.worst_case_scenario = 11.0ms
  OptionsListUtils.getShareDestinationOptions = 5.3ms
  OptionsListUtils.getSearchOptions = 5.2ms
  OptionsListUtils.getMemberInviteOptions = 5.2ms
  OptionsListUtils.getFilteredOptions_with_search_value = 2.0ms
  OptionsListUtils.empty_search_term = 1.8ms
  PolicyUtils.getSubmitToAccountID (no category) = 1.7ms
```

## Progress Log

Record each experiment here. Use tab-separated values.

```
commit	track	total_duration_ms	total_count	status	description
```

Status: `keep` (improved >=5%), `discard` (no improvement or worse), `crash` (failed to run)

Example:
```
a1b2c3d	utils	1234.5	42.0	keep	baseline
b2c3d4e	utils	1180.2	42.0	keep	use Map in OptionsListUtils.createOptionList
c3d4e5f	utils	1250.0	42.0	discard	pre-sort reports by date (slower due to sort overhead)
d4e5f6g	utils	0.0	0.0	crash	typed array for report IDs (OOM in test)
```

```
8e65655	utils	190.6	31.0	keep	baseline
```
