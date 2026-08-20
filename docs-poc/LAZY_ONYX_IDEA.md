# Lazy Onyx — research findings

Research into what it would take to stop Onyx loading the entire database into RAM at startup
(giant JSON parse + full-DB residency), move toward per-route key loading, and how this composes
with the planned `deferUntilAppReady` utility (see `DEFER_IDEA.md`).

## TL;DR / verdict

- **The startup RAM + JSON-parse cost is 100% attributable to `Onyx.init`, by explicit library design.**
  `react-native-onyx@3.0.94` eagerly loads the whole DB in one batch: `initializeWithDefaultKeyStates()`
  → `storage.getAll()` → one SQL aggregate of the entire table → **one monolithic `JSON.parse` of the
  whole database on the JS thread** → a full deep-copy of the parsed graph (≈2× peak RAM). The ~207
  module-level `Onyx.connect` calls and ~4,700 `useOnyx` sites perform **zero storage I/O** — they are
  gated behind the init promise and hit the already-populated cache.
- **But lazy init alone would be immediately defeated by the app**: ~490 full-collection subscription
  sites (62-68 module-level connects + ~480 bare-collection `useOnyx` calls) plus `initOnyxDerivedValues()`
  (which runs pre-React and depends on 9-10 collections) would pull everything straight back into RAM.
  The library change and the app-side subscriber cleanup are **coupled — neither works without the other**.
- Per-route **fetch** (registry + deferred subscription establishment) is tractable and has shipped
  precedent. Per-route **eviction** is a much bigger project: it needs new upstream Onyx primitives,
  a tri-state cache representation, and it currently contradicts `contributingGuides/philosophies/PAGINATION.md:114`
  ("Data SHOULD NOT be evicted from disk…" — offline-first policy).
- Two cheap, non-breaking library wins exist **before** any lazy-loading work: chunk the startup parse,
  and kill the startup deep-copy. Highest value-to-risk in the whole document.

---

## 1. How Onyx actually loads at startup (library internals, v3.0.94)

All refs `node_modules/react-native-onyx/dist/...`.

- `Onyx.init` (`Onyx.js:50`) → `OnyxUtils.initializeWithDefaultKeyStates()` (`Onyx.js:77`) →
  `storage.getAll()` (`OnyxUtils.js:825`) → `OnyxCache.setAllKeys` + `OnyxCache.merge(allDataFromStorage)`
  (`OnyxUtils.js:844-845`). The library's own comment: *"Eagerly load the entire database into cache in a
  single batch read."* No size cap, no allowlist, no pagination. Only filters applied at ingest:
  `ramOnlyKeys` and `skippableCollectionMemberIDs` (`OnyxUtils.js:831-840`).
- **SQLite provider** (`SQLiteProvider.js:192-208`, backend `react-native-nitro-sqlite`):
  `SELECT json_group_array(json_array(record_key, json(valueJSON))) FROM keyvaluepairs` — SQL runs off the
  JS thread, but the result is **one giant string parsed with a single `JSON.parse` on the JS thread**
  (`:206`). No streaming, no partial/prefix reads in the `StorageProvider` interface at all.
  Latent cliff: the aggregated string is subject to `SQLITE_MAX_LENGTH` (default 1 GB).
- **Web (IndexedDB)**: `IDB.entries(store)` — no JSON.parse, but full structured-clone deserialization of
  the entire object store. Same cost profile.
- **Hidden 2× memory spike**: `OnyxCache.merge` (`OnyxCache.js:157`) runs `fastMerge(undefined, value)`
  at startup, which re-allocates **every plain object in the DB a second time** (`utils.js:39-108`);
  the freshly-parsed tree becomes immediate garbage. Peak RAM ≈ giant string + parsed graph + deep-copied
  graph, live simultaneously.
- **Everything waits on init**: `subscribeToKey` blocks on `deferredInitTask.promise` (`OnyxUtils.js:921`),
  resolved only after the full DB is in cache (`Onyx.js:77-79`). Post-init, `multiGet` never reaches
  storage (`OnyxUtils.js:270-296`). Per-subscription cost is CPU only: O(total keys) prefix scan per
  collection subscriber (`OnyxUtils.js:947`) + collection-snapshot spine rebuilds
  (`OnyxCache.rebuildCollectionSnapshot`, `OnyxCache.js:301-356` — new N-property object per dirty read).
- **Cache is unbounded and eviction is not a RAM mechanism**: `maxCachedKeysCount` no longer exists;
  `getKeyForEviction` fires only on a `CAPACITY` **write failure** (disk full) and deletes from disk too —
  there is no "keep on disk, drop from RAM" path. Whole collections are excluded from the LRU
  (`OnyxCache.js:238-245`). The app's `evictableKeys` (`src/setup/index.ts:41-49`) are therefore
  disk-quota recovery, and live collection subscriptions defeat even that.
- **No lazy features to lean on**: `canBeMissing`, `initWithStoredValues`, `allowStaleData`,
  `waitForCollectionCallback` were all **removed** from the API. `UseOnyxOptions` is only
  `{reuseConnection, selector}` — and **`selector` does NOT avoid loading**: the full collection is
  resolved from cache first, the selector runs over it (`useOnyx.js:155-156`). It is a re-render
  optimization only.
- Useful existing seeds: `ramOnlyKeys`, `skippableCollectionMemberIDs` (the only ingest filter — natural
  extension point), `OnyxCache.getCollectionData`'s "not loaded yet" sentinel (`OnyxCache.js:377-378`,
  currently global/binary), `OnyxCache.drop(key)` (cache-only forget, internal),
  `OnyxUtils.getCachedCollection(key, memberKeys?)` (subset read exists internally, not on the
  subscription path). The app already imports Onyx internals (`src/libs/actions/OnyxDerived/index.ts:21-23`).

### Two cheap wins before any lazy loading (library PRs, non-breaking)

1. **Chunk the startup parse** — replace the single `json_group_array` + one `JSON.parse` with N
   range-partitioned queries yielded across ticks. Same total work; breaks the JS-thread block; each
   chunk's string is collectable immediately (big peak-RAM cut); removes the `SQLITE_MAX_LENGTH` cliff.
2. **Kill the startup deep-copy** — a direct `cache.hydrate(pairs)` assignment path instead of
   `fastMerge` against an empty cache (`OnyxUtils.js:845`). Removes an entire copy of the DB from peak
   memory. Highest value-to-risk change in this document.

---

## 2. App-side: who pins full collections in RAM

### Guaranteed resident before the first frame

- **`initOnyxDerivedValues()`** (`src/setup/index.ts`, pre-React) — the single largest cause.
  `DERIVED.REPORT_ATTRIBUTES` alone (`OnyxDerived/configs/reportAttributes.ts`, 744 lines, 14 deps) pins
  `report_`, `reportActions_`, `reportNameValuePairs_`, `reportMetadata_`, `transactions_`,
  `transactionViolations_`, `policy_`, `policyTags_`, `PERSONAL_DETAILS_LIST`. Its incremental path is
  bypassed on first load (full scan). `RAM_ONLY_SORTED_REPORT_ACTIONS` is RAM-only → recomputed from
  scratch every cold start. `OUTSTANDING_REPORTS_BY_POLICY_ID` has **no incremental path** (full scan on
  every `report_` write).
- **Module-eval of util/action files** (all transitively imported by everything):
  `ReportUtils.ts:1060-1243` — **17 module-level connects** building snapshot maps (`deprecatedAllReports`,
  `deprecatedAllTransactions`, `allReportActions`, …), two of which rebuild full indexes on every write;
  `actions/IOU/index.ts` pins **9 collections incl. `snapshot_`** (defeating its evictable status);
  `ReportActionsUtils.ts:107`, `actions/Report/index.ts:516-577`, `actions/App.ts:108,114`.
- **Deprecated duplicates of existing derived keys** (pure deletions available):
  `OptionsListUtils/index.ts:252` (worst offender — re-sorts every report's actions on every
  `reportActions_` write; superseded by `RAM_ONLY_SORTED_REPORT_ACTIONS`), `ReportUtils.ts:1097` + `:1128`
  (duplicate `OUTSTANDING_REPORTS_BY_POLICY_ID` / `REPORT_TRANSACTIONS_AND_VIOLATIONS`),
  `PersonalDetailsUtils.ts:32` (duplicate `LOGIN_TO_ACCOUNT_ID_MAP`, issue #66391),
  `Parser.ts:11,31` (rebuilds reportID→name / accountID→name maps over full collections on every write,
  just for mention rendering).
- **Telemetry absurdity**: `TelemetrySynchronizer.ts:62,72` loads full `report_` and
  `PERSONAL_DETAILS_LIST` **solely to send `Object.keys(value).length` as Sentry tags**. Highest-value,
  lowest-risk deletion in the codebase.
- **Root-mounted React subscribers**: `useSidebarOrderedReports.tsx:85-95`
  (via `AuthScreens.tsx:185`, unconditional) — 6 full collections for ~20 LHN rows;
  `useTodoCounts.ts:36-41` — 7 full collections → 4 tab-badge integers, classified during render;
  `DeepLinkHandler.tsx:38` (`report_`, no selector); `FullstoryUserContextHandler.tsx:21` (`policy_` to
  read one policy); `PriorityModeHandler.tsx:16`.
- **Per-list-item full-collection subscribers** (worst render multipliers):
  `Search/SearchList/ListItem/ActionCell/PayActionCell.tsx:50-52` (3 collections per row),
  `TransactionGroupListExpanded.tsx:91-125` (4 per row).

### useOnyx whole-collection census (~604 sites, ~480 bare)

`policy_` 166 · `report_` 72 · `transactionViolations_` 66 · `transactions_` 40 ·
`reportNameValuePairs_` 35 · `reportActions_` 22 · rest mostly bounded.
Worst "load everything, filter to a few": `useDeleteTransactions` (9 collections),
`SearchEditMultiplePage` (8), `useSearchBulkActions` (6), `useTransactionViolation`-family
(whole violations collection for one transaction), `usePrivateIsArchivedMap` (full map to answer one
report's archived flag), `useAncestors` (3 collections to walk one chain).

### Suggested first cuts (no new API, deletions or swaps to existing derived keys)

`TelemetrySynchronizer:62,72` → `OptionsListUtils:252` → `PersonalDetailsUtils:32` → `Parser:11,31`
→ `ReportUtils:1097,1128` → `Fullstory/common:20` → `FullstoryUserContextHandler:21`
→ `replaceOptimisticReportWithActualReport:43,52,241`.

---

## 3. Per-route keys — precedents, blockers, plan

### Existing precedents (this has been tried, twice)

- **Search SNAPSHOT** — a complete shipped implementation of route-scoped data.
  `CONST.SNAPSHOT_ONYX_KEYS` (`src/CONST/index.ts:7633`) is literally a declarative "keys this scope
  covers" registry. The app-wide `useOnyx` wrapper (`src/hooks/useOnyx.ts:76-107`) **transparently
  rewrites subscriptions** to `snapshot_<hash>` when inside `SearchScopeProvider` — proof that a
  route-scoped provider can work **without touching consumer components** (raw `useOnyx` is
  lint-restricted; only 15 escape hatches). Its two costs: (1) every optimistic write must dual-write
  into the scope, and `IOU/SearchUpdate.ts` had to **re-implement the backend query predicate
  client-side**; (2) the team already partially retreated — `SearchResultsProvider.tsx:48-70` recomputes
  to-do results from live full collections because snapshots go stale the moment the user acts.
- **reportActions pagination** — the sanctioned lazy-loading precedent (`registerPaginationConfig.ts`,
  `Middleware/Pagination.ts`); consumption already per-member (`usePaginatedReportActions`).
  `ReportScreen.tsx` has only 2 `useOnyx` calls, both member-keyed — the model consumer.
  Governing rule: `PAGINATION.md:114` forbids disk eviction.
- **Focus mode** — the server already scopes: `openApp` sends `enablePriorityModeFilter: true`
  (`App.ts:436`), auto-enabled above `MAX_COUNT_BEFORE_FOCUS_UPDATE = 30` reports, "primarily for
  performance". Backend-side filtering is proven. (`reconnectApp` is unscoped, though.)
  `App.ts:307-407` manually re-pushes public rooms + draft-comment reports the scoped payload would drop
  — a live example of "scoped payload dropped something the client needs".
- **47 `open*Page` actions** — the de-facto per-route fetch model (fetch-only, never evicts, mapping
  lives in screens instead of a registry). Most refined: `usePolicyConnectionsPrefetch.ts` (per-item lazy
  hydration + persisted "already fetched" flag). A route→keys registry generalizes this.
- **Navigation hooks exist**: `NavigationRoot.tsx:275-288` `handleStateChange` already does per-route
  resource cleanup (`cleanStaleScrollOffsets` — diffs nav state against a keyed store, even derives
  parameterized scope keys like `${route.name}-${policyID}`). The cold-start seed must come from
  `onReadyWithSentry` (`:290-303`) — React Navigation does not fire `onStateChange` for the initial state.
- **Registry location**: `SCREEN_ONYX_KEYS: Partial<Record<Screen, KeySpec[]>>` as a sibling of
  `SHARED_ROUTE_PARAMS` (`src/ROUTES.ts:4757`) — an existing per-screen registry of the exact same shape.
- **Cleanup-registry precedent**: `src/libs/SessionCleanup.ts` (`registerSessionCleanupCallback`) —
  the direct analogue for a `registerRouteCleanupCallback`.

### Hard blockers (what fundamentally breaks)

1. **`getCollectionDelta` treats "not loaded" as "deleted"** (`src/libs/getCollectionDelta.ts:31-38`) —
   the delta engine under both `OnyxDerived` and the LHN (`useSidebarOrderedReports` uses 6
   `useCollectionDelta` calls). Evicting a member is indistinguishable from deleting it → derived values
   drop entries, LHN drops rows, re-hydration looks like bulk insert. Fix requires a **tri-state cache
   representation** (`present | deleted | not-loaded`) in Onyx itself — the deepest-blast-radius change.
2. **Global inverted indexes need whole collections by definition**: `outstandingReportsByPolicyID`,
   `loginToAccountIDMap`, `reportTransactionsAndViolations`, LHN global ordering
   (`LEFT_HAND_NAVIGATION.md` — 5 priority groups ranked across ALL reports). These must become
   server-provided or incrementally-persisted indexes. Derived values also persist to disk and restore on
   boot — a partially-computed derived value would be persisted silently wrong.
3. **Module maps fail silently on partial data**: `getReportOrDraftReport`, `getRootParentReport`
   (recursive ancestry walk), `getPolicy` (all `ReportUtils.ts:1260-1397`) return `undefined`/wrong roots
   instead of throwing. Retiring the 17 module maps (tracked: #66412, #66413, #66414, #66425, #66430,
   Expensify#507850) is a **prerequisite** for any partial loading.
4. **Optimistic-write-into-a-scope** — every write must decide if it belongs in the currently-loaded
   scope; `SearchUpdate.ts` shows the cost (hand-written client copy of the backend predicate). Without a
   generic solution this sinks the project. Read-before-write in action files
   (`openReport` reads `allReports`, `App.ts:373-392` iterates it) builds optimistic payloads from
   whatever is loaded.
5. **Policy**: `PAGINATION.md:114` (no disk eviction — offline philosophy), `OPTIMIZATION.md` (must
   measure first — and **no memory metric exists in the repo today**, no Onyx cache-size telemetry).
6. **Routing philosophy chicken-and-egg**: routes deliberately carry minimal IDs (`ROUTING.md`), so a
   route→keys resolver must walk the graph (parent report → policy → transactions) from one ID — which
   requires the neighbors to already be loaded.

### Plan, ranked by invasiveness

**Tier 0 — free, do first regardless**
1. Add Onyx cache-size/key-count telemetry (baseline required by `OPTIMIZATION.md`; nothing exists).
2. Declare `SCREEN_ONYX_KEYS` with zero behavior change + a dev-only assertion in `src/hooks/useOnyx.ts`
   logging undeclared key reads → produces the ground-truth route→keys map empirically.
3. Land the two library quick wins (chunked parse, `cache.hydrate`) — cuts JS-thread block + peak RAM
   with no semantic change.
4. Delete the deprecated duplicate connects + telemetry-count connects (first-cuts list above).

**Tier 1 — moderate, no schema change**
5. Convert top full-collection `useOnyx` sites to member-keyed reads where the route names the ID
   (`policy_` 166, `transactionViolations_` 66, `report_` 72).
6. Finish the ReportUtils purity migration (retire the 17 module maps).
7. Move route-scoped module connects (`TransactionInlineEdit`, `SplitExpenses`, `ClearReportActionErrors`,
   `DeleteReport`, …) behind `deferUntilAppReady` / post-splash imports; generalize the 47 `open*Page`
   calls into the registry.
8. Generalize `SearchScopeProvider` → `RouteScopeProvider` reusing the `useOnyx.ts:76-107` redirect.

**Tier 2 — invasive, upstream react-native-onyx work**

> **Recommended shape: subscription-driven on-demand hydration (grow-only, no eviction) — see §3a.**
> It replaces the route→keys registry as the *loading* mechanism (the registry stays useful only for
> idle prefetch) and sidesteps the two hardest per-route blockers.

9. Member-subset collection subscription (`useOnyx(collectionKey, {memberKeys})`) —
   `getCachedCollection` already accepts the param internally.
10. Lazy hydration: init loads `getAllKeys()` + an eager singleton set only; per-collection tri-state
    hydration status; subscription path triggers hydration + re-notify (`useOnyx` already has
    `FetchStatus: 'loading'|'loaded'` plumbing).
11. Cache-only unload (`OnyxCache.drop` exists internally; decouple from `storage.removeItem`), driven
    from `handleStateChange` cleanup alongside `cleanStaleScrollOffsets`. **Optional / later** under the
    §3a variant — only eviction needs the tri-state delta fix and the `PAGINATION.md:114` policy argument.

### 3a. Variant: subscription-driven on-demand hydration (no per-route registry)

Instead of a declarative route→keys registry, let the subscription graph itself be the demand signal:
`Onyx.init` loads only `getAllKeys()` + a small eager singleton set (session, NVPs); a `useOnyx`/`connect`
on a key (or collection root → prefix range scan) triggers hydration from disk; cache is **grow-only**
(no eviction).

Why this beats the per-route registry as the loading mechanism:
- The demand signal is exact by construction — components subscribe to what they render. The
  `ROUTING.md` chicken-and-egg (routes carry minimal IDs) disappears: whoever needs a neighbor
  subscribes to it.
- **Sidesteps blocker #1** (`getCollectionDelta` not-loaded-as-deleted): grow-only means members never
  vanish; hydration looks like inserts, which the incremental paths already handle.
- **Sidesteps blocker #5** (`PAGINATION.md:114`): nothing is evicted from anywhere.
- **Dissolves blocker #4** (optimistic-write-into-scope): there are no scopes; `Onyx.merge` on an
  unhydrated key already reads from disk on cache miss.
- Even with zero app changes it turns the monolithic startup parse into demand-ordered per-collection
  chunks, and keys nobody subscribes to this session (stale `snapshot_`, `attachment_`, unused features)
  are **never parsed at all**.

What it does NOT change — the prerequisites are identical: today "on demand" = "everything, in the first
second", because `initOnyxDerivedValues()` (pre-React, 9-10 collections), the module-level connects, and
the root-mounted LHN/todo subscribers demand 100% of the DB at boot. Tier 0-1 cleanup + deferring
non-critical subscription establishment via `deferUntilAppReady` is what makes on-demand actually lazy.

Costs specific to this variant:
1. **Render-then-fetch waterfall**: navigation to a cold screen becomes mount → loading → data even
   though the data is on disk. Grow-only fixes second visits; first visits are covered by heuristic
   **idle prefetch through the `deferUntilAppReady` low-priority queue** (LHN-visible reports,
   last-visited routes) — the cleanest composition of the two ideas, no registry needed.
2. **Derived values must never compute on a partially hydrated collection** — a collection-root
   subscription must hydrate the full collection before the first callback (natural, but must be
   enforced in the implementation; `reportAttributes` persists its output to disk).
3. **Synchronous out-of-React reads** (`OnyxUtils.get`, the ReportUtils module maps, read-before-write
   in action files) silently see `undefined` during the hydration window — the purity migration
   (Tier 1 #6) remains the hard prerequisite.
4. **Long-session RAM is unchanged** (grow-only converges on everything loaded). The win is startup
   TTI / parse block / peak RAM and never-touched data. Eviction stays a separate, optional later stage —
   and only it needs tri-state + the policy argument.

**Tier 3 — architectural / backend**
12. Server-provided or incrementally-persisted global indexes (LHN ordering, outstanding-by-policy,
    login→accountID); scoped `reconnectApp`.
13. Generic optimistic-write-into-scope mechanism (so there are never 47 more `SearchUpdate.ts` clones).

### 3b. Changing the demand itself (why "100% at boot" is not a law of nature)

The boot demand that defeats on-demand hydration is the sum of four fixable patterns. Five levers:

1. **Delete fake demand** — `TelemetrySynchronizer` counts, deprecated duplicate connects
   (the first-cuts list in §2). Free.
2. **Narrow demand with projection keys (schema change — the answer to "collections you can't filter
   at the DB level")**: split hot metadata from cold bodies. LHN ranking needs ALL reports but only a
   tiny projection per report (lastVisibleActionCreated, isPinned, notificationPreference, errors,
   draft flag) — `reportMetadata_` is the existing precedent for a parallel projection collection.
   Global operations then subscribe to the cheap header collection; full objects hydrate per-member on
   entry. The same move fixes the `reportActions_<id>` blob: page-sharded values (consistent with the
   existing `REPORT_ACTIONS_PAGES`) turn one giant JSON into independently hydratable chunks.
3. **Restructure derived values from "subscribe to whole collections and diff" to write-driven.**
   Full-snapshot diffing via `getCollectionDelta` is an implementation choice — Onyx already broadcasts
   per-key changes. If derived configs consume `(key, newValue)` events from the write stream:
   indexes (`outstandingReportsByPolicyID`, `loginToAccountIDMap`, LHN ordering, todo counters) maintain
   incrementally with **no collection residency**, needing only their persisted previous output +
   incoming writes; computes needing related data for the changed item do targeted member-reads (exactly
   what on-demand hydration provides); the full scan survives only as a **one-time build** (per install /
   schema version / locale), run in idle via `deferUntilAppReady`. Precondition: derived outputs must be
   **persisted** — `RAM_ONLY_SORTED_REPORT_ACTIONS` being RAM-only is what forces full `reportActions_`
   residency every cold start; making it disk-backed removes the single biggest demander. Persisted
   indexes need a version stamp + rebuild path so they can't silently drift from the data.
4. **Defer surviving demand** — module connects that must exist but not before first frame
   (pagination config, unread indicator, Pusher-adjacent) establish via `deferUntilAppReady`
   (`loadPostSplashScreenModules` is the shipped pattern).
5. **Move demand to the server** — focus mode proves backend filtering works
   (`enablePriorityModeFilter`); natural extensions: scoped `reconnectApp` (today unscoped),
   server-computed badge counts, server-provided LHN ordering.

Target cold start after these: eager singletons + persisted derived outputs (LHN order index, counters)
+ member keys of the visible screen. LHN renders from the index + ~20 header projections; everything
else hydrates on demand or in idle. Boot demand drops from "100% of the DB before first frame" to
"dozens of small keys" — the point at which §3a's on-demand hydration actually pays off.

Hardest piece: lever 3 (write-driven derived engine — touches `OnyxDerived/index.ts`, needs the
drift-protection story). Lever 2 is a schema migration with backfill. Levers 1, 4, 5 are independent
and cheap.

#### Moving derived values to the DB level (making them lazy too)

"DB level" means three different mechanisms depending on each derived value's nature; the boundary is
whether the logic is expressible in SQL or is business JS:

- **A. Pure inverted indexes → become SQL indexes + lazy queries (cease to exist as derived keys).**
  `OUTSTANDING_REPORTS_BY_POLICY_ID`, `REPORT_TRANSACTIONS_AND_VIOLATIONS`: a partial expression index
  + an on-demand query replaces the stored object — zero residency, no delta engine, no invalidation
  problem (SQLite maintains the index on write). Caveat: `LOGIN_TO_ACCOUNT_ID_MAP` belongs here
  logically, but `PERSONAL_DETAILS_LIST` is one giant blob key, not a collection — it must first be
  resharded into `personalDetails_<accountID>`.
- **B. Per-member transforms → need no global precompute at all.** `SORTED_REPORT_ACTIONS` /
  `VISIBLE_REPORT_ACTIONS` compute per report; the all-reports output is legacy (`OptionsListUtils`).
  Lazily compute on report open for one report (SQLite `json_each` can even explode+sort the actions
  map in-query; the complex JS visibility filter runs on one report's actions). The only global
  consumer — LHN's last message per report — is already covered by server-sent report fields
  (`lastMessageText`, `lastVisibleActionCreated`).
- **C. Business-logic aggregates → write-time materialization into per-member keys.**
  `REPORT_ATTRIBUTES` (report names: locale, display names, type branching) is not expressible in SQL —
  instead the compute moves to the write path: the ingest normalizer computes attributes for the
  changed report only (targeted neighbor reads) and stores them as a per-member key
  (`reportAttributes_<id>` or a header-projection field). Lazy-readable, indexable, incrementally
  maintained by construction. Global invalidations (locale change) = idle rebuild.

Hidden prerequisite for B/C: today's derived **outputs are themselves giant blob keys** (one key holds
attributes for ALL reports) — resharding outputs per member is what makes them lazy-hydratable and
keeps one report's write from rewriting the whole result blob. Net effect: categories A/B delete the
delta engine, C replaces it with a per-write normalizer, and `initOnyxDerivedValues()` stops pinning
anything — closing item 4 of the §4a plan.

**New-persisted-keys ledger** (which classes add keys to Onyx — new keys = duplication + invalidation
duty + bigger `getAll`):

| Class | New keys | Nature |
|---|---|---|
| C. write-time derived materialization | `reportAttributes_<id>` (+ optionally persisted sorted actions as interim) | **derived duplicate** — needs version stamp + rebuild path |
| Header projections (§3b lever 2) | `reportHeader_<id>` | **subset duplicate** — fan-out generated from schema so it can't drift |
| LHN order index (if client-side) | persisted `DERIVED.LHN_ORDER` | derived duplicate, same duties |
| reportActions blob sharding (§4a 2b) | `reportActionsPage_<id>_<n>` | **regranulation, not duplication** — same bytes, one-time migration |
| PERSONAL_DETAILS_LIST split (cat. A precondition) | `personalDetails_<accountID>` | regranulation |
| Versioning metadata (§3c/3d) | per-key version stamps, index-config hash meta key | small, technical |

Zero new keys: category A (SQLite indexes live outside the Onyx key space — this class *deletes*
derived keys), category B (in-memory/memoized — also deletes keys), library step 0, module-connect
cleanup, `deferUntilAppReady`, enforcement/telemetry. Prioritization rule that falls out: maximize
A/B and regranulation; add materialization only where logic can't move to SQL (realistically report
attributes, and LHN order unless the server takes it).

**Alternatives to derived materialization (category C can shrink to near-zero).** The only *global*
consumer forcing `reportAttributes` to exist for ALL reports is default-mode alphabetical LHN sort
(sort key = report name); everything else needs attributes only for visible/open reports. That unlocks:
1. **Lazy compute + RAM memo (no persistence)** — compute attributes when a row/report becomes
   visible (~20 LHN rows on first render is negligible); works outright in focus mode (sorted by
   `lastVisibleActionCreated`, no names needed).
2. **Server-side** — backend sends display names and/or LHN ordering (lever 5; focus mode proves the
   server can decide LHN contents). Locale-dependent names are the complication. Best long-term.
3. **Minimize materialization to the sort key alone** — persist only the ordered reportID list (or a
   tiny sort-key per report) instead of full attribute objects; names for visible rows come from (1).
   Cuts duplication and drift surface by an order of magnitude.
4. **Demote the contract: freshness-checked cache instead of authoritative key** — stamp persisted
   values with input versions (`localeVersion + algoVersion + report.lastUpdated`); mismatch on read →
   lazy recompute. Staleness costs recompute, never correctness — the rebuild-path duty and the
   "persisted and silently wrong" risk disappear (HTTP-cache-with-ETag semantics, not a replica).
Recommended composition: 1+3 client-side (the order list as the only small persistence), 4 as the
semantics for anything still persisted, 2 as the destination — after which full per-member
materialization may be an empty set.

**Per-item lazy derived compute via indexes (the synthesis).** Today's compute signature is
`(allReports, allPolicies, allTransactions, …) → attributes for ALL reports` — full snapshots pin the
collections. The lazy form is `computeReportAttributes(reportID)`: a pure per-item function whose
inputs resolve on demand as a graph walk from one ID — member reads (`report_X`,
`policy_<report.policyID>`, `personalDetails_<accountID>` after the blob split) plus **indexed
queries** for the one-to-many hops (`transactions WHERE reportID = X` via `idx_txn_reportID` — without
the index this hop is what forces whole-collection residency; with it, cost drops from O(database) to
O(item + neighbors)). Memoized in RAM with input stamps. Invalidation is mechanical because all writes
flow through one broadcast path and the written value carries the linking field (a `transactions_T`
write carries `reportID = X` → invalidate the memo for X only) — liftable into a library primitive:
lazy derived = compute-on-first-read + per-item invalidation from the write stream, replacing
subscribe-everything + snapshot-diff (salsa/adapton-style memoized queries; WatermelonDB observables).
Design duties: (a) per-item compute is async on cold cache — loading≠empty semantics apply, memo makes
second reads sync; (b) N+1 — batch per collection (`WHERE reportID IN (…)` + `multiGet`) for the ~20
LHN rows, never per-row queries; (c) snapshot consistency — the compute must read through the same
DB⊕cache overlay as the §3d query API, or attributes compute against pre-optimistic-update state.

### 3c. Schema-first codegen (managing migrations, indexes, and enforcement from one artifact)

The idea: a machine-readable Onyx schema + code generation. One crucial inversion versus "generate from
our TS types": **schema-first, not types-first.** TS types are erased at runtime and too expressive to
be a reliable schema source (the `src/types/onyx/*` types are deep unions, Records, circular refs —
extraction pipelines break silently on them). The industry pattern (Prisma, Drizzle, Realm,
WatermelonDB, GraphQL codegen) is: schema is a runtime DSL artifact, TS types are **generated from it**.
Migration path is painless — one-time best-effort extraction of the initial schema from existing types
(TS compiler API, human-reviewed), after which generated types are identical to today's, so consumers
see no change.

What the schema artifact unlocks (one artifact serves several threads of this document):

1. **Versioning + CI-enforced migrations** (the Room/Realm discipline): schema hash per collection;
   CI fails when the schema changed without a migration entry — mechanizes "what if the schema suddenly
   changes". Replaces the ad-hoc `migrateOnyx` list. Critical for our sizes: migrations must be
   **lazy per-key** (migrate a value on first read, stamp a version per key) — an eager boot-time
   rewrite of all `reportActions_` would recreate the giant-parse problem.
2. **Declared indexes → DB-level filtering**: `report: {index: ['policyID', 'lastVisibleActionCreated',
   'isPinned']}` → codegen emits SQLite generated columns (`json_extract`) + `CREATE INDEX` + typed
   query helpers (`query(REPORT).where('policyID', id)`). Honest platform asymmetry: the web IDB
   provider would need per-collection object stores with indexes, or a full-scan fallback.
3. **Drift-proof projections**: schema declares `reportHeader = pick(report, [...])` → codegen emits
   the write fan-out (a write to `report_X` also updates `reportHeader_X`). Automates §3b lever 2 and
   guarantees projections can't drift from the full object.
4. **Enforcement becomes generated, not maintained**: the cardinality/eager-lazy metadata from §5's
   registry chokepoint becomes schema fields from which the lint rules and dev assertions are generated.
5. **Dev-time validation**: runtime validators from the schema catch backend shape drift (silent today —
   TS types lie at runtime). The schema file is also the first artifact that can be physically shared
   with the backend (eventually: both sides generated from one spec) — a contract instead of a
   convention, addressing the backend-sync gap in §5.

Costs: indexes tax every write (our write path is chatty with optimistic updates — index only what
queries need; the schema makes that reviewable); backend does not formally follow our schema, so
validation is noisy short-term (a feature long-term); codegen does not solve data scoping — it makes
storage queryable, hydration policy remains §3a/3b. MVP scope: schema for 2-3 heavy collections
(`report`, `reportActions`, `transaction`) generating version stamps + generated-column indexes + a
typed query API in the SQLite provider; measure, then expand.

#### Reconciling schema-first with the server writing Onyx keys directly

In Expensify's protocol the backend is the de facto owner of data shapes — HTTPS responses carry
`onyxData` and Pusher carries `OnyxUpdatesFromServer`, all funneling through one narrow ingest
chokepoint (`src/libs/actions/OnyxUpdates.ts:117` → `Onyx.update(update.data)`, ordered/gap-filled by
`applyOnyxUpdatesReliably` / `OnyxUpdateManager`). The client schema therefore must be **descriptive
and tolerant, never prescriptive** — the classic *tolerant reader* pattern (Protobuf unknown-field
preservation, Avro reader/writer schemas, Stripe boundary transforms):

1. **Open schema — unknown fields pass through and persist, never stripped.** An older app receiving
   data from a newer backend must not truncate fields it doesn't know: we persist and later merge/send
   that data, and the post-update app needs it. No strict parse-transform.
2. **Divergence never rejects a write — it emits telemetry.** Rejecting a server update forks client
   state from server state (corruption); tolerating a drifted shape is degradation. Prod: write always
   lands; a generated, sampled validator reports drift to Sentry fingerprinted by
   (key, field, expected type, schema version). Dev: throw. Today drift is invisible (TS types lie at
   runtime); with this it becomes a per-release alert.
3. **Migrations live at the ingest boundary permanently, not as one-shots.** A one-shot rewrite to
   schema v2 is undone by the next Pusher update still shaped as v1. Generated normalizers run on every
   ingest at the chokepoint (upgrading v1→v2 in flight) plus read-time upgrade via per-key version
   stamps for data written before the normalizer shipped. A normalizer lives until the backend stops
   sending the old shape.
4. **Indexes degrade gracefully under drift** — `json_extract` on a missing/re-typed field yields NULL:
   the row falls out of indexed queries but the full data is intact. Design consequence: index only
   stable scalar load-bearing fields (IDs, timestamps, flags — the ones the backend treats as API-stable
   anyway), and alert when an indexed column goes NULL-heavy (the signal that the backend changed a
   shape).
5. **Long-term, the schema is the negotiation artifact with the backend** — the app already sends its
   version with requests and the backend already version-gates responses; a versioned schema file (plus
   the drift dashboard as evidence) is the first thing that can be physically shared, eventually
   generating both sides from one spec. Points 1-4 work fully without any backend cooperation.

#### Implementation sketch: seed the schema from observed backend traffic

The schema has two layers, and only one is derivable from observation: the **shape layer** (fields,
types, optionality) — where the backend is ground truth and inference from real traffic beats our
aspirational, already-drifted TS types — and the **policy layer** (what to index, projections,
cardinality class, eager/lazy) — an authored client decision traffic cannot reveal.

**Stage 0 — seed from two sources + diff.** (a) Instrument the single ingest chokepoint
(`OnyxUpdates.ts:117`) with a **shape recorder** (field paths + type tags per key, never values — no
PII), run the existing E2E suites + QA sessions through it, optionally sampled shape-only telemetry
from production (only real accounts exercise the rare variants); merge samples quicktype-style
(unions from variants, optionality from occurrence stats). (b) Extract a second draft from
`src/types/onyx/*` via the TS compiler API — it encodes intent and covers fields not yet observed.
(c) Diff the two drafts → reconciliation report → human commits schema v1 for the 2-3 MVP collections.
The diff is valuable on its own: a types-vs-reality drift report before anything ships. Caveat:
observation cannot distinguish "optional" from "not yet observed" — which is why traffic alone is not
enough and the TS draft + human arbitration are required.

**Stage 1 — format + generators.** The schema artifact is a declarative, diffable file
(JSON-Schema-like, optionally authored through a typed TS helper) rather than zod-as-code, because five
generators must introspect it: TS types (CI-checked assignment-compatible with today's, so consumers
see no change), the sampled runtime drift validator, SQLite DDL (generated columns + indexes from the
policy layer), ingest-normalizer skeletons (vN→vN+1), and the enforcement metadata (§5 lint rules /
dev assertions).

**Stage 2 — continuous loop.** "Generate from the backend" never ends at the seed: the sampled shape
telemetry at the chokepoint keeps comparing reality against the schema forever. Schema updates become
data-driven PRs ("field X arrives as number in 3% of sessions since release Y") — which is also what
keeps the schema from silently rotting (the sustainability concern in §5: production continuously
verifies it).

### 3d. Staying key-value + expression indexes on the current table

The key-value schema can stay. Everything above works on the existing single
`keyvaluepairs(record_key TEXT PK, valueJSON JSON) WITHOUT ROWID` table: SQLite supports **expression
indexes directly on `json_extract`** and **partial indexes** conditioned on `record_key` — no relational
redesign. "Schema change" elsewhere in this doc means **key granularity** (page-sharding the
reportActions blob, projection keys), not leaving KV.

Sequencing reality check: **no read today filters by value** — Onyx reads by key only (`getAll` +
`multiGet ... WHERE record_key IN`). An index without a query path is pure write tax. Order of work:
1. **Prefix range scans — no index needed, available now**: `record_key` is the PK, so
   `>= 'report_' AND < 'report_￿'` is already optimal. This is the foundation of per-collection
   lazy hydration and costs nothing.
2. **A query API in the provider/library** (the actual hard part, not the indexes).
3. **Then indexes**, matched to inventoried access patterns (partial + expression), e.g.:
   `json_extract('$.lastVisibleActionCreated')` and `'$.policyID'` and `'$.parentReportID'` WHERE
   `record_key GLOB 'report_*'` (literal prefix — does not match `reportActions_`);
   `'$.reportID'` WHERE `GLOB 'transactions_*'`; `'$.private_isArchived'` WHERE
   `GLOB 'reportNameValuePairs_*'`.

Limits and caveats:
- **`reportActions_` is unindexable as-is**: the value is a map `actionID → action`; expression indexes
  need a deterministic scalar expression and cannot reach into every child of a map. The heaviest
  collection stays unindexable until the blob is sharded (pages / per-action keys).
- Mechanically adding indexes is easy (`CREATE INDEX` works on existing data via nitro-sqlite); the
  one-time O(N) build belongs in an idle-deferred migration (`deferUntilAppReady`), not on the boot path.
- **Write amplification**: every merge to an indexed collection maintains all its indexes, and our
  write path is chatty — index sparingly and measure.
- The planner uses an expression index only when the query text matches the index expression
  **exactly** — another argument for codegen emitting both the DDL and the query helpers from one
  source (§3c).
- Web asymmetry remains: IndexedDB has no expression indexes on the current single-store layout.

#### How expression indexes would land in react-native-onyx (it's our library — this is a PR, not a fork)

1. **Declaration in `Onyx.init`**, consistent with the existing per-key option pattern
   (`evictableKeys`, `ramOnlyKeys`): `indexes: {[COLLECTION.REPORT]: ['policyID',
   'lastVisibleActionCreated', 'parentReportID'], ...}`. Read API: imperative
   `Onyx.query(collectionKey, {where, orderBy, limit})` for MVP; `useOnyx(key, {where})` later.
   The predicate must be a **narrow DSL** (equality, range, IN — not arbitrary functions), because it
   must execute in two engines: SQL and JS (see consistency below).
2. **Provider capability**: three optional `StorageProvider` methods — `getRange(prefix)` (prefix scan,
   no index needed), `ensureIndexes(config)`, `queryByIndex(prefix, where, opts)`. SQLite implements
   them; IDB/memory fall back to hydrate-and-filter-in-JS (uniform API, honest perf asymmetry).
   Note IDB **does** have indexes (`createIndex(keyPath)` + `IDBKeyRange` queries) — the fallback is
   forced by our provider's current layout, not by IDB: one flat object store with out-of-line keys
   mixes all collections, and IDB has no partial indexes (an index on `'policyID'` would span every
   collection carrying that field) and cannot combine the out-of-line record key with a value keyPath.
   IDB also lacks expression indexes (literal keyPaths only) and only allows index DDL inside a
   version-change upgrade transaction (multi-tab `blocked` handling needed). Two paths to real web
   parity:
   - **True 1:1 — SQLite WASM + OPFS**: the official `sqlite3.wasm` build gives the identical engine,
     SQL, and expression/partial indexes — one DDL/query codegen for both platforms, zero asymmetry
     (WASM-shipping precedent exists: `setWasmUrl` in `App.tsx`). Costs: the deciding trade-off is
     **multi-tab** — the OPFS `opfs-sahpool` VFS takes an exclusive file lock (one tab), so a
     Web Locks leader election + BroadcastChannel/SharedWorker proxy is required (the PowerSync/
     ElectricSQL production pattern); plus ~0.4-0.5 MB gzip lazy-loaded wasm and a one-time IDB→OPFS
     data migration.
   - **Pragmatic ~1:1 — per-collection IDB stores** (Dexie/WatermelonDB-style): every candidate index
     in this doc is a literal scalar field (`policyID`, `reportID`, `lastVisibleActionCreated`,
     `parentReportID`, `private_isArchived`) — plain keyPaths IDB indexes natively, so this covers
     100% of the identified query patterns; per-collection stores substitute for partial indexes, and
     multi-tab works natively. Missing vs SQLite: true computed-value expressions (none planned) and
     the single shared codegen (IDB needs its own `createIndex`/`IDBKeyRange` generator — two query
     implementations to maintain).
   - Recommendation: B as the faster intermediate step; A pays off fully once web also moves to lazy
     hydration (today web hydrates everything at boot, so JS filtering over the hot cache is cheap).
   `ensureIndexes` reconciles declared vs existing indexes via `sqlite_master` (index names encode
   collection+field+expression hash); the O(N) first build runs via an exposed
   `Onyx.buildPendingIndexes()` that the app calls from idle (`deferUntilAppReady`, low priority) —
   never on the boot path. `queryByIndex` emits SQL from the same generator as the DDL, satisfying
   SQLite's requirement that the query expression textually match the index expression.
3. **Index maintenance is free implementation-wise**: Onyx already writes the full JSON per key
   (`INSERT OR REPLACE`); SQLite maintains expression indexes on write. Cost = `json_extract` × indexes
   × write — index sparingly.
4. **The hard problem — query/cache consistency**: Onyx writes cache-first and persists async, so a DB
   query can miss pending optimistic writes ("added an expense, it's not on the list"). Standard fix
   (WatermelonDB-style): **result = query(DB) ⊕ cache overlay** — cached keys win, pending-write keys
   are run through the predicate evaluated in JS (hence the two-engine DSL). Live query subscriptions
   are a later stage: feasible because all writes flow through one broadcast path (evaluate registered
   predicates in JS per write, re-notify only changed result sets); MVP is one-shot query + manual
   invalidation.
5. **Versioning/rollout**: index-config hash in a meta key; mismatch → differential drop/create in
   idle. Indexes are purely additive — droppable without data loss, and an unbuilt index degrades to a
   correct-but-slower range scan, so the whole feature is flaggable per index. MVP library diff is
   small: `Onyx.init` + `SQLiteProvider` + provider types + a query module; the real work is
   consistency tests for the overlay.

Schema seeding mechanics (answering "how do we generate the schema from the backend"): cheapest first —
run quicktype-style shape inference **offline over real Export-Onyx-State dumps** from varied QA
accounts (feature already exists; dumps contain PII — process locally). Then the online recorder at the
`OnyxUpdates.ts:117` chokepoint (dev/E2E builds, field paths + type tags, no values) to capture
transient shapes that resting-state dumps miss. Merge both, diff against the TS-types draft, human
arbitrates (§3c Stage 0).

---

## 4. How this composes with `deferUntilAppReady`

Key insight: **`deferUntilAppReady` cannot defer data, but it can defer *when a subscription is
established* — and subscriptions are what force residency.** The shipped pattern already exists:
`loadPostSplashScreenModules()` dynamically imports `registerPaginationConfig`, which establishes 4
collection subscriptions post-splash. The utility formalizes and extends exactly this.

| Phase | Signal | Onyx work |
|---|---|---|
| pre-splash | `Onyx.init` | Register route→keys map (pure data). `initOnyxDerivedValues()` stays here until derived deps are rearchitected — derived values must not miss updates. |
| A: nav ready | `Navigation.isNavigationReady()` | Resolve the **focused** route's key set; fire its `open*Page` / member-key subscriptions. Never defer the visible screen — that would regress `SPAN_APP_STARTUP`. Seed from `onReadyWithSentry` (no `onStateChange` for initial state). |
| C: splash hidden (`markAppReady`) | `SplashScreenStateContext` `HIDDEN` | **high**: hydrate adjacent routes (other split-navigator pane, LHN list). **medium**: establish remaining module-level full-collection connects (extend `loadPostSplashScreenModules`). |
| D: `HAS_LOADED_APP` / `IS_LOADING_APP === false` | after OpenApp | **low**: predicted-route hydration (last-visited tabs, `usePolicyConnectionsPrefetch`-style fills). Must gate here — sign-in page also reaches `HIDDEN`. |
| route change | `handleStateChange` | Diff key sets: load additions immediately; enqueue **evictions at low priority, cancellable** (back-nav right after forward-nav must not evict-then-rehydrate; reuse the `usePreMountDestination` cancel-handle idiom). |

Inherited edge cases from `DEFER_IDEA.md` §1 apply: HybridApp hits `HIDDEN` before nav ready (chain
through `isNavigationReady()`), suppress hydration on `'error_boundary'`, StrictMode double-run
(idempotent loader). Drain with the `GlobalModals` pattern (`requestIdleCallback` + `{timeout: 2000}` +
`startTransition`). `SPAN_ONYX_DERIVED_COMPUTE` already parents to `SPAN_APP_STARTUP`, so deferring
derived-dependency subscriptions is observable in Sentry from day one.

## 4a. Consolidated mobile-first plan

Goal: lazy Onyx + defer keys not needed before bootsplash removal, so the app can open any screen fast.

```
0. Library: chunked parse + hydrate-without-copy (immediately) → lazy init
   (key index + eager set + subscription-triggered hydration, per-collection hydration state)
1. Eager boot set: small keys (session, locale, NVPs) — explicitly defined
2. Big collections: SQLite indexes (idle build) + consumer migration to member-keys/query
   2b. reportActions: shard the blob into pages (separate project; unblocks both indexing and lazy)
3. Module connects, three buckets: DELETE deprecated duplicates → REWRITE to on-demand reads
   (ReportUtils purity migration — prerequisite, not optional) → DEFER the rest (deferUntilAppReady)
4. Derived values — their own lane, not coverable by defer: persist outputs
   (RAM_ONLY_SORTED_REPORT_ACTIONS → disk-backed kills the every-cold-start recompute) →
   write-driven maintenance; or consciously keep eager (smaller RAM win, TTI still wins via 0)
5. Loading semantics on screens (loading ≠ empty; useOnyx FetchStatus)
6. Enforcement ratchet (type/lint-seatbelt on bare collection subscriptions) — in the FIRST PR
```

Regranulation (2b + the PERSONAL_DETAILS_LIST split) is de facto a **protocol change**, because the
backend writes Onyx keys directly — key granularity is part of the client-server contract. Two
execution variants: **client-only** (an ingest normalizer at `OnyxUpdates.ts:117` re-splits incoming
blobs into member keys on every write, forever while the server sends the old format) and **backend**
(server emits `personalDetails_<accountID>` / reportActions page keys natively — cleaner, and for
reportActions the server already thinks in pages via GetOlder/GetNewerActions + `REPORT_ACTIONS_PAGES`).
The client normalizer doesn't fully disappear even with backend buy-in: (1) old-client tail — the
backend must dual-emit gated by app version (HTTPS responses can be version-gated; already standard),
(2) **Pusher is a broadcast** — one payload for all of an account's devices, so it can't be easily
version-gated → either dual-format payloads or the client normalizer stays as a compatibility layer
through the transition; (3) the one-time local migration of data already on devices is always
client-side. Practical sequencing: client normalizer first (decouples from the backend timeline and is
needed for Pusher/local migration anyway), backend emission as the follow-up that removes the
transform from the hot write path — and a perfect first use case for the §3c schema-as-negotiation
artifact.

Stock vs flow: a DB migration solves the **stock** (data at rest — the blob re-split can even run in
pure SQL via `json_each`, one row per member; execute lazy per-key on first read or in idle, never as
a big-bang boot rewrite) but not the **flow** — the server keeps sending old-format blobs in every
response/Pusher update, which would rewrite the old key right back post-migration. So migration and
ingest normalizer coexist until the backend emits the new format; the transform is **one piece of
code invoked in two places** (over existing rows + at the ingest boundary), preventing drift between
them. Order matters: normalizer first, then migration (the reverse opens a race where old-format
writes touch already-migrated reports), and the transform must be idempotent over mixed state
(blob + pages for the same report will transiently coexist).

Dependency logic: 0 without 3-4 gives no RAM win (everything rehydrates right back); 3-4 without 0
give no parse/TTI win (init still loads the whole DB) — the two tracks must run in parallel, while 2
ships incrementally per collection. Common traps this plan guards against: deferring
`initOnyxDerivedValues` naively (LHN renders from derived data — it cannot just be deferred), and
deferring module connects that feed synchronous module maps (creates silent-`undefined` windows for
fast-tapping users — hence rewrite-before-defer).

## 5. Sustainability — keeping the pattern from eroding

The repo's own history proves convention-based patterns erode here: deprecated module caches still
coexist with the derived keys built to replace them (#66391 et al.), `evictableKeys` is defeated by
newer subscriptions, SNAPSHOT was partially walked back. Any lazy-Onyx work shipped without enforcement
will regress the same way.

**How mature systems solve it**: the expensive thing is impossible or explicit in the API, never merely
discouraged. Query-driven sync engines (Replicache/Zero, Linear, Figma LiveGraph) make the client
declare queries and let the server compute/ship only satisfying data — a new heavy collection *cannot*
regress startup because nothing syncs without a query. Local DBs (WatermelonDB, Realm, RxDB,
PowerSync) are lazy by construction (observation is per-query) and gate schema changes behind versioned
migrations that CI enforces. Onyx is the inverse: subscribing to a whole collection is the *easiest*
line of code to write. Long-term the contract should live in the protocol (scoped reconnect,
server-side indexes — focus mode is the prototype); near-term the defense is client-side.

**Enforcement toolbox for this repo, most durable first (must land WITH Tier 0, not after):**

1. **Type-level**: make collection-root keys a distinct TS type that `useOnyx`/`connect` reject unless
   passed through an explicit, greppable `subscribeToWholeCollection()` wrapper. Survives new
   collections automatically — new keys in `ONYXKEYS.ts` get the type by construction.
2. **Lint ratchet**: an ESLint rule banning bare collection subscriptions, with the ~480 existing sites
   grandfathered via the already-used `eslint-seatbelt` — the count can only go down. Upgrades the
   existing convention (justification comment + @frontend-performance approval for
   `connectWithoutView`) into mechanics.
3. **Schema registry as chokepoint**: per-collection metadata in `ONYXKEYS.ts` (cardinality class:
   bounded / per-report / unbounded; eager/lazy; projection availability) + CODEOWNERS on `ONYXKEYS.ts`
   and `setup/index.ts`. A new heavy collection must declare itself in a reviewable place
   (`SNAPSHOT_ONYX_KEYS` is the form precedent).
4. **CI budget**: a "hydrated bytes / cache key count at TTI" metric with a budget in the existing e2e
   perf infra — root-level subscription regressions fail the PR, not a Sentry dashboard a month later.
5. **Per-release telemetry**: Onyx cache-size metric (Tier 0) + a span per collection hydration —
   catches account-size-dependent regressions the synthetic e2e account can't.
6. **Dev-time assertion**: the `src/hooks/useOnyx.ts` wrapper logs/throws in dev on an undeclared
   whole-collection subscription — the cheapest feedback loop while writing code.

## 6. Honest assessment

- Tier 0-1 + the two library quick wins are tractable, incremental, and mostly formalize things the
  codebase already does (`loadPostSplashScreenModules`, `open*Page`, SNAPSHOT redirect, focus mode).
  This alone should meaningfully cut the JS-thread parse block, peak RAM, and per-write CPU.
- True lazy hydration + per-route eviction (Tier 2-3) is a multi-quarter, two-repo project that must
  first win a policy argument (`PAGINATION.md:114`), solve the tri-state delta problem, and solve
  optimistic-writes-into-scopes generically. The app's two prior attempts at scoped data — focus mode and
  SNAPSHOT — both work but were both partially walked back (`SearchResultsProvider.tsx:48-70` is the
  strongest evidence of what to expect).
- Measure first: no memory telemetry exists today; add Onyx cache-size metrics + read the existing
  `__moduleInitTimes` Sentry data before committing to any tier.
