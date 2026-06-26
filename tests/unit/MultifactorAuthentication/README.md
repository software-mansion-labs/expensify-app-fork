# MFA modal flow tests

Multi-factor authentication is a **modal flow driven by an XState machine**. A
scenario (for example "authorize a transaction" or "reveal a PIN") launches the
modal, the modal prepares and shows an outcome, and the user can close it, after
which it tears down. The machine in
`src/components/MultifactorAuthentication/machine/` is the single source of truth
for that flow. These tests prove the machine drives the flow correctly and that
every layer reading the machine agrees with it.

## The flow today

```
Top level (the modal lifecycle):

   closed ──INIT──▶ open ──CLOSE_MODAL──▶ closing ──MODAL_CLOSED──▶ closed
     ▲                                      │
     └─────────────── after(closeFallback) ─┘   (timer fallback if MODAL_CLOSED never arrives)

Inside `open` (the screen the user sees):

   preparing ──(always)──▶ outcome ──(initial)──▶ success
   (transient router)                             [entry: navigate to the success screen]
```

`closed` wipes the flow context on entry, so no flow data outlives the modal.
Only the lifecycle skeleton plus the success outcome exist so far. Later slices
add screens (prompt, magic code, revoke, failure outcome, per-scenario work) as
children of `open`.

## What we guarantee (and where each guarantee lives)

The tests answer two questions. The folders match those two questions.

### `modalFlow/` - what the machine does

| File | Guarantee |
| --- | --- |
| `scenarioOpensModalTest.ts` | Starting a scenario opens the modal to its outcome (`INIT` -> `open.outcome.success`, context seeded, navigation fired). |
| `modalLifecycleTest.ts` | The modal walks its whole lifecycle: launch -> success -> closing -> closed. |
| `everyStateReachableTest.ts` | Every settleable modal state is reachable. Auto-derived from the chart, so new slices are covered with no edit here. |

### `viewMatchesMachine/` - every reader agrees with the machine

Three layers of increasing realism, all asserting the same thing: what you read
equals the machine's state.

| File | Layer |
| --- | --- |
| `consumerStateTest.ts` | The `snapshotToState` mapper non-React consumers read. |
| `reactBindingTest.tsx` | The `@xstate/react` binding the provider uses. |
| `realModalTest.tsx` | The real provider stack + modal navigator, driven through real gestures and asserted against the DOM. |

## The harness lives in `tests/utils/mfa/`

`tests/unit/**` collects every `.ts(x)` file as a test suite, so helpers cannot
live next to the specs. `tests/utils/<feature>/` is the repo's home for test
helpers. The MFA rig:

| File | Role |
| --- | --- |
| `flowFixtures.ts` | Builds a type-safe `INIT` from a real scenario config (no fake casts). |
| `machineUnderTest.ts` | The actor + machine builder; stubs only the actions that reach Navigation via `machine.provide()`, leaves context actions real. |
| `flowPaths.ts` | A `createTestModel`-style harness over `xstate/graph` path generators (see the gotcha below). |
| `reachableStates.ts` | Walks the chart for settleable leaf states, dropping transient `always` routers. Feeds `everyStateReachableTest`. |
| `realUi/renderModal.tsx` | Mounts the real provider stack + modal navigator and exposes the queryable markers. |
| `realUi/userGestures.ts` | One gesture (or system step) per machine event, used to drive the real UI. |
| `realUi/mocks.ts`, `realUi/jestMocks.ts` | The mock seam for inspector / biometrics / navigation / history. |

## Adding a new screen or slice

1. Add the state to the machine (a child of `open`).
2. `everyStateReachableTest` covers it automatically (it reads the chart).
3. Add the event's gesture to `realUi/userGestures.ts` (a missing one is a
   compile error there).
4. Add a behavioral spec under `modalFlow/` (machine behavior) and, if the
   screen is user-visible, assert it under `viewMatchesMachine/realModalTest.tsx`.

## Why no end-to-end test

This repo has no Detox/Maestro/Playwright/Appium. CI is Jest + jsdom (plus
Reassure perf), so the whole MFA pyramid stays in Jest; device checks are manual
via the `agent-device` skill. Note also that the real `@xstate/test`
`createTestModel` rejects machines with `after` transitions ("After events on
test machines are not supported"), and the machine's `closing` state has the
`closeFallback` after-timer. That is why `flowPaths.ts` builds a small harness
over the plain `getShortestPaths`/`getSimplePaths`/`getPathsFromEvents`
generators instead.
