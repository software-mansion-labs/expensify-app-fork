# PRD — Notify customers on Home when added to the email suppression list

**Issue:** [#97335](https://github.com/Expensify/App/issues/97335)

**Tags:** 📌 from issue · 💭 assumption · ❓ unclear · ✅ decision

---

## Goal

📌 Surface a notification on the New Expensify Home page when the signed-in user's email is on the suppression list, so they know delivery is failing and can remove themselves.

> "When a user's email is added to the email suppression list (e.g. after a bounce), there is currently **no indication in New Expensify** that this has happened... Surface a notification on the New Expensify Home page when the signed-in user's email is on the suppression list, letting them know their email address has been suppressed and giving them a way to remove themselves."

> Image 1 (final Home mock): the "Time sensitive" section shows an "Account" row titled "We can't send you email notifications" with a red "Fix" button.

## Requirements

- **R1** 📌 — Show the notification only when the signed-in user's email is on the suppression list, driven by the `account.hasEmailDeliveryFailure` boolean.

  > Comment by @grgia: "`account.hasEmailDeliveryFailure` (boolean, already in the `Account` Onyx type). Set on sign-in via `BeginSignIn` and refreshed on every OpenApp and ReconnectApp."

- **R2** 📌 — Track the notification in the `Time sensitive` tile on the Home page.

  > "This should be tracked in the `Time Sensitive` tile on the Home page."

- **R3** 📌 — The Home row is a danger "Fix" CTA with title "We can't send you email notifications" and subtitle "Account".

  > Comment by @grgia: "danger \"Fix\" button, title \"We can't send you email notifications\", subtitle \"Account\", `onCtaPress` navigates to the new RHP route."
  > Comment by @JmillsExpensify: "we could even be more direct: \"We can't send you email notifications\"."

- **R4** 📌 — The "Fix" button opens an RHP titled "Email issue" containing the fix instructions.

  > Comment by @grgia: "a Fix button that opens an RHP of instructions"
  > Image 2 (final RHP mock): header "Email issue".

- **R5** 📌 — RHP body copy, current user's email bolded, as two numbered steps, with "these directions" linking out.

  > Comment by @JmillsExpensify: "Our email provider paused sending to **todd@boulderdev.com** due to delivery issues. To fix this issue: **Confirm your email address** Make sure **todd@boulderdev.com** is spelled correctly and is a real inbox. Aliases like \"expenses@domain.com\" need their own working inbox to log into Expensify. **Allowlist expensify.com** Add **expensify.com** to your email client's allowlist. You may need IT to adjust server settings via [these directions](hyperlink)."
  > Image 2 (final RHP mock): numbered "1. Confirm your email address" and "2. Allowlist expensify.com".

- **R6** 📌 — RHP has two footer buttons: secondary "Get help from Concierge" (opens Concierge) and success "I've completed the above steps" (triggers the unblock request, shows loading while in flight).

  > Comment by @grgia: "secondary \"Get help from Concierge\" (`navigateToConciergeChat`), success \"I've completed the above steps\" (`requestEmailUnblock()`, shows loading while `isUnblockingEmail`)."
  > Image 2 (final RHP mock): "Get help from Concierge" and green "I've completed the above steps".

- **R7** 📌 — The unblock request has exactly two outcome states; the UI decides by re-reading `hasEmailDeliveryFailure` after the request finishes (failure returns 200, so `failureData` fires only on network/5xx).

  > Comment by @grgia: "success just hides the notice, and every failure shows one generic \"please try again\" message, so the mocks only need those two states."
  > Comment by @grgia: "Because failure is still a 200, `failureData` only fires for network/5xx errors. The UI decides success vs failure by reading `hasEmailDeliveryFailure` after the request finishes."

- **R8** 📌 — On success (`hasEmailDeliveryFailure === false`), dismiss the RHP; the Home row disappears on its own.

  > Comment by @grgia: "`hasEmailDeliveryFailure === false`: dismiss the RHP. The Home row disappears on its own."

- **R9** 📌 — On failure (flag still true), show a ConfirmModal "Something went wrong. Please try again" with "Try again" (re-calls unblock) and "Dismiss", keeping the instructions on screen behind it.

  > Comment by @grgia: "still `true`: show a `ConfirmModal` (\"Something went wrong. Please try again\" / Try again / Dismiss). Try again calls `requestEmailUnblock()` again."
  > Image 3 (error mock): modal "Something went wrong. Please try again" / "Looks like something didn't work. Please try again. If the issue persists, please reach out to Concierge." with "Try again" and "Dismiss".

- **R10** 📌 — Add the `User_UnblockEmail` write command (no params) and a `requestEmailUnblock()` action modelled on `resetSMSDeliveryFailureStatus`; optimistic sets `account.isUnblockingEmail = true` and clears `account.errors`, success/failure reset it to false.

  > Comment by @grgia: "`requestEmailUnblock()`, an `API.write` modelled on `resetSMSDeliveryFailureStatus`... optimistic: `account.isUnblockingEmail = true`, clear `account.errors`... Add `isUnblockingEmail?: boolean` to `src/types/onyx/Account.ts`."

- **R11** 📌 — If the user lands on the RHP while the flag is already false (deep link, stale tab), redirect back to Home.

  > Comment by @grgia: "If someone lands on the page while the flag is already false (deep link, stale tab), redirect back to Home."

## Out of Scope

- **O1** 📌 — No specific/provider error codes in the UI; every backend failure is the same generic retryable message.

  > Comment by @grgia: "There are no specific error codes to design around, so the mocks need success plus one generic try-again error."

- **O2** 📌 — Full-page error variant (superseded by the ConfirmModal).

  > Comment by @grgia decision: "Two error mocks exist (modal vs full-page). Use the modal. It keeps the instructions on screen for a retry and needs no extra screen."

- **O3** 📌 — Backend work (`User_UnblockEmail` response + refreshing `hasEmailDeliveryFailure` on OpenApp/ReconnectApp with the two-week expiry rule). Already on production.

  > Comment by @grgia: "Both halves are on production via Web-Expensify#55436... Nothing backend is blocking this."

- **O4** 💭 — The bounce/blacklist message shown on the Classic sign-in page. Rationale: @grgia distinguishes it from the unblock response and says it "only appears when you request a sign-in email on the Classic sign-in page"; this feature is the Home-page notice, not that flow.

## Assumptions

- **A1** 💭 — "these directions" links to `CONST.SET_NOTIFICATION_LINK` and RHP bold/link rendering uses `RenderHTML`. Rationale: stated in @grgia's proposal ("\"these directions\" linking to `CONST.SET_NOTIFICATION_LINK`... `RenderHTML` handles the bold and link"). Impact if wrong: different link target or rendering approach.

- **A2** 💭 — The row is placed after the two existing billing rows in `useTimeSensitiveItems`. Rationale: @grgia's proposal ("push the row after the two billing rows (it's an RBR account row, so it belongs near the top)"). Impact if wrong: row ordering within the Time sensitive section changes.

- **A3** 💭 — New files follow the existing `BaseWidgetItem`/single-screen-RHP patterns (`FixFailedBilling.tsx` copy, new route + screen). Rationale: @grgia's proposal names these exact templates. Impact if wrong: structural refactor, but no behavior change.

- **A4** 💭 — Only `en.ts` needs manual translation strings; other locales are generated. Rationale: repo convention (translations en-only); @grgia's proposal mentions `es.ts` but generated locales are produced downstream. Impact if wrong: missing es copy at ship.

## Open Questions

_None._

## Decisions

- **D1** ✅ — Completion signal: the RHP watches `account.isUnblockingEmail` going `true → false`. On that falling edge, read `hasEmailDeliveryFailure`: `false` → success, still `true` → failure. This single edge covers success, network/5xx, and the 200-still-failed case (supersedes the vague "re-read after the request finishes" in R7/R8/R9).

- **D2** ✅ — Offline: disable the "I've completed the above steps" button while offline, using the existing offline-aware button pattern. The action is online-only and an indefinite spinner is not acceptable.

- **D3** ✅ — R8 (success dismiss) and R11 (deep-link redirect) are one `useEffect` watching `hasEmailDeliveryFailure`; when it is `false` while the RHP is mounted, leave. The failure `ConfirmModal` is layered separately and only fires on the D1 completion edge.

- **D4** ✅ — On failure, do NOT write to `account.errors`. The `ConfirmModal` (R9) is the only failure surface. This is a deliberate divergence from `resetSMSDeliveryFailureStatus`, whose `failureData` writes `common.genericErrorMessage` into `account.errors`. `requestEmailUnblock`'s `failureData` only resets `isUnblockingEmail = false`.

- **D5** ✅ — The RHP lives in the Settings modal stack: screen `Settings_Email_Issue`, path `settings/email-issue`. Register in `ROUTES.ts`, `SCREENS.ts`, `linkingConfig/config.ts` (under `RIGHT_MODAL.SETTINGS`), and `ModalStackNavigators/index.tsx`. Confirm no existing account sub-stack is a more natural fit before wiring.

- **D6** ✅ — `User_UnblockEmail` is modelled as no-params (session-derived), per @grgia's R10. Because the backend is already live (O3), verify against the live API definition / a network trace before shipping, since a wrong param shape 400s every request.

### Fact corrections from codebase exploration

- **F1** — `FixFailedBilling.tsx` is a Home *row* item (renders `BaseWidgetItem`), not an RHP. A3's "copy `FixFailedBilling.tsx`" applies only to the new Home row. The RHP screen has no drop-in template; build it from the [DisablePage.tsx](src/pages/settings/Security/TwoFactorAuth/DisablePage.tsx) shape (header + scrollable body + `FixedFooter` success button with `isLoading` + redirect-if-flag-false `useEffect`).
- **F2** — `useTimeSensitiveItems` returns rendered components pushed in priority order; the new row inserts at position 3, after the two billing rows (A2 ✓).
- **F3** — No `SECONDARY` button variant exists. "Get help from Concierge" is a plain `<Button>` with no `variant`.
- **F4** — `navigateToConciergeChat` requires `conciergeReportID`, `introSelected`, `currentUserAccountID`, `isSelfTourViewed` (all Onyx-sourced); the footer button must read these, not call it bare.
- **F5** — `isUnblockingEmail` does not exist yet; add it top-level to `src/types/onyx/Account.ts` (R10 ✓). `CONST.SET_NOTIFICATION_LINK` exists (A1 ✓).
