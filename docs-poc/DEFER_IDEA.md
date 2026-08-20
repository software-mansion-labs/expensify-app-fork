# `deferUntilAppReady` — research findings

> Companion doc: `LAZY_ONYX_IDEA.md` — lazy Onyx hydration / per-route keys research, including how the
> two ideas compose (deferring *subscription establishment* is the bridge between them).

Research into consolidating deferred background work behind a single `deferUntilAppReady(cb, priority)` utility
(high/medium/low queues drained once the app becomes interactive), and into what heavy startup work could be
migrated under it.

## TL;DR

- The utility itself is **small work (~1-2 days incl. tests)** — the "app ready" signal already exists and is
  already used for exactly this purpose (`loadPostSplashScreenModules`).
- There is **no existing startup task queue to migrate away from** — the utility would formalize what today is
  scattered across hand-rolled `splashScreenState === HIDDEN` gates.
- The big caveat: **most of our heavy startup work happens at module import time (bundle eval)**. A callback
  queue cannot defer import-time cost — those need dynamic `import()` / lazy getters. The utility's job is to
  schedule *when* those dynamic imports fire.
- Measurement already ships: `src/setup/moduleInitPolyfill.ts` times every Metro module factory into
  `global.__moduleInitTimes`; top 50 go to Sentry via `src/setup/telemetry/reportModuleInitTimes.ts`.
  **Read that data before optimizing anything.**

## 1. The "app ready" signal already exists

The canonical "startup done" moment is the splash screen being hidden:

- `src/SplashScreenStateContext.tsx:44-50` — a working prototype of the utility: an effect on
  `splashScreenState === CONST.BOOT_SPLASH_STATE.HIDDEN` calls `loadPostSplashScreenModules()`, which
  dynamically imports 3 modules (`replaceOptimisticReportWithActualReport`, `registerPaginationConfig`,
  `UnreadIndicatorUpdater`). This is the natural hook point for `markAppReady('splash_hidden')`.
- The same instant is `src/Expensify.tsx:205-211` (`onSplashHide`), where the Sentry span `SPAN_APP_STARTUP`
  ends — the repo already declares startup over here. `HIDDEN` lands ~250-450 ms after `shouldHideSplash`
  flips (after the fade animation), so deferred work does not compete with the fade for frames.
- For non-React (module-level .ts) work there is a second, imperative signal:
  `Navigation.isNavigationReady()` (module-level promise, `src/libs/Navigation/Navigation.ts:741`) — resolves
  ~250-450 ms *before* the splash is gone.

State machine: `VISIBLE → READY_TO_BE_HIDDEN → HIDDEN` (`CONST.BOOT_SPLASH_STATE`, `src/CONST/index.ts:8090`),
with a 4th `undefined` initial state on HybridApp. Gating logic in `src/Expensify.tsx:140-144`:
`shouldInit = isNavigationReady && hasAttemptedToOpenPublicRoom && !!preferredLocale`.

### Edge cases `markAppReady` must handle

- **HybridApp logged-out path**: `src/HybridAppHandler.tsx:57` sets `HIDDEN` *before* navigation is ready.
  For "interactive" (not just "splash gone") semantics, additionally `await Navigation.isNavigationReady()`.
- **Crash path**: `src/components/ErrorBoundary/BaseErrorBoundary.tsx:27` also sets `HIDDEN` — the utility
  would fire in a crashed app; pass a distinguishable reason (`'error_boundary'`) or suppress.
- **Fallback timeout must be ≥ 10 s** — `Linking.getInitialURL()` is raced against
  `GET_INITIAL_URL_TIMEOUT = 10000` (`src/DeepLinkHandler.tsx:73-78`), and the stuck-splash watchdog
  (`src/libs/telemetry/bootsplashTelemetry.ts:35-54`) already polls at a 10 s cadence. A 5 s fallback (as in
  the reference implementation) would routinely beat the real signal on slow HybridApp boots.
- **Sign-in page also reaches `HIDDEN`** — work requiring a session must additionally gate on
  `IS_LOADING_APP === false` / `HAS_LOADED_APP`, not on app-ready alone. (`IS_LOADING_APP` is unbounded —
  30 s+ on large accounts — and has a documented stranded-value bug, `src/hooks/useIsLoadingAppRecovery.ts`.)
- **StrictMode** (`src/App.tsx:73`) runs the effect twice — `markAppReady` must be idempotent.

### Cold-start ordering (ground truth)

```
setup/telemetry           SPAN_APP_STARTUP starts (native: back-dated to process start)
Onyx.init                 src/setup/index.ts:39
Expensify mounts          renders null until isOnyxMigrated
  ├ migrateOnyx()
  ├ DeepLinkHandler       getInitialURL() raced vs 10s timeout → hasAttemptedToOpenPublicRoom
  └ preferredLocale loaded
NavigationRoot mounts
  └ onReady → Navigation.setIsNavigationReady()          ← signal A (nav ready)
shouldInit = true → GlobalModals mounts                   ← signal B
shouldHideSplash → BootSplash.hide() + 200-250ms fade
onSplashHide → state = HIDDEN; SPAN_APP_STARTUP ends      ← signal C ★ (markAppReady here)
(authenticated) AuthScreensInitHandler → openApp/reconnectApp → IS_LOADING_APP=false  ← signal D
SidebarLinks onFirstItemRendered → setSidebarLoaded()     ← signal E (Inbox-only content TTI)
```

## 2. Existing deferral mechanisms — 11 competing patterns

| # | Pattern | Readiness signal | Sites | Safety cap |
|---|---|---|---|---|
| 1 | `TransitionTracker.runAfterTransitions` | refcounted nav/modal/keyboard transitions | ~100 | 1 s/transition |
| 2 | `requestIdleCallback` (+ `src/polyfills/requestIdleCallback.ts`) | JS-thread idle | 6 | opt-in `{timeout}` |
| 3 | `Scheduler.scheduleWhenIdle` (React IdlePriority) | React scheduler | 1 | 300 ms |
| 4 | `requestAnimationFrame` as deferral (single/double/polling) | next frame(s) | ~90 | none |
| 5 | `queueMicrotask` | end of tick | 9 | none |
| 6 | `setNavigationActionToMicrotaskQueue` (microtask + rAF) | Onyx flushed + a frame | ~13 | none |
| 7 | `splashScreenState === HIDDEN` render gates | composite boot gate | 5 | 10 s watchdog |
| 8 | `Navigation.isNavigationReady()` promise | NavigationContainer onReady | ~13 await + ~12 sync bail | none |
| 9 | `deferredLayoutWrite` / `writeWhenReady` | content onLayout / barrier | ~10 | 5 s + AppState flush |
| 10 | React concurrent (`useDeferredValue(true,false)`, `startTransition`, `lazy`) | render priority | ~10 + 17 lazy | none |
| 11 | Bare `setTimeout` (400 ms Safari, `…,0`) | wall clock | 3 | n/a |

Key observations:

- **TransitionTracker is the wrong backbone for startup** — per
  `contributingGuides/INTERACTION_MANAGER.md`, with no active transition its callback fires synchronously in
  the same tick. It is a transition gate, not a boot gate.
- **`src/GlobalModals.tsx:31-42` is the reference implementation** worth generalizing:
  `requestIdleCallback` + `{timeout: 2000}` forced-run cap + `startTransition` + a registered eager-mount
  escape hatch (`registerEnsureContextMenuMounted`) for when the user interacts before idle.
- Most of the 11 patterns should **not** be consolidated — they have different semantics
  (`src/hooks/useRunAfterTransitions.ts:7-9` documents why it deliberately avoids `startTransition`).
- Platform divergence for identical work: `src/setup/telemetry/index.web.ts` uses `requestIdleCallback`,
  `index.native.ts` uses `requestAnimationFrame`.
- Only `Scheduler.scheduleWhenIdle` supports priority, and it has a single consumer
  (`src/hooks/usePreMountDestination/index.ts:127`).
- Grep for `untilAppReady|afterAppReady|whenAppReady|bootComplete|afterStartup|postStartup` returns zero hits —
  no incumbent utility.

## 3. Heavy startup work — deferral candidates (effort:reward order)

1. **Break the `Text.tsx → EmojiUtils → assets/emojis` edge** (best ratio in the codebase).
   `src/components/Text.tsx:3` and `src/components/MenuItem.tsx:11` import two trivial regex helpers
   (`containsCustomEmoji`/`containsOnlyCustomEmoji`) from `@libs/EmojiUtils`, and `src/libs/EmojiUtils.tsx:1`
   value-imports `@assets/emojis` → 217 KB of data (`assets/emojis/common.ts`, 1915 emojis) + a 3-lookup-table
   build (~7k property writes, `assets/emojis/index.ts:15-36`) + 9 eager SVG imports, all during bundle eval,
   because `Text` is imported everywhere. Fix: extract the 2 helpers into a leaf module. Needs no queue at all.
2. **Read `__moduleInitTimes` Sentry data first** to validate/reprioritize — instrumentation already ships.
3. `src/libs/ValidationUtils.ts:573` — top-level `new RegExp` over the full IANA TLD alternation
   (~1500 entries); sole consumer is email validation. Make it a lazy memoized getter.
4. Peggy parsers (265 KB): `src/libs/SearchParser/searchParser.js` (137 KB) is on the cold-start path via
   `getDefaultDeeplinkSearchQuery.ts` — lazy-`require` it only when the deep link is actually a search URL.
   `autocompleteParser.js` (129 KB) is only reached from search UI — easy defer.
5. `src/NAICS.ts:12161` — top-level `buildNAICS()` over a 531 KB tree; one consumer deep in US bank onboarding
   (`IndustryCodeSelector.tsx`). Lazy getter. (Likely not on cold-start path today — confirm via
   `__moduleInitTimes`.)
6. `src/libs/Navigation/linkingConfig/config.ts:2369` — hundreds of per-route `new RegExp` compiles at import
   (`createNormalizedConfigs` → `createConfigItem`), most never used. Make the regex lazy per config item.
   Also `compileDynamicRoutePattern.ts:88-95`.
7. True `deferUntilAppReady` candidates (work that must run, just later):
   - `cacheSoundAssets()` — `src/libs/Sound/index.ts:95`, fetches every sound mp3 at import (web).
   - `KeyboardShortcut` — `src/libs/KeyboardShortcut/index.ts:86-97`, one native `KeyCommand.addListener`
     bridge call per shortcut at import.
   - `src/setup/fraudProtection.ts:3` (`FraudProtection.init()`), `src/libs/Parser.ts:74-76`
     (ExpensiMark ctor builds ~40 regex rules).
8. **207 module-level `Onyx.connect` across `src/` (79 in `libs/actions/`)** — highest-leverage *category*.
   Pattern already exists: move whole modules into `loadPostSplashScreenModules()` (3 already are).
   Candidates: `TransactionInlineEdit.ts` (7 connects), `SignInRedirect.ts` (4, post-auth only),
   `src/libs/actions/Welcome/*`. Watch out for `src/libs/Parser.ts:10-42`, which rebuilds
   `reportIDToNameMap`/`accountIDToNameMap` from the entire REPORT collection on every change during hydration.
   Density leaders: `ReportUtils.ts` (17), `actions/IOU/index.ts` (13), `actions/App.ts` (9).

### Already lazy — do not re-solve

- All 11 translation files (~9 MB source) — dynamic `import()` in `src/languages/IntlStore.ts`.
- Localized emoji names (`assets/emojis/en.ts`/`es.ts`, 366 KB) — `importEmojiLocale()`.
- Emoji trie — `src/libs/EmojiTrie.ts`, lazy per-locale build + in-function `require()`.
- Icons/illustrations chunks, all modal/RHP screens (`ModalStackNavigators` `require()` thunks),
  tab navigators/HomePage/Settings splits (`React.lazy`), GlobalModals, charts, xlsx, MapView web.
- 82 dynamic `import()` sites total in `src/`.

Non-findings: `src/styles/index.ts` (213 KB) exports a theme *function* — cost is paid on first render, not
import. Large type-only files (`API/types.ts`, `Navigation/types.ts`) are erased at runtime. `TIMEZONES.ts`
is only 16 KB — not worth deferring. `Onyx.init` in `src/setup/index.ts:38-89` is intentionally outside the
React lifecycle (Android headless JS push wake-up) — do not defer.

## 4. Implementation sketch

- Module with 3 priority queues + `markAppReady(reason)`; reasons for us:
  `'splash_hidden' | 'error_boundary' | 'fallback_timeout'`.
- Signal wiring: effect in `SplashScreenStateContext` on `HIDDEN`, chained through
  `Navigation.isNavigationReady()` for true interactivity; idempotent (StrictMode).
- Fallback timer ~10 s (reuse/respect `GET_INITIAL_URL_TIMEOUT`).
- Drain via `requestIdleCallback(cb, {timeout: 2000})` + `startTransition` (the `GlobalModals` pattern) so
  subscribers don't block the frame right after the splash fade; polyfill already exists.
- Emit Sentry breadcrumbs like the splash state transitions do (`addBootsplashBreadcrumb`).
- The utility lands in the same instant `SPAN_APP_STARTUP` ends, so the startup metric is unaffected and
  observable in Sentry from day one.
