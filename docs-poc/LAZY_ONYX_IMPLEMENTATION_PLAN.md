# Lazy Onyx + deferUntilAppReady — Implementation Plan (mobile-only)

Companion docs: `LAZY_ONYX_IDEA.md` (research), `DEFER_IDEA.md` (deferral research).
Scope: iOS + Android. Web/desktop explicitly out of scope (lazy is native-only; web keeps eager init).

## Goal & POC thesis

Make `Onyx.init` stop loading the whole DB into RAM (one giant `JSON.parse` + full-graph deep copy),
so the app opens any screen fast. The POC proves the mechanism and produces the numbers that justify
(or kill) the larger program — **without touching the hot collections**, which stay eager until the
derived-values/consumer-migration lanes (post-POC) land.

POC headline metrics (before/after on the same seeded DB):
1. `ManualAppStartup` span duration (exists; measured via `.claude/skills/measure-telemetry-span/measure.sh`).
2. New `OnyxInit` span (+ children: storage read vs cache populate).
3. Peak RSS during boot (`adb shell dumpsys meminfo` polling; iOS via Instruments/argent native profiler).
4. `hydratedKeyCount` / `hydratedBytes` at `onSplashHide` (new span attributes).

## Ground truth the plan is built on (from research)

- The read-side hydration machinery **already exists** in the library (`OnyxUtils.get`/`multiGet` read
  storage on cache miss and populate cache); init pre-warming is what makes it dead code. `Onyx.merge`
  on an unhydrated key is already correct (reads storage at `Onyx.js:212` → `OnyxUtils.get`).
- Three library invariants break under lazy: (I1) "key in `storageKeys` ⇒ value in `storageMap`",
  (I2) "`getAllKeys().size > 0` ⇒ everything loaded" (the only 'not loaded' sentinel today),
  (I3) "`cache.get(key) === undefined` ⇒ key absent from storage" (→ `Onyx.set(key, null)` silently
  skips deleting an unhydrated row — real bug; `OnyxUtils.js:1083-1085`).
- App-side, the dominant boot demand is **route-independent**: `initOnyxDerivedValues()` (pre-React),
  the `ReportUtils.ts:1060-1243` module-connect block (+~20 other module connects), and the
  unconditionally-mounted `SidebarOrderedReportsContextProvider` together demand the ~10 hot
  collections on every boot. On top of that comes **route-dependent** demand: the initial screen is
  `LAST_VISITED_PATH` / a deep link (Home is only the tab navigator's default `initialRouteName`, and
  tab screens are `lazy: true`) — a Home boot additionally demands `snapshot_`/`transactionsDraft_`
  from the Home widgets; a report boot demands that report's member keys instead. Variable boot routes
  are an argument for subscription-driven hydration (demand follows the route automatically) and for
  keeping the eager set to singletons.
- **50 of 79 collections have zero collection-root subscribers anywhere in `src/`** — the lazy tail
  that never needs to be parsed. Two more are one small fix away (`attachment_`: one module connect at
  `Report/index.ts:576-579`; `reportActionsDrafts_`: zero boot-path subscribers already).
- The old e2e perf harness is deleted (commit `381d8a6c7b0`); `measure.sh` + Sentry spans are the whole
  measurement stack. Memory telemetry primitives exist (`src/libs/telemetry/getMemoryInfo/`,
  `sendMemoryContext.ts`) — missing only peak + attribution.

## Hard invariants (each becomes a library test)

1. **Key index is always complete and eager.** `Onyx.init` loads `getAllKeys()` fully (with the
   skippable-member-ID filter mirrored from init — `OnyxUtils.js:835-840`; note plain `getAllKeys` at
   `377-384` does NOT filter these today). Every write updates it. Rationale: `Onyx.clear` derives its
   delete list from the index (`Onyx.js:297,342`) — an incomplete index = **cross-account data leak on
   sign-out**. Test: seed N collections → `clear([])` → assert storage empty.
2. **Never notify a subscriber with a not-loaded value.** A collection-root subscription's first
   callback fires only after full hydration of that collection. Protects: derived values persisting
   empty computes (`OnyxDerived/index.ts:201-208` counts "fired once", not "hydrated"),
   `tests/utils/getOnyxValue.ts`, `window.Onyx.get`, and every `useOnyx` consumer.
3. **Hydration state flips to `hydrated` only after `cache.merge` lands** (before `keysChanged`).
   Protects against remount-after-disconnect serving a permanently empty collection.
4. **Hydration is joinable and idempotent** (`OnyxCache.captureTask('hydrate:<key>')` — the existing
   task-dedup mechanism). Concurrent subscribers, `reuseConnection: false`, StrictMode double-subscribe
   all join one read.
5. **Hydration never merges after/into a `clear`** — `hydrate` checks `hasPendingTask(TASK.CLEAR)`
   before merging; `clear` resets hydration states.
6. **Member-key subscription hydrates only that member** (existing `get(key)` path), not the whole
   collection; collection-root state stays `unhydrated` even with warm members (explicit tri-state,
   never inferred from cache contents).
7. **Hydration re-notify bypasses LRU bookkeeping** (`keysChanged` marks every member recently-accessed
   → would distort eviction order for `REPORT_ACTIONS`/`SNAPSHOT`).

## Phase 0 — Instrumentation + baseline (app-side, no behavior change, ships regardless)

- `OnyxInit` Sentry span around init (needs the library to expose the init promise — 1 line), with
  children for storage-read vs cache-populate. Attributes on `ManualAppStartup`: `hydratedKeyCount`,
  `hydratedBytes` (sum of raw `valueJSON` lengths — free at the provider), `usedMemoryMB` at
  `onSplashHide` (reuse `getMemoryInfo`).
- Dev-only demand recorder in `src/hooks/useOnyx.ts` (single chokepoint; raw useOnyx is lint-banned) +
  a matching hook on `connect`/`connectWithoutView`: records which keys were demanded before
  splash-hidden. Empirically validates the lazy/eager split before we commit to it.
- Startup `.ad` flow (`# @tag sentry-ManualAppStartup`; none exists today — flow body = wait for the
  landing screen to settle; `measure.sh` already relaunches between runs). **Pin the boot route**: the
  synthetic dump must set `LAST_VISITED_PATH` deterministically (import does not omit it), otherwise
  before/after runs land on different screens and are not comparable. Measure two boot profiles: Home
  and a report screen.
- Synthetic DB generator: Node script emitting an `onyx-state.txt`-shaped dump (reuse
  `tests/utils/collections/*` + `ReportTestUtils`), imported via Settings → Troubleshoot. Import
  force-offlines the app (`IS_USING_IMPORTED_STATE`) — measurements are stable, no refetch. Commit the
  generator, never dumps. Baseline shape: 1,000 reports × 100 actions, 50 policies, 5,000 transactions.
- Per-collection bytes census (one-off SQL over the seeded DB) to predict the win.
- Baseline run on `main`: `measure.sh ManualAppStartup 10 android` (+ iOS), `dumpsys meminfo` polling.

## Phase 1 — Library quick wins (eager semantics unchanged, independently flaggable)

- **Kill the init deep-copy**: `cache.hydrate(pairs)` direct-assign path instead of
  `OnyxCache.merge(allDataFromStorage)` (`OnyxUtils.js:845` → `fastMerge` re-allocates every object).
  Removes one full copy of the DB from peak RAM. Best value-to-risk change in the program.
- **Chunked init read**: replace one `getAll()` with per-collection prefix range reads
  (`WHERE record_key >= ? AND < ?` on the WITHOUT ROWID PK, keeping `json_group_array` per chunk),
  yielded across ticks. Splits the JS-thread block, cuts peak (each chunk's string collectable
  immediately), removes the `SQLITE_MAX_LENGTH` cliff.

## Phase 2 — Lazy hydration in the library (opt-in)

API (minimal, additive):
- `InitOptions.lazyCollections?: OnyxKey[]` — explicit allowlist; everything else eager. Native only.
- `Onyx.hydrate(collectionKey): Promise<void>`; `Onyx.getHydrationStatus(key)`.
- `StorageProvider.getByPrefix(prefix)` — SQLite: range scan + `json_group_array`; other providers +
  the jest `StorageMock`: JS fallback (filter `getAllKeys()` by prefix + `multiGet`) so no provider is
  left without it.
- `useOnyx` FetchStatus: keep the `'loading' | 'loaded'` union; extend the existing
  `isFirstConnection && hasPendingMergeForKey` condition (`useOnyx.js:168-171`) with
  `isAwaitingHydration(key)`. App `useOnyx` wrapper: no change needed.

Mechanics (per the library engineering map — file:line list lives in the research agents' report,
summarized): init loads keys + eager values; tri-state `hydrationState` in `OnyxCache` (+ `TASK.HYDRATE`
dedup via `captureTask`); sentinel fixes in `getCollectionData` / `tryGetCachedValue` /
`getCachedCollection`; `subscribeToKey`'s `getCollectionDataAndSendAsObject` becomes
`hydrateCollection`; `keysChanged` guarded against broadcasting unhydrated collection-root snapshots
(and force-hydrate before `mergeCollection`'s broadcast when a root subscriber exists);
`setWithRetry` gets a storage-fallback read (fixes the null-delete bug and the phantom compat check);
`clear` resets hydration state and the hydrate-vs-clear race is handled.

Out of scope in Phase 2 (documented, not built): eviction/unload, web parity.

## Phase 2b — Minimal paginated query API (D13)

Key insight making this cheap: **even without indexes, query-with-limit already wins** — `ORDER BY
json_extract(...) LIMIT N` executes inside SQLite (off the JS thread) and only N rows return to JS
and get parsed, versus hydrating the whole collection. Indexes are a later optimization of the
SQLite-side scan, added per orderBy field as needed.

API (decided: no cuts — `where` included in v1):
- `Onyx.queryCollection(collectionKey, {where?, orderBy: {field, direction}, limit, after?: cursor})`
  → `{items, nextCursor}` — keyset cursor (`WHERE (sortVal, record_key) < (?, ?)`), not OFFSET
  (stable under inserts between pages).
- `useOnyxQuery(collectionKey, {where?, orderBy, batchSize})` → `{items, loadMore, hasMore, status}`.
  **UI-wise there are no pages — the UI is a continuous list**: `items` is one contiguous array fed to
  FlashList, `loadMore` is wired to `onEndReached` (with a lookahead threshold, so batches usually
  arrive before the user hits the end). "Batch" is purely the I/O unit (how many rows one DB fetch
  returns), exactly like Paging3 under an infinite-scroll list.
- **`where` mini-DSL, two-engine by design**: equality, IN, range comparisons, AND — compiled to SQL
  (`json_extract`) AND evaluable in JS. The JS evaluator is not optional: it is both the consistency
  overlay and the live-query invalidation filter (below).

Live-update propagation (the "batch 1 changed after batch 3 was fetched" model — standard live-query
pattern à la WatermelonDB/Room). **Pages exist only at fetch time; after fetching there are no pages —
one contiguous WINDOW** (5 pages × 10 = a 50-item window). Invalidation is **per query, not per page
and not per item**: each active query (one list on screen = one query) registers ONE listener on the
collection's write stream; every write hits a cheap three-way classification:
1. **Irrelevant write** (fails `where`, not in window): ignore — cost is one predicate evaluation per
   active query. Scales with the number of on-screen lists, not with pages fetched.
2. **In-place change** (member in window, sort/where fields untouched): patch the item in the result
   array directly from cache (the write already went cache-first) — zero SQL. Rows may additionally
   hold member-key `useOnyx` for independent re-render, but the list's data flow is the one watcher.
3. **Order/membership change** (sort field changed, starts/stops matching `where`, delete, new
   matching item): **two-phase, patch-then-reconcile**. Phase 1 (synchronous, same tick): apply the
   change to the window directly — a deleted/no-longer-matching item is removed from the result array
   immediately (identical UX to today's full-collection behavior: the row vanishes, rows shift up); a
   changed sort key moves the item. Phase 2 (debounced, ~ms later): **re-query the whole loaded
   window** (same where/orderBy, `LIMIT = window size` from the start — never per-page, or page
   boundaries shift into dupes/gaps) to backfill the tail (item #51 enters, usually below the fold)
   and reconcile ordering; `nextCursor` recomputed from the new tail. The re-query is reconciliation,
   never the source of the visible change — a membership change is never perceptibly delayed by it.

Window growth: re-query cost grows with window size (LIMIT 50 cheap; LIMIT 1000 after 100 pages not).
Mitigation = **bounded live window** (the Android Paging3 `maxSize`/page-dropping pattern): POC ships a
hard window cap (~200 items — items beyond it leave the live window but stay warm in cache; scrolling
back re-queries that range by cursor); the full sliding viewport±N window is the documented later
optimization. FlashList virtualization keeps rendering costs flat regardless.

Other properties:
- Invariant-preserving by construction: query is a separate read path — it does NOT mark the
  collection hydrated and never feeds collection-root subscribers; loaded members land in cache as
  warm members (explicitly allowed by invariant 6).
- RAM consistency: DB result + per-key cache override for returned keys + the JS predicate over
  pending-write keys; documented edge: a freshly-created optimistic item appears after the
  (debounced) re-query — milliseconds.
- POC demo: a benchmark (top-20 via query vs full collection hydration on the seeded DB — likely the
  most persuasive number in the whole POC) + optionally, behind a dev flag, LHN in focus mode as the
  first real consumer (pure `lastVisibleActionCreated` sort; default mode stays on the old path).
- Prior art (this is a mainstream local-DB pattern; we sit mid-spectrum): Room+Paging3 invalidates on
  any table write and re-queries the window (coarser than us); NSFetchedResultsController computes
  per-row deltas from save notifications + faults rows on access (≈ our warm members); WatermelonDB's
  `observeWithColumns` filters invalidation by named columns (≈ our predicate filter); Dexie
  liveQuery / GRDB ValueObservation track touched index ranges/regions (finer than us); RxDB's
  event-reduce applies the write algebraically to the cached result instead of re-querying — the
  documented optimization path if window re-query ever gets hot; Realm's lazy live Results are the
  unreachable-on-KV ideal.

## Phase 3 — App-side POC wiring

**Decided scope (D4/D6): ALL collections are lazy in the POC — including the 10 hot ones and
`snapshot_`.** Singletons stay eager (they are small and edge cases hang on them). Consequence to
state honestly: hot collections still fully hydrate within the first moments of boot (their module
connects + derived configs + root providers demand them), but **demand-ordered, chunked, and gated by
invariant 2** — the win is JS-block/peak-RAM/TTI + the never-subscribed tail, not steady-state RAM.
Steady-state RAM comes from the post-POC lanes.

- **Eager set = singletons only**: `SESSION`, `CREDENTIALS`, `ACCOUNT`, `NETWORK`, `IS_LOADING_APP`,
  `HAS_LOADED_APP`, `ONYX_UPDATES_LAST_UPDATE_ID_APPLIED_TO_CLIENT` (else spurious full ReconnectApp),
  `PERSISTED_REQUESTS` + `PERSISTED_ONGOING_REQUESTS` (else duplicate request execution / dead
  background flush), `IS_USING_IMPORTED_STATE`, `SHOULD_USE_STAGING_SERVER`, `NVP_ACTIVE_POLICY_ID`
  (HybridApp OldDot sign-in), `NVP_TRY_NEW_DOT`, locale/theme, `LAST_FULL_RECONNECT_TIME`,
  `LAST_VISITED_PATH`/`LAST_ROUTE`, all `initialKeyStates` keys, and the persisted `DERIVED.*` outputs
  (restored via `OnyxUtils.get` before the derived engine's first flush).
- **All-lazy critical fixes** (from the edge-case register; required because hot collections are lazy):
  1. `getPolicyParamsForOpenOrReconnect` (`App.ts:298`) must await `Onyx.hydrate(POLICY)` before
     building `policyIDList` — else the server returns a full payload (silent TTI regression).
     Same for `shouldKeepPublicRooms`/draft-comment re-push reading `allReports` (`App.ts:373-403`).
  2. Push-notification predicate (`shouldShowPushNotification.ts`) becomes async with **targeted**
     `OnyxUtils.get(report_<id>)` / `get(reportActions_<id>)` reads (the Airship wrappers already
     return promises) — else notifications are silently suppressed during the hydration window, and
     a headless wake must not hydrate whole collections.
  3. `updateSnapshots` (`OnyxUtils.js:996`) hydrates `snapshot_` before applying updates when the key
     index shows members — the D4 decision to keep `snapshot_` lazy requires this, otherwise Search
     snapshots silently stop receiving updates.
  4. Pagination middleware: verify the existing `mergeCollection` member pre-warm (`OnyxUtils.js:1374`)
     covers `reportActions_`/`reportActionsPages_` continuity under lazy; add targeted hydration if not.
  5. OnyxDerived: invariant 2 (first collection-root callback only after full hydration) is the
     correctness guarantee; additionally assert in dev that a derived compute never runs with an
     unhydrated dependency, and add the test from edge 7.6 to the smoke set.
  Accepted window (POC-only): synchronous module-map readers (`ReportUtils` maps etc.) see `undefined`
  until their connects' hydration completes — a fast-tapping user in the first ~second may hit
  degraded reads. Production rollout of all-lazy requires the purity-migration lane (post-POC).
- **Lazy tail bonus fixes**: `attachment_` rewrite (module connect at `Report/index.ts:576-579` → one
  targeted member read); `reportActionsDrafts_` needs nothing.
- **`deferUntilAppReady`** (from `DEFER_IDEA.md` §4): small module with high/medium/low queues,
  `markAppReady(reason)` wired in `SplashScreenStateContext` on `HIDDEN` chained through
  `Navigation.isNavigationReady()`, ~10s fallback, drain via `requestIdleCallback` +
  `startTransition` (the `GlobalModals` pattern), Sentry breadcrumbs, idempotent (StrictMode). POC
  moves into it: `TransactionInlineEdit` (4 collection connects), `SplitExpenses` (2),
  `ClearReportActionErrors` (2), `Report/DeleteReport` (2) — all interaction-triggered modules. Rule
  going forward (D7): heavy-collection reads in modules sit behind the untilAppReady gate; making
  those module reads cheaper via indexes/targeted queries is the post-POC query-API lane
  (`LAZY_ONYX_IDEA.md` §3b synthesis / §3d).
- **Ships regardless**: `TelemetrySynchronizer.ts:50,60` count tags reimplemented from the key index
  (counts are free without values — D11).
- Not in POC (explicit descopes): unread-badge flicker; the `shouldShowNotFoundPage`
  loading-vs-absent audit (mitigated in POC by invariant 2 + smoke tests; full audit is post-POC);
  Pusher deferral; eviction; indexes/query API.

## Phase 4 — Measure & report

Same seeded DB, same flow, ≥10 runs each, Android + iOS: `main` vs Phase 1 vs Phase 1+2+3.
Report: span table, peak RSS, hydratedBytes/KeyCount, plus headless-push smoke test (send a push with
the app killed) and sign-out/sign-in smoke test (cross-account leak invariant).

Success criteria (to be agreed — see D10): measurable `OnyxInit` reduction and peak-RSS reduction on
the seeded DB with zero behavioral regressions in the smoke set; the tail (`hydratedBytes` delta)
quantified as the argument for the post-POC program.

## Test strategy

- POC lives on a branch; library changes developed in a react-native-onyx fork **with unit tests in
  the onyx repo** (hydration invariants 1-7).
- App unit tests: global `beforeAll` in `jest/setupAfterEnv.ts` does `Onyx.init({keys: ONYXKEYS})` with
  no lazy config → with opt-in lazy, **the suite runs eager and stays green by default**. Add one
  dedicated app-side test file initializing with `lazyCollections` to cover the integration.
- `waitForBatchedUpdates` hydration-awareness (loop until no pending Onyx GET/HYDRATE tasks) is only
  needed once hot collections go lazy — post-POC; noted, not built.

## Post-POC roadmap (pointers, not commitments)

**Milestone 1 — paginated hot collections via indexed queries (the answer to "load first N like
pagination"):** partial loading requires partial *asking* — today's collection-root subscribers
(derived values, LHN ranking, module maps) semantically demand the whole collection, and invariant 2
deliberately forbids serving them a truncated one. The unlock is member-subset/query subscriptions:
`useOnyxQuery(REPORT, {orderBy: lastVisibleActionCreated DESC, limit: 20})` → indexed SQLite query →
hydrate only those members; scroll = next page. First consumer: LHN in focus mode (pure
`lastVisibleActionCreated` index); default mode needs a materialized sort key or server ordering
first. Requires the §3d query API with the DB⊕RAM overlay and the two-engine predicate DSL.

`LAZY_ONYX_IDEA.md` §4a: derived-values lane (per-item lazy compute via indexes / write-driven),
consumer migration (~480 sites, member-keys/queries), SQLite expression indexes + query API with the
DB⊕RAM overlay, reportActions page-sharding + `PERSONAL_DETAILS_LIST` split (protocol change:
normalizer → backend dual-emit), enforcement ratchet (type-level + eslint-seatbelt; note
`onyxConnectWithoutViewReviewers.yml` and `checkOnyxConnectBypass.ts` already exist as machinery).

---

# Decisions — RESOLVED (2026-08-20)

| # | Decision | Outcome |
|---|---|---|
| D1 | Delivery | **User's existing react-native-onyx fork, feature branch `lazy-onyx`**; App work on the user's App fork. |
| D2 | Opt-in vs opt-out | **Opt-in** (`lazyCollections` allowlist); eager stays the default → stepwise migration to full lazy. |
| D3 | Member-key semantics | **Hydrate only the member.** |
| D4 | `SNAPSHOT` | **Lazy in POC** — with the `updateSnapshots` hydration fix (Phase 3 critical fix #3). |
| D5 | Test infra | **Minimal** (opt-in keeps the suite green; one integration test file). |
| D6 | Hot collections | **All collections lazy in POC**, including hot ones — see Phase 3 header for the honest consequence + the five critical fixes. |
| D7 | deferUntilAppReady | **Utility + 4 modules**; rule: heavy-collection module reads sit behind the untilAppReady gate; index-backed lightweight module reads = post-POC query-API lane. |
| D8 | `set(key, null)` bug | **Fix in Phase 2.** |
| D9 | Seeding | **Committed synthetic seeder script** + Troubleshoot import. |
| D10 | Success criteria | **Absolute target: cold start (`ManualAppStartup`) < 4s on a large seeded DB (stretch: < 3s)**, measured on the reference device after baseline is known; relative metrics (`OnyxInit`, peak RSS, `hydratedBytes`) kept for attribution. |
| D11 | Telemetry count tags | **Reimplement from the key index** (free counts, no residency). |
| D12 | Upstream | **Nothing goes to main repos during POC** — user's App fork + onyx fork only; upstream PRs after results. |
| D13 | Paginated query API in POC | **Yes — Phase 2b, full API**: `queryCollection`/`useOnyxQuery` with `where` (two-engine mini-DSL) + orderBy + batched fetching + keyset cursor; UI is a continuous list (batches are I/O units only); live-update model = one watcher per query, patch-then-reconcile; benchmark + optional flag-gated LHN focus-mode consumer. |

Original option analysis kept below for the record.

# Decisions to make (walk-through list)

**D1. POC delivery mechanism for the library change.**
Options: (a) fork via `git+https` dependency (onyx's `prepare` script builds `dist/` on install;
precedent: `react-native-image-size`); (b) patch-package on `dist/*.js` (machinery + validation
workflow in place; but hand-editing compiled JS across ~15 files, painful iteration).
**Rec: (a) fork** — we write TypeScript with tests, and it's the upstreamable path (it's our library;
the end state is a real PR to Expensify/react-native-onyx). Check: HybridApp submodule install path.

**D2. Lazy opt-in vs opt-out.**
Options: (a) `lazyCollections` allowlist (opt-in); (b) lazy-by-default with `eagerKeys`.
**Rec: (a)** — jest suite and all call sites stay eager/green by default; blast radius controlled;
per-collection rollout later via the allowlist.

**D3. Member-key subscription semantics.**
Options: (a) hydrate only that member; (b) hydrate the whole collection.
**Rec: (a)** — it's the existing `get()` behavior and the cheap path; requires the explicit tri-state
(invariant 6).

**D4. `SNAPSHOT` in POC.**
Options: (a) eager; (b) lazy + `updateSnapshots` force-hydrate.
**Rec: (a) eager** — Home's `YourSpendSection` demands it on the first mobile frame anyway, and
`updateSnapshots` silently drops updates for uncached snapshots.

**D5. Scope of test-infra work in the POC.**
Options: (a) minimal (opt-in keeps suite green; one integration test file); (b) full
hydration-aware `waitForBatchedUpdates` + helpers now.
**Rec: (a)** — (b) is only needed when hot collections go lazy (post-POC).

**D6. Hot collections in POC.**
Options: (a) all 10 eager (POC = quick wins + lazy tail); (b) try to lazy one hot collection.
**Rec: (a)** — every hot collection is pinned by derived values and/or module maps; (b) means pulling
the derived-values lane into the POC. Consequence to accept: POC headline is parse/TTI/peak-RAM, not
steady-state RAM.

**D7. `deferUntilAppReady` scope in POC.**
Options: (a) utility + 4 interaction-triggered modules moved (listed above); (b) utility only;
(c) skip entirely.
**Rec: (a)** — cheap, uses the shipped `loadPostSplashScreenModules` pattern, and it's the composition
story (defer *subscription establishment* of lazy-tail consumers).

**D8. `Onyx.set(key, null)` unhydrated-delete bug.**
Options: (a) fix in Phase 2 (storage-fallback read in `setWithRetry`); (b) defer.
**Rec: (a)** — cheap, and lazy-tail writes are incorrect without it.

**D9. DB seeding for measurement.**
Options: (a) committed synthetic generator + Troubleshoot import; (b) direct SQLite seeding;
(c) real QA account export.
**Rec: (a)** primary (reproducible, exercises real write path, force-offline for stable runs), with
(c) once as a realism check. (b) only if dumps get too big for the import path (it `cloneDeep`s).

**D10. Success criteria.**
Proposal to discuss: POC is a "go" for the program if on the seeded DB (Android, 10 runs):
`OnyxInit` ≥40% faster, peak RSS during boot ≥15% lower, `hydratedBytes` at TTI ≥20% lower, smoke set
green. Numbers are negotiable — set them before measuring, not after.

**D11. `TelemetrySynchronizer` count-tags.**
Options: (a) delete the two collection connects (lose the Sentry `reportsCount`/`personalDetailsCount`
tags); (b) reimplement lazily (read counts from the key index — free, no values needed!).
**Rec: (b)** — the key index makes counts free; keep the tags, drop the residency. Nice demo of the
new model, actually.

**D12. Phase 1 upstream timing.**
Options: (a) POC entirely on branch/fork, upstream after results; (b) upstream Phase 1 (hydrate +
chunked read) to Expensify/react-native-onyx immediately in parallel.
**Rec: (b)** — Phase 1 is semantics-preserving, benefits everyone regardless of POC outcome, and
shrinks our fork's diff.

---

# Execution log (2026-08-20)

Onyx fork (`lazy-onyx`): lazy hydration + invariants/tests → query API (where DSL, keyset cursor,
patch-then-reconcile) → index API (`indexes` init option + `reconcileIndexes` create/drop-undeclared,
composite fields, record_key auto-appended, partial-index literals) → `onFirstSubscription` →
post-clear rehydration of subscribed lazy collections.

App (`lazy-onyx-poc`): Phase 0 instrumentation → Phase 3 all-lazy wiring + critical fixes →
A1 index declarations → A2b demand-driven derived engine → A3 incremental outstanding config →
A4-T1 consumer tranche → deferUntilAppReady sync-under-jest → **retired REPORT_TRANSACTIONS_AND_VIOLATIONS**
(on-demand queries; useQueriedReportTransactionsAndViolations / useViolationsForTransactionIDs /
useDrainedOnyxQuery; usePolicyData on two queries) → per-report visible-actions hook
(useVisibleActionsEntryForReport) replacing whole-map reads in 4 consumers (Search-side whole-map
consumers stay on the demand-driven config) → bare-collection-subscription ratchet
(`scripts/checkBareCollectionSubscriptions.ts`, baseline committed).

Full app suite vs fork: only pre-existing environment failures (DateUtils/SubscriptionUtils/
UnreadIndicators — identical on the untouched baseline checkout); PaginationTest regression was found
and fixed at the library level (post-clear rehydration).

Open before Phase 4 (measurements): OUTSTANDING_REPORTS_BY_POLICY_ID retirement (in flight),
reportAttributes per-item hook + the LHN default-mode sort decision (user call: materialized sort
key vs server ordering vs focus-only), PERSONAL_DETAILS_LIST split (protocol-level), consumer
tranches T2+ (~470 sites), ReportUtils purity migration, navigation-guard hydration gating.

# Execution log (2026-08-21)

**Retired OUTSTANDING_REPORTS_BY_POLICY_ID** (agent): whole-map consumers →
`useAllOutstandingReportsByPolicyID` (drained live query, identical shape), ReportField →
`useOutstandingReportsForPolicy(policyID)`; shared `isOutstandingReport()` predicate (stateNum-null
and nested `pendingFields.preview` are JS-filtered on top of the indexed query); self-heal test
ported to visibleReportActions; LazyGroupSelectionTest fixed (was passing only because the derived
engine never started).

**Boot-demand sweep around REPORT_ATTRIBUTES**: the module-level
`Onyx.connect(DERIVED.REPORT_ATTRIBUTES)` in ReportUtils (imported by ~everything → counted as the
key's first subscription → started the whole engine during boot) is now registered from
`deferUntilAppReady('low')`; the always-mounted AuthScreensInitHandler dropped its
`useReportAttributes()` subscription for a passive `tryGetCachedValue` getter feeding Pusher.

**reportAttributes per-item lane — reachability audit result** (agent, call-graph over
computeReportName / generateReportAttributes / getReasonAndReportActionThatHasRedBrickRoad):
all three are lookup-only over the PASSED collections after point fixes — the only true
enumerations were `hasExpenses` (fixed: `isClosedExpenseReportWithNoExpenses` now takes the
report's prebuilt transaction array), `findSelfDMReportID` (already shielded by SELF_DM_REPORT_ID),
and `getViolatingReportIDForRBRInLHN` (needs a `reports where policyID=X AND owner=me AND
stateNum<=1` indexed query — pending, full-attributes lane). Module-level caches
(deprecatedAllReports & co., fed by whole-collection connects in ReportUtils + IOU/index.ts) are the
dominant remaining boot cost → ReportUtils purity lane.

**On-demand report names shipped**: `computeReportNameOnDemand` (libs/OnDemandReportName.ts) — seeds
a scoped store by graph walk (parent chain, chat report, actions/policies/RNVPs, per-report
transactions via indexed query), then runs the derived config's own `computeReportName` against
tracked Proxies to a miss-fetch fixpoint; the recorded key set drives write-watcher invalidation
(`watchOnDemandReportName`). Missing/invalid report → name `undefined` (mirrors the derived value's
deleted-entry semantics; caught by MoneyRequestReportPreview test). Hook
`useOnDemandReportName(s)`; `useDerivedReportNameByReportID` / `useDerivedReportNamesByReportIDs`
now DELEGATE to it — all ~25 single-name call sites migrated with zero consumer edits; direct
name-selector consumers (ReportPreviewHeader, TaskListItem) rewired. Parity test:
tests/unit/OnDemandReportNameTest.ts asserts on-demand === derived compute on identical data.
Still on the derived value: whole-map consumers (LHN sort, Search/options, IOU flows),
ReportActionsList (reads brickRoadStatus — needs the full-attributes per-item lane), DebugReportPage
(intentionally shows the derived value).

**Consumer tranche T2** (agent): 6 bare→member migrations (DynamicTaskAssigneeSelectorModal,
SearchEditMultipleTagPage, SplitExpenseCreateDateRagePage, DynamicIOURequestStepTag,
DynamicContactMethodDetailsPage, MoneyRequestReceiptView); ratchet 667→661 across 349→345 files.
T3 levers, by payoff: (1) `shouldRestrictUserBillableActions` redesign clears ~20
SHARED_NVP_PRIVATE_USER_BILLING_GRACE_PERIOD_END sites in one PR (key by policy.ownerAccountID);
(2) variable-cardinality selection flows need per-item child components or the query API; (3)
click-time-key callbacks need imperative `OnyxUtils.get` reads, not subscriptions.

**PDL split re-scoped**: 186 useOnyx sites / 197 files — recommend measuring first (eager singleton
either way, so it doesn't block lazy boot); decide post-measurement together with the LHN sort call.
