# IR — Notify customers on Home when added to the email suppression list · Status: complete

Implements the Home-page notice + "Email issue" RHP for suppressed emails, plus the `User_UnblockEmail` command and `requestEmailUnblock()` action. All product code typechecks, passes the React Compiler compliance check, and is spell-clean. Remaining red in local checks is pre-existing branch breakage and the downstream locale-generation step (both detailed under Risk & verification).

## Requirements

| Req | Status | Where | Notes |
| --- | --- | --- | --- |
| R1 | done | [useTimeSensitiveItems.tsx:70](src/pages/home/TimeSensitiveSection/useTimeSensitiveItems.tsx#L70) | Row gated on `account.hasEmailDeliveryFailure` via a selector. |
| R2 | done | [useTimeSensitiveItems.tsx](src/pages/home/TimeSensitiveSection/useTimeSensitiveItems.tsx) | Pushed into the Time-sensitive item list at priority 3. |
| R3 | done | [FixEmailDelivery.tsx](src/pages/home/TimeSensitiveSection/items/FixEmailDelivery.tsx) | `BaseWidgetItem`, `DANGER` "Fix", title/subtitle from en.ts, `onCtaPress` → `ROUTES.SETTINGS_EMAIL_ISSUE`. |
| R4 | done | [EmailIssue/index.tsx](src/pages/settings/EmailIssue/index.tsx) | New single-screen RHP, header "Email issue". |
| R5 | done | [EmailIssue/index.tsx](src/pages/settings/EmailIssue/index.tsx), [en.ts](src/languages/en.ts) | Intro + two numbered steps, email bolded via `RenderHTML`, "these directions" → `CONST.SET_NOTIFICATION_LINK`. |
| R6 | done | [EmailIssue/index.tsx](src/pages/settings/EmailIssue/index.tsx) | Footer: plain "Get help from Concierge" (`navigateToConciergeChat`) + success "I've completed the above steps" (`requestEmailUnblock`, `isLoading={isUnblockingEmail}`). |
| R7 | done | [EmailIssue/index.tsx](src/pages/settings/EmailIssue/index.tsx) | Completion detected on the `isUnblockingEmail` true→false edge; success vs failure decided by re-reading `hasEmailDeliveryFailure`. |
| R8 | done | [EmailIssue/index.tsx](src/pages/settings/EmailIssue/index.tsx) | Flag-watcher effect: `hasEmailDeliveryFailure === false` → `Navigation.goBack()`. |
| R9 | done | [EmailIssue/index.tsx](src/pages/settings/EmailIssue/index.tsx) | On the completion edge with flag still true → `ConfirmModal` (Try again / Dismiss); Try again re-calls `requestEmailUnblock`. |
| R10 | done | [User.ts](src/libs/actions/User.ts), [Account.ts:87](src/types/onyx/Account.ts#L87), [API/types.ts](src/libs/API/types.ts), [UserUnblockEmailParams.ts](src/libs/API/parameters/UserUnblockEmailParams.ts) | `User_UnblockEmail` write command + `requestEmailUnblock()`; optimistic `isUnblockingEmail=true` + clears `errors`; success/failure reset to false. `isUnblockingEmail?: boolean` added to Account. |
| R11 | done | [EmailIssue/index.tsx](src/pages/settings/EmailIssue/index.tsx) | Same flag-watcher redirects a stale deep link (flag already false) back to Home. |

## Decisions

- **Completion signal = `isUnblockingEmail` falling edge** (D1). Used `usePrevious` to detect true→false, then read `hasEmailDeliveryFailure`. Rejected awaiting the API call because `API.write` is fire-and-forget. This one edge covers success, network/5xx, and 200-still-failed.
- **Success dismiss (R8) and deep-link redirect (R11) are one effect** (D3) watching `hasEmailDeliveryFailure`. The failure modal is a separate effect keyed on the completion edge, so on real success only the redirect fires (modal guard sees the flag already false).
- **`failureData` does not write `account.errors`** (D4). Deliberate divergence from the `resetSMSDeliveryFailureStatus` template (which writes `common.genericErrorMessage`). The `ConfirmModal` is the single failure surface, so a stray `account.errors` entry that other components read is avoided.
- **RHP lives in the Settings modal stack** (D5): screen `Settings_Email_Issue`, path `settings/email-issue`, registered in ROUTES/SCREENS/linkingConfig(`RIGHT_MODAL.SETTINGS`)/ModalStackNavigators + `SettingsNavigatorParamList`. No pre-existing account sub-stack was a better fit.
- **`User_UnblockEmail` sent with no params** (D6): `Record<string, never>`, `API.write(..., {}, ...)`. Backend derives the email from the session.
- **Row placement: priority 3**, immediately after the two billing rows; renumbered the priority comments 4–17 to stay consistent (A2).
- **Action placed in `User.ts`** (command is `User_*`), modelled structurally on `resetSMSDeliveryFailureStatus` but living next to `updateNewsletterSubscription`.
- **Icon: `Mail`** for the Home row.

## Silent assumptions

- The `Mail` Expensify icon name is valid (verified present in the icons chunk). Impact if wrong: Home row icon fails to load.
- Same-tick Onyx batching: on real success, backend `hasEmailDeliveryFailure=false` and `successData isUnblockingEmail=false` land together, so the failure-modal effect never flashes. If they arrive in separate ticks with `isUnblockingEmail` clearing first, the modal could flash for one render before the redirect fires. The `if (!hasEmailDeliveryFailure) return` guard makes this a cosmetic flash at worst, not a wrong terminal state.
- `navigateToConciergeChat` is called with `shouldDismissModal: false`, leaving the RHP open behind the Concierge navigation (matches R6, which lists it as a secondary action, not a dismiss).

## Deviations

- **A3 partial**: the PRD named `FixFailedBilling.tsx` as the RHP template, but it is a Home *row* (renders `BaseWidgetItem`), not an RHP. Used it as the template for the new row only; built the RHP from the `DisablePage.tsx` shape (ScreenWrapper + HeaderWithBackButton + ScrollView + FixedFooter with a loading success button + redirect-if-flag-false effect). No behavior change vs the PRD intent.
- **A4 confirmed, not a deviation**: only `en.ts` was edited. The other 10 locale files are regenerated by the `generateTranslations` CI workflow (ChatGPT-based, runs on the PR); es.ts's own header documents this.
- **"Secondary" button**: there is no `SECONDARY` button variant in this repo, so "Get help from Concierge" is a plain `<Button>` with no `variant` (default gray), per the codebase idiom.

## Risk & verification

- **Risk**: blast radius is small and additive — one new Home row (gated behind a flag most users never have set), one new RHP route, one new no-param command. The only shared-surface change is adding `isUnblockingEmail` to the `Account` Onyx type (optional field, no existing reader).
- **Checks**:
  - Typecheck (product code): clean for every file in this diff.
  - React Compiler compliance (`check-changed`): passed, 14/14 changed files, both Babel and OXC.
  - Spell (`spell-changed`): clean for all code; the only hits are `grgia`/`Jmills` inside the scratch PRD doc (not committed code).
  - ESLint (`lint-changed`): the sole reported error, `User.ts:567` "Unsafe assignment of an error typed value", is in `requestValidateCodeAction` (untouched; my edits are at lines 309–347 and 1993). It is a cascade from the pre-existing broken `ADD_DELEGATE`/`UPDATE_DELEGATE` references in `ResendValidateCodeParams.ts` (those CONST members do not exist on this branch), surfaced only because my edit made `User.ts` eligible for `lint-changed`.
  - **Pre-existing branch breakage (not from this diff, blocks a fully-green local run)**: typecheck failures in `ResendValidateCodeParams.ts` / `ConfirmDelegateValidateCodePage.tsx` / `UpdateDelegateValidateCodePage.tsx` (`ADD_DELEGATE`/`UPDATE_DELEGATE` missing from CONST), `VictoryChartCartesian/Polar.tsx` (`canvasProps`), and `tests/unit/ExportOnyxStateIOTest.ts` (`exportState`). None are in this diff.
  - **Locale generation (expected)**: typecheck reports `emailDeliveryFailure` (and the new `emailIssuePage` keys) missing from the 10 generated locale files. Resolved by the `generateTranslations` CI workflow; locales are not hand-edited.
- **Untested**: no runtime/UI exercise was performed (no simulator/browser run). The success/failure/redirect flows are reasoned from the Onyx update shapes, not observed. The backend `User_UnblockEmail` param contract (D6) was not verified against the live API — this is the one hard-failure risk if the backend expects a login/email param.

## Follow-ups

- Verify the `User_UnblockEmail` request/response against the live API (or a network trace) before merge, per D6.
- Exercise the three terminal states (success dismiss, network-failure modal, 200-still-failed modal) and the deep-link redirect in a browser/simulator.
- The pre-existing DELEGATE CONST breakage and the victory-chart/ExportOnyxState typecheck failures likely need a `merge-main` or a separate fix; they will block CI independently of this feature.
