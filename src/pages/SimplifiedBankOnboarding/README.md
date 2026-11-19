# Simplified bank onboarding (research module)

A small copy of the workspace bank account onboarding (`src/pages/ReimbursementAccount`). It keeps every pattern of the
real flow and cuts the number of variants: where the real flow has nine sub pages, this module has three. It talks to a
mock server that runs in the app, so no backend account is needed.

The module exists to try other architectures on something that is small enough to rewrite, but still shows the same
problems as the real flow. The weak patterns are reproduced on purpose. Known bugs of the real flow are not.

## How to open it

1. Run the web app (`npm run web`) and sign in with any account.
2. Open **Account settings**. The menu has a new item, **Bank onboarding lab** (`/settings/bank-onboarding-lab`).
3. The page lists five mock workspaces and the controls of the mock server. Pick a workspace to start its flow.

| Workspace | Currency | What it shows |
| --- | --- | --- |
| `usd` Acme US | USD | The USD flow, with Plaid or the manual setup |
| `eur` Acme Europe | EUR | The NonUSD flow |
| `aud` Acme Australia | AUD | The NonUSD flow with the second signer and the Docusign step |
| `jpy` Acme Japan | JPY | The unsupported-currency blocker |
| `guest` Acme Guest | USD | The not-authorized blocker (the user is not an admin) |

Values that the mock server expects:

- validate code of the user: `123456`
- test deposit amounts: `0.01`, `0.02`, `0.03` (three wrong tries block the account)
- rejected SSN: last four digits `0000`
- rejected tax ID: `000000000`

Buttons whose label starts with `[mock]` do not exist in the real flow. They stand in for something that happens outside
the app: the bank login in Plaid, the identity check in Onfido, the reviewer who approves the account, and the email that
the director receives.

### Controls of the mock server

| Control | Effect |
| --- | --- |
| Response time | 0, 600 or 2500 ms for every request |
| Fail requests | Never, the next write only, or every request |
| The user is validated | When off, the entry page sends the user to the verify-account page first |
| Ask for KYB documents | The USD flow gets the extra documents step after the agreements |
| Throttle the account | The entry page shows a blocking error |
| Force offline | The offline switch of the whole app. Writes wait in a queue, reads are dropped |
| Reset | Clears the server database and every client key of the lab |

The request log under the controls shows each command, its parameters and the answer of the server. A failed request shows
a generic error in the UI, like the real flow, and the specific reason only in the log.

## Module layout

Everything is under `src/pages/SimplifiedBankOnboarding/`. Paths in the table below that start with `R/` are relative to
`src/pages/ReimbursementAccount/`.

| Folder | Content |
| --- | --- |
| `landing/` | The lab page: workspace list and mock server panel |
| `entry/` | The page that opens a flow, the entry point, the connected view, the verify-account gate |
| `usd/` | The USD flow page and its steps |
| `nonUSD/` | The NonUSD flow page and its steps |
| `enterSignerInfo/` | The separate flow that a director opens from an email |
| `actions/` | Request and Onyx write functions (the stand-in for `src/libs/actions`) |
| `hooks/` | The three hooks that wait for requests or open the reset modal |
| `utils/` | Pure helpers: value lookup, resume position, draft prefill |
| `components/` | The few components that two flows share |
| `types/` | The form type and the Onyx types |
| `mockBackend/` | The server: database, command handlers, queue, UI panel |
| `SBO_CONST.ts` | Step names, page names, sub page names and positions, mock values |

The files outside the module only register it: Onyx keys, routes, screens, the navigator entries, one menu item, one
translation key and the Sentry labels.

## Pattern catalog

Each row names a pattern of the real flow, the real file that shows it best, and the place where this module reproduces it.

### Opening the flow and picking a screen

| Pattern | Real flow | This module |
| --- | --- | --- |
| Chain of early returns that picks the screen (offline without data, workspace loading, loading, not found or not authorized, throttled or unsupported currency, connected, pending redirect, entry point) | `R/ReimbursementAccountPage.tsx` | `entry/OnboardingEntryPage.tsx` |
| USD or NonUSD flow chosen by the workspace currency | `R/ReimbursementAccountPage.tsx` | `entry/OnboardingEntryPage.tsx`, `entry/OnboardingFlowEntryPoint.tsx` |
| One account key shared by every workspace, guarded by `achData.policyID === policyID` | `R/ReimbursementAccountPage.tsx` (`isPreviousPolicy`) | `entry/OnboardingEntryPage.tsx` (`isPreviousPolicy`) |
| State that mirrors derived values through effects (`hasACHDataBeenLoaded`, `shouldShowContinueSetupButton`, `shouldShowConnectedBankAccount`) | `R/ReimbursementAccountPage.tsx` | `entry/OnboardingEntryPage.tsx` |
| Refetch after reconnect, asking for the step that the client shows | `R/ReimbursementAccountPage.tsx` (`fetchData(true)`) | `entry/OnboardingEntryPage.tsx` (`syncWithAccountChanges`) |
| Cleanup of the shared keys on unmount | `R/ReimbursementAccountPage.tsx` | `entry/OnboardingEntryPage.tsx` |
| Redirect of a pending USD account straight to the validation step, with refs that guard the round trip | `R/ReimbursementAccountPage.tsx` | `entry/OnboardingEntryPage.tsx` |
| Fresh setup: Plaid or manual. Started setup: continue, change bank account, start over | `R/VerifiedBankAccountFlowEntryPoint.tsx` | `entry/OnboardingFlowEntryPoint.tsx` |
| Validation gate: the picked option is stored in Onyx, the user validates on another page, the entry point finishes the choice | `R/VerifiedBankAccountFlowEntryPoint.tsx`, `R/DynamicReimbursementAccountVerifyAccountPage.tsx` | `entry/OnboardingFlowEntryPoint.tsx`, `entry/VerifyAccountPage.tsx` |
| Reset modal requested through a flag on the account object | `src/hooks/useResetBankAccountModal.tsx` | `hooks/useResetOnboardingModal.tsx` |
| Change bank account: a second instance of the entry page marked by a route param | `src/hooks/useChangeBankAccount.ts` | `entry/navigateToChangeBankAccount.ts`, `actions/OnboardingAccount.ts` (`prepareNewBankAccountSetup`) |
| Connected account view | `R/ConnectedVerifiedBankAccount.tsx` | `entry/ConnectedBankAccount.tsx` |
| `backTo` passed through every route | `ROUTES.ts`, all flow pages | `ROUTES.ts`, all flow pages |

### Resume

| Pattern | Real flow | This module |
| --- | --- | --- |
| USD: the server keeps `currentStep`, a hand-written dictionary turns it into a page name | `R/ReimbursementAccountPage.tsx` (`stepToPageName`) | `entry/OnboardingEntryPage.tsx` (`STEP_TO_PAGE_NAME`) |
| NonUSD: the client works out the first unfinished page from the data | `R/NonUSD/utils/getStartPageForContinueSetup.ts` | `utils/getStartPageForContinueSetup.ts` |
| `draftStep`: a request names the step it saved, an effect copies the server values of that step into the draft | `R/ReimbursementAccountPage.tsx`, `src/libs/actions/BankAccounts.ts` | `entry/OnboardingEntryPage.tsx`, `utils/getDraftValuesForStep.ts`, `actions/USDBankAccount.ts` |
| Lossy prefill: the server returns a masked account number | `achData` of a resumed setup | `mockBackend/handlers/buildResponse.ts` (`maskAccountNumber`), `usd/BankInfo/subSteps/Manual.tsx` |
| The client writes the server-owned `currentStep` and `subStep` | `goToWithdrawalAccountSetupStep`, `setBankAccountSubStep` | `actions/OnboardingAccount.ts` |
| Start page of a step computed from which values exist | `R/USD/utils/getInitialSubStepForPersonalInfo.ts` and its siblings | `utils/getInitialSubStepForPersonalInfo.ts`, `utils/getInitialSubPageForSignerInfo.ts` |

### Flow pages and step vocabularies

| Pattern | Real flow | This module |
| --- | --- | --- |
| Static `pages` array, URL `:page/:subPage/:action`, rules that skip pages | `R/USD/USDVerifiedBankAccountFlowPage.tsx`, `R/NonUSD/NonUSDVerifiedBankAccountFlowPage.tsx` | `usd/USDFlowPage.tsx`, `nonUSD/NonUSDFlowPage.tsx` |
| Three vocabularies for one position: step constant, page name, numeric index | `CONST.BANK_ACCOUNT.STEP`, `PAGE_NAMES`, `startStepIndex` | `SBO_CONST.ts` (`STEP`, `PAGE_NAMES`, `SUBSTEP_INDEX`), every `startStepIndex` |
| `goBack` as a switch on `currentStep` | `R/ReimbursementAccountPage.tsx` | `entry/OnboardingEntryPage.tsx` (`goBackFromCurrentStep`) |
| `useSubPage` with `action=edit`, `startFrom` and `onPageChange` | `src/hooks/useSubPage` | Reused as is, for example `usd/PersonalInfo/PersonalInfo.tsx` |
| Step header with a numeric step counter | `InteractiveStepWrapper` | Reused as is |

### Forms

| Pattern | Real flow | This module |
| --- | --- | --- |
| One field per sub page, saved to the draft on every change | `R/USD/Requestor/PersonalInfo/subSteps/*` | `usd/PersonalInfo/subSteps/*`, `usd/BusinessInfo/subSteps/*` |
| Save per sub page with a `confirm` flag on the last one | `R/USD/Requestor/PersonalInfo/PersonalInfo.tsx` | `usd/PersonalInfo/PersonalInfo.tsx` |
| Confirmation page that sends the user back by numeric `onMove(index)` | `ConfirmationStep` usages | Every `subSteps/Confirmation.tsx` |
| Default values read in a different order by different steps (draft, then `achData`, then `corpay`; or `achData` only; or draft only) | `getSubStepValues`, the business and owner sub pages | `utils/getSubStepValues.ts`, `usd/BusinessInfo/subSteps/*`, `usd/BeneficialOwners/subSteps/*` |
| Fields locked once the account passed review | `R/USD/BusinessInfo/subSteps/*` | `usd/BusinessInfo/subSteps/Name.tsx`, `TaxID.tsx` |
| Value transforms before the request | tax ID stripping in `R/USD/BusinessInfo/BusinessInfo.tsx` | `usd/BusinessInfo/BusinessInfo.tsx` |
| Validators written inside the component | most sub pages | `usd/BankInfo/subSteps/Manual.tsx`, `usd/ConnectBankAccount/BankAccountValidationForm.tsx` |
| Fields and validation rules sent by the server | `R/NonUSD/BankInfo/*` (Corpay fields) | `nonUSD/BankInfo/ServerDrivenFieldsForm.tsx`, `utils/BankFieldUtils.ts`, `mockBackend/serverCatalog.ts` |
| Picklists sent by the server | `R/NonUSD/BusinessInfo/subSteps/BusinessType.tsx` | `nonUSD/BusinessInfo/subSteps/BusinessType.tsx` |
| The form key and the account key are the same Onyx string | `ONYXKEYS.REIMBURSEMENT_ACCOUNT` and `FORMS.REIMBURSEMENT_ACCOUNT_FORM` | `ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT` and `FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM` |
| File uploads kept in local state and in the draft | `R/USD/KYBDocuments`, `R/NonUSD/Docusign` | `usd/KYBDocuments.tsx`, `nonUSD/DraftFileInput.tsx` |
| A file that one step collects and a later step sends, with the resume position gated on it | bank statement in `R/NonUSD/Agreements`, sent by `R/NonUSD/Docusign` | `nonUSD/Agreements.tsx`, `nonUSD/Docusign.tsx`, `utils/getStartPageForContinueSetup.ts` |

### Requests

| Pattern | Real flow | This module |
| --- | --- | --- |
| Style 1: shared `isLoading` and `errors` on the account, a hook moves on when the request ends without an error | `src/hooks/useReimbursementAccountSubmitCallback.ts` | `hooks/useOnboardingSubmitCallback.ts`, the USD steps |
| Style 2: a ref set by hand, a flag per request, the shared `isSuccess`, and a `clear...` call | `R/NonUSD/BankInfo/BankInfo.tsx` and the other NonUSD steps | `nonUSD/BankInfo/BankInfo.tsx`, `nonUSD/BusinessInfo/BusinessInfo.tsx`, `nonUSD/BeneficialOwnerInfo/BeneficialOwnerInfo.tsx`, `nonUSD/Agreements.tsx`, `nonUSD/Docusign.tsx`, `actions/GlobalBankAccount.ts` |
| Style 3: send and move on without waiting | `R/USD/Requestor/VerifyIdentity/VerifyIdentity.tsx` | `usd/VerifyIdentity.tsx` |
| State-driven screen: the form does not wait, the next screen follows the account state | `R/USD/ConnectBankAccount/*` | `usd/ConnectBankAccount/ConnectBankAccount.tsx` |
| An if-chain over `achData.state` and `maxAttemptsReached` after submission | `R/USD/ConnectBankAccount/ConnectBankAccount.tsx` | `usd/ConnectBankAccount/ConnectBankAccount.tsx` |
| One action that writes two Onyx keys | reset and connect actions in `src/libs/actions/BankAccounts.ts` | `actions/ResetBankAccount.ts`, `mockBackend/handlers/buildResponse.ts` (`buildAccountUpdates`) |
| A key that is never persisted | `RAM_ONLY_*` keys, the Plaid link token | `RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_PLAID_LINK_TOKEN`, `actions/Plaid.ts` |
| A step that is blocked offline | Onfido and Plaid steps | `usd/VerifyIdentity.tsx`, `usd/BankInfo/subSteps/Plaid.tsx` |
| Offline queue for writes, optimistic data with rollback | `API.write` | `mockBackend/mockApi.ts` |

### Loops, branches and the second flow

| Pattern | Real flow | This module |
| --- | --- | --- |
| Owner loop limited by a count, owners stored under flat draft keys `beneficialOwner_<id>_<field>` | `R/USD/BeneficialOwnerInfo/*` | `usd/BeneficialOwners/*`, `utils/owners/OwnerDraftUtils.ts` |
| Owner loop limited by the ownership sum | `R/NonUSD/BeneficialOwnerInfo/*` | `nonUSD/BeneficialOwnerInfo/*` |
| A step container that renders question pages itself and hands the rest to a nested `useSubPage` | both owner steps | `usd/BeneficialOwners/BeneficialOwners.tsx`, `nonUSD/BeneficialOwnerInfo/BeneficialOwnerInfo.tsx` |
| Branch on "are you a director", with an email request and a waiting page | `R/NonUSD/SignerInfo/*` | `nonUSD/SignerInfo/*` |
| A second flow with its own form key that repeats the signer pages | `R/EnterSignerInfo/*` | `enterSignerInfo/EnterSignerInfoPage.tsx` (it reuses `nonUSD/SignerInfo/subSteps/*` through a `formID` prop) |
| A step that only some currencies get | Docusign for AUD | `nonUSD/Docusign.tsx`, `utils/OnboardingAccountUtils.ts` (`requiresDocusignStep`) |
| Third-party widgets: Plaid, Onfido, Docusign | their real SDK wrappers | Fake widgets with `[mock]` buttons in `usd/BankInfo/subSteps/Plaid.tsx`, `usd/VerifyIdentity.tsx`, `nonUSD/Docusign.tsx` |
| A review that ends on the backend and reaches the client as a push | Pusher updates of `reimbursementAccount` | `mockBackend/serverEvents.ts` (`finishReview`), `components/MockReviewButtons.tsx` |

## What is simplified

- **Variants, not patterns.** Each step keeps two to four sub pages. Addresses, phone numbers, websites, incorporation
  dates and most Corpay fields are gone.
- **Change bank account has no backup key.** The real flow copies the account to a backup key and restores it when the
  user backs out. Here the first instance of the entry page fetches the account again when the focus returns to it.
- **`goBack` has three cases** instead of one per step, because the flow pages own the back navigation of their steps.
- **The entry page takes no `stepToOpen` route param.**
- **The business step of the USD flow sends one request** from its confirmation page. The real step saves after every sub
  page.
- **The current user as a beneficial owner** is only a flag. The pages that collect the details of the user are left out.
- **Workspaces come from the read of the lab page**, which stands in for `OpenApp`.
- **No Concierge, 2FA or "Finish in chat" entries.**
- **Copy.** A screen uses an existing translation key when one fits. Text that only the lab needs is plain English and
  is not translated.
- **Styling** is the default of the shared components and nothing more.

## Mock server

`mockBackend/` holds a database in memory and mirrors it to the Onyx key `SIMPLIFIED_BANK_ONBOARDING_MOCK_SERVER`, so
the state survives a reload. `mockApi.ts` exposes `read` and `write` with the same shape as `API.read` and `API.write`:
optimistic data first, then the Onyx updates of the server, then the success or failure data.

The server follows the rules of the real backend that the client depends on:

- An open-page read replaces the whole account key and returns the step that the account reached. The client may ask for
  an earlier step and never for a later one.
- USD steps run in a fixed order. The identity check must pass before the company step, and the documents step only
  exists when the server asks for it.
- A Plaid account goes to review (`VERIFYING`) and a manual account waits for the test deposits (`PENDING`).
- The NonUSD flow ends in `VERIFYING` and needs the three agreements, plus the authorization form for AUD.
- Connecting a bank account while another one is `OPEN` creates a new account, so the old one stays connected until the
  new setup replaces it.

## Verification status

The module passes `npm run typecheck`, the React Compiler check and the spelling check, and `npm run lint-changed`
reports nothing inside the module. The flow has not been walked through in a browser yet, so expect runtime defects on
the first pass through the UI.

A review against the `app-coding-standards` rules still flags the constructs that are copied from the real flow: state
mirrored through effects, navigation from effects that watch a request flag, subscriptions to the whole account object,
props that pass a parent state setter down, and `handle...` callback names. They stay, because they are the subject of
the research.
