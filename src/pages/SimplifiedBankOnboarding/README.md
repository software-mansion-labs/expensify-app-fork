# Simplified bank onboarding (research module)

A small copy of the workspace bank account onboarding (`src/pages/ReimbursementAccount`). It keeps every pattern of the
real flow and cuts the number of variants: where the real flow has nine sub pages, this module has three. It talks to a
mock server that runs in the app, so no backend account is needed.

The module exists to try other architectures on something that is small enough to rewrite, but still shows the same
problems as the real flow. This version is the **wrapper flow** experiment: the steps declare their sub pages as JSX
children of a few shared wrappers, and a small core owns navigation, defaults, requests and errors. The baseline, which
reproduces the weak patterns of the real flow on purpose, is commit `a513a9853f9`. Every change of behaviour against that
baseline is listed in [Behaviour changes](#behaviour-changes).

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

The same page lists the other ways into the flow. The real flow reads the differences between them as data, so each
one is a separate scenario:

| Entry | `backTo` | What it shows |
| --- | --- | --- |
| A workspace row | none | Leaving the flow closes the panel |
| Payments page of a workspace | the Payments page | A started setup also offers "Change bank account". The page stays mounted under the flow, reads the account key and writes `isLoading` to it |
| A bank account row | the lab page | The flow opened by `bankAccountID` without a workspace. Starting over returns to the list |

Values that the mock server expects:

- validate code of the user: `123456`
- test deposit amounts: `0.01`, `0.02`, `0.03` (three wrong tries block the account)
- rejected SSN: last four digits `0000`. The client rule refuses `0000` before the request, as in the real flow, so to
  reach the server rejection pick **Fail requests** in the mock controls instead
- rejected tax ID: `000000000`

The mock database is persisted and has no version. Press **Reset** after you pull a change of `mockBackend/`, because
rows that an older version saved can miss fields that the handlers now require.

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
| Reset | Clears the server database and every client key of the lab, including the RAM requests key |

The request log under the controls shows each command, its parameters and the answer of the server. A failed request shows
a generic error in the UI, like the real flow, and the specific reason only in the log.

## Module layout

Everything is under `src/pages/SimplifiedBankOnboarding/`. Paths in the tables below that start with `R/` are relative
to `src/pages/ReimbursementAccount/`.

| Folder | Content |
| --- | --- |
| `contract/` | What the flows and the server agree on: `SBO_CONST.ts`, the form type and input IDs (`form.ts`), the Onyx types (`onyx.ts`), step and page IDs (`ids.ts`), the setup currency, the account status rules, the default account |
| `mockBackend/` | The server: database, command handlers, queue, server events. Frozen |
| `core/` | The flow and step shells, the blocks of sub pages, the request layer, the account read and the draft. Its public interface is `core/index.ts` |
| `entry/` | The page that opens a flow: the screen chain, the setup options, the connected view, the start over modal, the verify-account page and their requests |
| `flows/usd/` | The USD flow page and one folder per step |
| `flows/nonUSD/` | The NonUSD flow page and one folder per step |
| `flows/enterSignerInfo/` | The separate flow that an invited director opens from an email |
| `flows/shared/` | What two flows share: the owner loop and list page, the signer detail pages and the director request, the file input that saves to the draft, the `[mock]` review buttons |
| `lab/` | The lab page: workspace list, other entry points, the Payments page stand-in, the mock server panel, the lab reads and reset |
| `index.ts` | The only import of the app: the screens and the Onyx value types |

The files outside the module only register it: Onyx keys, routes, screens, the navigator entries, one menu item, one
translation key and the Sentry labels. `src/components/SubStepForms/YesNoStep.tsx` got two optional props (`formID`,
`enabledWhenOffline`) that the real flow does not pass.

### Layers and the import rule

```
contract  <-  mockBackend  <-  core  <-  { entry, flows }  <-  lab  <-  index.ts
```

- An arrow points from the imported layer to the importer. A layer never imports a layer to its right.
- `entry/` and `flows/` never import each other. The entry opens a flow through `openFlow` of the core.
- `flows/<flow>/` may import `flows/shared/`. `flows/shared/` imports no flow.
- Code outside `core/` imports the core only through `core/index.ts`. The app imports only `index.ts`.
- `contract/` never imports `mockBackend/`.
- A step folder never imports `Navigation` or `ROUTES`. Steps name pages, `core/flow/flowRoutes.ts` builds routes.
- A step folder imports another step folder only when that step comes earlier in the flow (Docusign reads the answers of
  the agreements step). Nothing imports a later step.
- Steps do not read the form draft or the account with `useOnyx`. They get both from `useFlowData()` of the core, which
  also picks the form of the invited director flow. The entry reads the draft for the setup type, the currency and its
  cleanup.

## Wrappers and how a step declares itself

A flow page lists its steps. A step lists its sub pages. Both lists are JSX children, read in order by the shell.

| Wrapper | Role |
| --- | --- |
| `OnboardingFlow` + `FlowStep` | The flow screen. Steps in flow order, each a `FlowStep` around the step component with its `isComplete` rule, an optional `skip` rule and the step `counter` (`own`, `shared`, `none`). Without a step in the URL the flow opens the first step that is neither skipped nor complete. The shell also holds the account gate (BC-25), and it corrects a URL that names no step, an unknown step or a skipped step in place, without a new history entry |
| `OnboardingStep` | The step shell: header with the counter, the sub page in the URL, the start page (`startAt`, else the first rendered page after Next, else the first page that is not `isAnswered`), edit mode (Next and Back return to the page that opened it, which the URL names), `saveAfterEachPage`, history-aware Back (BC-14), `onBackFromStart`. A URL that names a page which the step does not render opens the start page |
| `SubPage` | A named page with custom markup. `back` and `next` take a page, `NEXT_STEP` or `PREVIOUS_STEP` |
| `FormSubPage` | The general block: a sub page with a form of the flow. Props: `title`, `inputIDs` (all required), `validate`, `request`, `getDraftUpdate`, `next` or `getNext`, `submitButtonText`, `isSubmitDisabled`, `submitButtonStyles`, `shouldHideFixErrorsAlert`, `ref`. It saves the draft, sends the `request`, shows its error and pending state, and moves on. Without a `name` it is the only page of its step |
| `SingleFieldSubPage`, `FullNameSubPage`, `DateOfBirthSubPage`, `YesNoSubPage`, `ConfirmationSubPage` | Blocks for the common pages, with the same submit behaviour as `FormSubPage` |
| `SubPageInput` | `InputWrapper` that saves the draft on change outside edit mode |
| `useFlowData`, `useFlowDataOf` | The data of a flow in one shape, `FlowData = {bankAccount, account, draft, currency}`. A step calls `useFlowData()`. The NonUSD flow page, which renders above `OnboardingFlow` and tests its rules on the whole data, calls `useFlowDataOf(target)`. The USD flow page needs only `achData`, so it selects it from the account key |
| `useSubPageSubmit`, `usePageNavigation` | The submit and the navigation of a custom page (`goNext`, `goNextAfter`, `goBack`, `openPage`) |
| `RequestErrorMessage`, `PageLoadingIndicator` | The one way to show a request error, and the one full-screen loader of a page |

The rules for a step:

1. A step is a component without props in `flows/<flow>/<step>/XStep.tsx`. Its folder holds everything that only this
   step needs: the pages (`<step>Pages.ts`), the answers (`get<Step>Answers.ts`), the requests and, in the NonUSD flow,
   the completion rule.
2. The answers of a step are one pure function, `get<Step>Answers(data: FlowData)`, with the rule
   `draft ?? server ?? default` (BC-08). The step calls it with `useFlowData()`, its requests call it with the data that
   `build` gets, and its completion rule calls it with the data of the flow page. So the three always agree.
3. The names of its sub pages are a local `as const` object in `<step>Pages.ts`. The values are the `subPage` param of
   the URL, so they do not change. No central list of pages exists.
4. It renders `<OnboardingStep title wrapperID>`. A sub page may be left out only on data that cannot change while the
   step is shown (currency, server data, earlier steps), never on an answer of the same step. A branch inside a step
   uses `next`, `back` and `getNext` over pages that are always rendered.
5. A request is a `const` of type `OnboardingRequest` in a `*Request(s).ts` file of its step, with a literal name
   `<flow>.<step>.<action>`.
6. Navigation goes through the blocks or `usePageNavigation`. Leaving the flow goes through `useOnboardingFlow()`
   (`returnToEntry`, `leaveFlow`).
7. A step joins a flow with one `<FlowStep>` element in the flow page. `isComplete` is required: it says from the saved
   data whether the user finished the step. In the USD flow the server stores the current step, so the rule is
   `isPastServerStep(achData, STEP.X)`. In the NonUSD flow the server stores no step, so each step folder has its own
   rule (`isCountryComplete.ts`, `areOwnersComplete.ts`, ...). The last step of a flow passes `false`.

Adding a step therefore touches the new step folder, one `<FlowStep>` element, and the step ID in
`contract/SBO_CONST.ts`, which is part of the frozen route contract.

Example, `flows/usd/personalInfo/PersonalInfoStep.tsx` (imports left out):

```tsx
function PersonalInfoStep() {
    const {translate} = useLocalize();
    const data = useFlowData();
    const answers = getPersonalInfoAnswers(data);

    return (
        <OnboardingStep
            title={translate('personalInfoStep.personalInfo')}
            wrapperID="SimplifiedBankOnboardingPersonalInfo"
            startAt={isVerifying(data.account?.achData) ? PAGES.FULL_NAME : undefined}
            saveAfterEachPage={personalInfoProgressRequest}
        >
            <FullNameSubPage
                name={PAGES.FULL_NAME}
                isAnswered={!!answers.firstName && !!answers.lastName}
                title={translate('personalInfoStep.enterYourLegalFirstAndLast')}
                firstNameInputID={INPUT_IDS.FIRST_NAME}
                lastNameInputID={INPUT_IDS.LAST_NAME}
                defaultValues={{firstName: answers.firstName, lastName: answers.lastName}}
            />
            {/* DateOfBirthSubPage and SingleFieldSubPage for the SSN in the same shape */}
            <ConfirmationSubPage
                name={PAGES.CONFIRMATION}
                title={translate('personalInfoStep.letsDoubleCheck')}
                request={personalInfoRequest}
                rows={[{label: translate('personalInfoStep.legalName'), value: `${answers.firstName} ${answers.lastName}`, page: PAGES.FULL_NAME}]}
            />
        </OnboardingStep>
    );
}
```

The flow page adds it with:

```tsx
<FlowStep
    id={PAGE_NAMES.REQUESTOR}
    isComplete={isPastServerStep(achData, STEP.REQUESTOR)}
>
    <PersonalInfoStep />
</FlowStep>
```

A step with one form is `<OnboardingStep>` around one `FormSubPage` without a name (the country pages, both agreement
steps, Docusign).

Custom pages (Plaid, the identity check, the test deposits, the waiting page, the server-driven bank form, the director
email page, the owner lists and the invited director) render their own markup inside `SubPage` or `OnboardingStep`, and
use `useOnboardingRequest`, `useSubPageSubmit` and `usePageNavigation` for everything else.

## Request layer

```ts
const personalInfoRequest: OnboardingRequest = {
    name: 'usd.personalInfo.confirm',
    build: ({bankAccount, account, draft, currency}) => ({type: 'write', command: WRITE_COMMANDS.UPDATE_PERSONAL_INFORMATION, params: {...}}),
};
```

- `build` gets the data that Onyx holds when the request is sent (the blocks save the draft first) and returns a
  `RequestSpec`: the mock command, its params, its Onyx data, an `errorKey`, and `shouldShowErrorOutsideFlow`. It returns
  undefined when the request cannot be built, which counts as a failed attempt with the generic error (BC-20).
- A block sends its `request` prop. A custom page calls `useOnboardingRequest(request)`, which returns
  `{send, isPending, errorMessage}`. `send` resolves with a `RequestOutcome`, and `goNextAfter(outcome)` moves on only
  when it succeeded and the screen still shows that page (`useScreenGuard`). A second press while one is pending sends
  nothing.
- A read that a page needs uses `useReadOnOpen(request)`. It reads again after a reconnect until it succeeds (BC-07).
- The status of each request (pending, error) lives in the RAM-only key `simplifiedBankOnboardingRequests`, under the
  request name and the bank account. Flow writes no longer touch `account.isLoading` or the success flags.
- A failed flow write is mirrored to `account.errors`, because the entry and the Payments page read it there. The mirror
  lives as long as the page error: it is cleared by a new attempt, by Back, and when the page that sent the request
  unmounts, but only while it still holds that request's error (BC-04).
- `core/accountRead/openOnboardingPage.ts` is the one account read (`OpenOnboardingPage`), used by the entry and by the
  flow gate.

## Pattern catalog

Each row names a pattern of the real flow, the real file that shows it best, and how this module handles it now. Rows
marked **kept** reproduce the real pattern as the baseline did. The other rows describe the one way that replaced the
variants of the baseline.

### Opening the flow and picking a screen

| Pattern | Real flow | This module |
| --- | --- | --- |
| Chain of early returns that picks the screen (offline without data, workspace loading, loading, not found or not authorized, throttled or unsupported currency, connected, pending redirect, entry point) | `R/ReimbursementAccountPage.tsx` | A pure rule `entry/getEntryState.ts` and one view per state in `entry/views/` |
| USD or NonUSD flow chosen by the workspace currency | `R/ReimbursementAccountPage.tsx` | `contract/currency.ts`, `entry/getEntryState.ts`. `isNonUSDSetup` is derived, not mirrored in state (BC-18) |
| One account key shared by every workspace, guarded by `achData.policyID === policyID` | `R/ReimbursementAccountPage.tsx` (`isPreviousPolicy`) | **Kept**: `contract/setupStatus.ts` (`belongsToPolicy`). The flow page also has an account gate (BC-25) |
| Refetch after reconnect | `R/ReimbursementAccountPage.tsx` (`fetchData(true)`) | `entry/useEntryAccountRead.ts`, with the read of `core/accountRead/openOnboardingPage.ts`. It asks for the server's step (BC-10) |
| Cleanup of the shared keys on unmount | `R/ReimbursementAccountPage.tsx` | **Kept**: `entry/useEntryAccountRead.ts` |
| Redirect of a pending USD account straight to the validation step | `R/ReimbursementAccountPage.tsx` | `entry/views/PendingValidationRedirect.tsx`, with `keepAccountOnUnmount` and `releaseAccountOnUnmount` from `useEntryAccountRead` |
| Fresh setup: Plaid or manual. Started setup: continue, change bank account, start over | `R/VerifiedBankAccountFlowEntryPoint.tsx` | `entry/views/options/SetupOptions.tsx`, `useSetupOptionPress.ts` |
| Validation gate: the picked option is stored in Onyx, the user validates on another page | `R/DynamicReimbursementAccountVerifyAccountPage.tsx` | **Kept**: `entry/VerifyAccountPage.tsx`, `entry/requests/setupOption.ts` (`OPTION_PRESSED`) |
| Reset modal | `src/hooks/useResetBankAccountModal.tsx` | `entry/reset/useStartOverModal.tsx`. It opens from the row press, no Onyx flag (BC-17) |
| Change bank account: a second instance of the entry page marked by a route param | `src/hooks/useChangeBankAccount.ts` | **Kept**: `entry/entryNavigation.ts`, `entry/requests/setupOption.ts` (`prepareNewBankAccountSetup`) |
| Connected account view | `R/ConnectedVerifiedBankAccount.tsx` | `entry/views/ConnectedBankAccountView.tsx` |
| `backTo` passed through every route and read as data | `ROUTES.ts`, `R/VerifiedBankAccountFlowEntryPoint.tsx` | **Kept**: routes are built only in `core/flow/flowRoutes.ts` and `entry/entryNavigation.ts` |
| Entry by `bankAccountID` without a workspace | `R/ReimbursementAccountPage.tsx` (`bankAccountIDParam`) | **Kept**: `entry/OnboardingEntryPage.tsx`, `lab/OtherEntryPoints.tsx` |
| A page outside the flow that reads the account key and raises `isLoading` on it | `WorkflowsPaymentsTab.tsx`, `WorkspacePageWithSections.tsx` | **Kept**: `lab/WorkspacePaymentsPage.tsx`, `lab/labActions.ts` |

### Resume

| Pattern | Real flow | This module |
| --- | --- | --- |
| USD: the server keeps `currentStep`, a dictionary turns it into a step | `R/ReimbursementAccountPage.tsx` (`stepToPageName`) | `isComplete` of each `FlowStep` in `flows/usd/USDFlowPage.tsx`, from one rule `flows/usd/isPastServerStep.ts` |
| NonUSD: the client works out the first unfinished step | `R/NonUSD/utils/getStartPageForContinueSetup.ts` | `isComplete` of each `FlowStep` in `flows/nonUSD/NonUSDFlowPage.tsx`. Each rule lives in its step folder (`isCountryComplete.ts`, `isBusinessInfoComplete.ts`, `areOwnersComplete.ts`, `signerRules.ts`, `areAgreementsComplete.ts`) |
| `draftStep`: the server values of a step are copied into the draft | `R/ReimbursementAccountPage.tsx` | Gone. Inputs read server values through the answers (BC-11) |
| Lossy prefill: the server returns a masked account number | `achData` of a resumed setup | **Kept**: the locked manual bank page shows the masked server numbers (`flows/usd/bankAccount/getBankAccountAnswers.ts`) |
| Lossy round trip of the owner name | `R/NonUSD/utils/getDraftValuesForBeneficialOwners.ts` | **Kept**: `flows/shared/owners/serverOwners.ts` (`splitFullName`, BC-09) |
| The client writes the server-owned `currentStep` and `subStep` | `goToWithdrawalAccountSetupStep`, `setBankAccountSubStep` | Gone (BC-10). The setup type is `draft.setupType` |
| Start page of a step computed from which values exist | `R/USD/utils/getInitialSubStepForPersonalInfo.ts` and its siblings | `isAnswered` on each sub page and `startAt` (`flows/nonUSD/signer/getSignerStartPage.ts`), read by `OnboardingStep` |

### Flow pages and step vocabularies

| Pattern | Real flow | This module |
| --- | --- | --- |
| Static `pages` array, URL `:page/:subPage/:action`, rules that skip pages | `R/USD/USDVerifiedBankAccountFlowPage.tsx` | `<FlowStep id isComplete skip counter>` children of `OnboardingFlow` in `flows/usd/USDFlowPage.tsx`, `flows/nonUSD/NonUSDFlowPage.tsx`. The URL is **kept** |
| Three vocabularies for one position: step constant, page name, numeric index | `CONST.BANK_ACCOUNT.STEP`, `PAGE_NAMES`, `startStepIndex` | Step names only, and each step names its own sub pages in `<step>Pages.ts`. The counter comes from the `FlowStep` order (BC-23) |
| `goBack` as a switch on `currentStep` | `R/ReimbursementAccountPage.tsx` | **Kept** for the entry loader only: `entry/entryNavigation.ts`. Steps use the shell's Back |
| `useSubPage` with `action=edit`, `startFrom` and `onPageChange` | `src/hooks/useSubPage` | `OnboardingStep` and `core/step/readSubPages.ts`. `@hooks/useSubPage` is no longer used by the lab |
| Step header with a numeric step counter | `InteractiveStepWrapper` | Inside `OnboardingStep` only |

### Forms

| Pattern | Real flow | This module |
| --- | --- | --- |
| One field per sub page, saved to the draft on every change | `R/USD/Requestor/PersonalInfo/subSteps/*` | `SingleFieldSubPage`, `FullNameSubPage`, `DateOfBirthSubPage`, `SubPageInput` |
| Save per sub page with a `confirm` flag on the last one | `R/USD/Requestor/PersonalInfo/PersonalInfo.tsx` | **Kept**: `saveAfterEachPage` of `flows/usd/personalInfo/PersonalInfoStep.tsx` |
| Confirmation page that sends the user back by numeric `onMove(index)` | `ConfirmationStep` usages | `ConfirmationSubPage rows=[{label, value, page}]` |
| Default values read in a different order by different steps | `getSubStepValues`, the business and owner sub pages | `draft ?? server ?? default` in the `get<Step>Answers.ts` file of each step (BC-08) |
| Fields locked once the account passed review | `R/USD/BusinessInfo/subSteps/*` | **Kept**: `isLocked` of the blocks, `flows/usd/businessInfo/BusinessInfoStep.tsx` |
| Value transforms before the request | tax ID stripping in `R/USD/BusinessInfo/BusinessInfo.tsx` | **Kept**: `flows/usd/businessInfo/businessInfoRequest.ts` |
| Fields and validation rules sent by the server | `R/NonUSD/BankInfo/*` (Corpay fields) | **Kept**: `flows/nonUSD/bankInfo/ServerDrivenFields.tsx`, `bankFields.ts`, `mockBackend/serverCatalog.ts` |
| Picklists sent by the server | `R/NonUSD/BusinessInfo/subSteps/BusinessType.tsx` | **Kept**: `flows/nonUSD/businessInfo/BusinessInfoStep.tsx`, read with `useReadOnOpen` |
| The form key and the account key are the same Onyx string | `ONYXKEYS.REIMBURSEMENT_ACCOUNT` and `FORMS.REIMBURSEMENT_ACCOUNT_FORM` | Separate strings (BC-01) |
| File uploads kept in local state and in the draft | `R/USD/KYBDocuments`, `R/NonUSD/Docusign` | The draft only: `flows/shared/files/DraftFileInput.tsx` |
| A file that one step collects and a later step sends | bank statement in `R/NonUSD/Agreements`, sent by `R/NonUSD/Docusign` | **Kept**: `flows/nonUSD/agreements/getAgreementsAnswers.ts`, read by `flows/nonUSD/docusign/` and by `areAgreementsComplete.ts` |

### Requests

| Pattern | Real flow | This module |
| --- | --- | --- |
| Style 1: shared `isLoading` and `errors`, a hook moves on when the request ends without an error | `src/hooks/useReimbursementAccountSubmitCallback.ts` | Replaced by `OnboardingRequest`, a block's `request` prop or `useOnboardingRequest` + `goNextAfter` |
| Style 2: a flag per request, the shared `isSuccess`, a ref set by hand, a `clear...` call in the effect cleanup | `R/NonUSD/BusinessInfo/BusinessInfo.tsx` and the other NonUSD steps | Replaced the same way. Status per request in the RAM requests key (BC-02, BC-03) |
| Style 3: send and move on without waiting | `R/USD/Requestor/VerifyIdentity/VerifyIdentity.tsx` | Replaced: the identity check waits for the request (BC-05) |
| State-driven screen: the next screen follows the account state | `R/USD/ConnectBankAccount/*` | **Kept**: `flows/usd/validation/ValidationStep.tsx` |
| An if-chain over `achData.state` and `maxAttemptsReached` after submission | `R/USD/ConnectBankAccount/ConnectBankAccount.tsx` | **Kept**: `flows/usd/validation/ValidationStep.tsx` |
| One action that writes the account key and the workspace key optimistically, and puts the second one back on a failure | `resetUSDBankAccount.ts` | **Kept**: `entry/requests/resetBankAccount.ts` |
| One response that updates the account key and the workspace key | the connect and update commands | **Kept**: `mockBackend/handlers/buildResponse.ts` |
| A key that is never persisted | `RAM_ONLY_*` keys | **Kept**, plus the new `RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS` |
| A step that is blocked offline | Onfido and Plaid steps | **Kept**: `FullPageOfflineBlockingView` in `flows/usd/bankAccount/BankAccountStep.tsx` and `VerifyIdentityStep.tsx`. Other pages follow BC-15 |
| Offline queue for writes, optimistic data with rollback | `API.write` | **Kept**: `mockBackend/mockApi.ts` |

### Loops, branches and the second flow

| Pattern | Real flow | This module |
| --- | --- | --- |
| Owner loop limited by a count, owners under flat draft keys `beneficialOwner_<id>_<field>` | `R/USD/BeneficialOwnerInfo/*` | Owners are a list in the draft (`usdOwners`) plus a buffer: `flows/shared/owners/ownerLoop.ts` (BC-09) |
| Owner loop limited by the ownership sum | `R/NonUSD/BeneficialOwnerInfo/*` | The same loop with `globalOwners`, limits in `flows/shared/owners/ownerLimits.ts` |
| A step container that renders question pages itself and hands the rest to a nested `useSubPage` | both owner steps | One `OnboardingStep` with the questions, the list and `renderOwnerDetailsPages` as children |
| Branch on "are you a director", with an email request and a waiting page | `R/NonUSD/SignerInfo/*` | `flows/nonUSD/signer/SignerStep.tsx` with `getNext`, `back` and `PREVIOUS_STEP` |
| A step whose pages depend on the answer of another step (the signer skips its name page when an owner gave the name) | `R/NonUSD/SignerInfo/SignerDetailsFormPages.tsx` | **Kept**: `flows/nonUSD/signer/signerRules.ts`, `flows/shared/signerDetails/renderSignerDetailsPages.tsx` |
| The current user as an owner, stored under a reserved owner key | `R/NonUSD/BeneficialOwnerInfo/*` (`CURRENT_USER_KEY`) | **Kept**: `SBO_CONST.NON_USD.CURRENT_USER_KEY` |
| A second flow with its own form key | `R/EnterSignerInfo/*` | **Kept**: `flows/enterSignerInfo/`. It reuses `renderSignerDetailsPages` and has its own answers and request (BC-16) |
| A step that only some currencies get | Docusign for USD, CAD and AUD | **Kept**: Docusign for AUD, `skip` of its `FlowStep` |
| Third-party widgets: Plaid, Onfido, Docusign | their real SDK wrappers | **Kept**: fake widgets with `[mock]` buttons in `PlaidBankPage.tsx`, `VerifyIdentityStep.tsx`, `DocusignStep.tsx` |
| A review that ends on the backend and reaches the client as a push | Pusher updates of `reimbursementAccount` | **Kept**: `mockBackend/serverEvents.ts`, `flows/shared/MockReviewButtons.tsx` |

## Behaviour changes

Every change against the baseline is on purpose. The full text is in the design (`repo/sbo-wrapper-flow/DESIGN.md`,
section 8).

| ID | Change |
| --- | --- |
| BC-01 | The form keys get their own strings. Forms no longer show `account.isLoading` and `account.errors` by accident, and a failed request no longer blocks the next submit. Drafts saved before the change are lost once |
| BC-02 | Flow requests stop writing `account.isLoading`, `isSuccess`, the `isSaving...` style flags and `draftStep`. Their status lives in the RAM key `simplifiedBankOnboardingRequests`. The Plaid, picklists and bank fields reads no longer write `isLoading`, `isSuccess` or `errors` into their data keys. The account read still writes `account.isLoading` |
| BC-03 | A page moves on after a request only when it succeeded and the screen still shows that page. A second press while pending sends nothing |
| BC-04 | A request error belongs to the page that sent it. The `account.errors` mirror lives exactly as long as that page error |
| BC-05 | The identity check waits for `VerifyIdentity`. On failure the user stays and sees the error |
| BC-06 | The yes/no questions use the lab form and show the error of their request |
| BC-07 | Reads a page needs are sent again after a reconnect until they succeed. The bank fields read is never sent with an empty country |
| BC-08 | One default rule `draft ?? server ?? default`. The failure of the personal info progress save is shown nowhere |
| BC-09 | Owners are lists in the draft plus a buffer. Saved owners are the list until the draft has one. The server full name is split at the first space |
| BC-10 | The client no longer writes `achData.currentStep` or `subStep`. "Continue with setup" opens the flow at its resume step |
| BC-11 | The entry no longer copies server values into the draft |
| BC-12 | A locked manual bank form sends nothing on Next and goes to the next step |
| BC-13 | A step opened without a sub page by anything but Next starts at its first unanswered page |
| BC-14 | Back from the first sub page of a step goes to the previous step's route in the history, else to its start page |
| BC-15 | A page is disabled offline only when its block itself sends a request. Plaid and the identity check keep the offline view |
| BC-16 | The invited director page waits for its own request, and the signer step's request no longer touches the signer form |
| BC-17 | The reset modal opens from the row press. `shouldShowResetModal` is no longer written |
| BC-18 | Entry fixes: derived `isNonUSDSetup`, the right in-progress check after a reset, `backTo` kept by the connected view's reset and by "Change bank account", one disabled-row rule, a failed reset reads the account again, the screen guard after "Continue with setup" |
| BC-19 | Verify account page: Enter with an empty code does nothing, and the input has a Sentry label |
| BC-20 | A request that cannot be built records a failed attempt with the generic error |
| BC-21 | One step shell per step (the signer step keeps one wrapper ID on all pages). No step shows a loader while it resolves its start page |
| BC-22 | The lab reset and the bank account reset also clear the RAM requests key |
| BC-23 | Counter labels come from the flow list. Nothing visible |
| BC-24 | Dropped. Next opens the first sub page of the next step, as before |
| BC-25 | The flow page reads the account when the route names a workspace whose account Onyx does not hold, never while a reset runs, and clears the main-form draft right before it |
| BC-26 | Owners Back: Back from the NonUSD owner list opens the question that led to it, and Back on the USD question "are there more owners" opens the second question. Before, both returned to the confirmation of the last owner |
| BC-27 | NonUSD owners: "I own 25%" takes the user out of the owner list until the user's details are confirmed, and the list keeps the user plus three others |
| BC-28 | The NonUSD signer name page is left out only when the user's owner entry has a name, so the director request never sends an empty name |
| BC-29 | An offline read is skipped before it reaches the mock API, so the request log shows no "dropped" row for it |
| BC-30 | Entry: a failed account read shows the not found view to a user who is not an admin of the workspace (an admin keeps the loader). The pending validation redirect does nothing while another screen covers the entry. Back on the "Change bank account" instance returns to the entry with the connected account |
| BC-31 | The route of the invited director form is `settings/bank-onboarding-lab/enter-director-info`. The old path ended with `enter-signer-info`, which the app's own dynamic route captured, so the lab form never opened |
| BC-32 | A failed picklists read shows the not found page in the NonUSD business step, like a failed bank fields read in the bank step. Before, the business type page showed an empty picker |

Kept on purpose: the client SSN rule that refuses `0000`, the tax ID transform, the live draft save while typing,
`OPTION_PRESSED`, the verify page Back that ignores `backTo`, `NotFoundPage` on a failed bank fields read, and the AUD
rule that always asks for a second director.

## Rules for an experiment

An experiment replaces the architecture of the flow and nothing around it. These parts are the contract with the rest of
the app, so they stay as they are:

- **`mockBackend/` is frozen.** Commands, parameters, responses and the Onyx updates that the server sends back do not
  change. An architecture that needs another server contract is an experiment about the backend, not about the client.
- **The shapes of `SIMPLIFIED_BANK_ONBOARDING_ACCOUNT` and `SIMPLIFIED_BANK_ONBOARDING_WORKSPACES` are frozen.** Pages
  outside the flow read and write them (`lab/WorkspacePaymentsPage.tsx`, `lab/WorkspaceList.tsx`,
  `lab/OtherEntryPoints.tsx`). In the real app 22 files outside `R/` and outside `src/libs/actions` read
  `REIMBURSEMENT_ACCOUNT`, and 7 action files write it. An experiment may add keys and may stop reading these two inside
  the flow, but it must keep them correct for the outside readers.
- **The routes and their parameters are frozen**, including `backTo` and `bankAccountID`, because other pages build them.
- **The files in `lab/` are not a part of the flow.** They change only when an experiment is about the callers too.

Judge every experiment on the same scenarios, because they are the ones where the baseline is weak. The expected result
of this experiment follows each scenario. These results come from the design and the tests. They still need a walk in
the browser.

1. **Leave in the middle of each flow, open it again and continue. Check the prefill, including the owner name.** The
   flow opens the resume step (BC-10), the step opens its first unanswered page (BC-13), and every input shows
   `draft ?? server` (BC-08). Owners saved on the server form the list, and the name splits at the first space (BC-09).
2. **Fail a request of each of the three styles and submit again.** There is one style. The error shows once above the
   button of the page that sent the request, and the next press sends again right away (BC-01, BC-04). The identity
   check stays on the step and shows the error (BC-05).
3. **Go back or submit twice while a slow request is running.** A second press sends nothing. Going back or closing
   during the request no longer jumps to a later page when it ends (BC-03).
4. **Start over from each of the three entries, online and with a failed request.** The modal opens from the row press
   (BC-17). The NonUSD reset opens the country page at once, also offline (BC-25 never reads during a reset). A failed
   reset reads the account again and shows the generic error (BC-18). The flow opened by `bankAccountID` returns to the
   list.
5. **Replace a connected bank account and back out of the replacement.** "Change bank account" keeps `backTo` (BC-18).
   Backing out brings the connected view back through the read of the first entry instance.
6. **Answer "I own 25% or more" in the NonUSD flow and reach the signer step, then change the answer and reach it
   again.** The baseline failed here. Now the draft answer wins over the saved one (BC-08), so the change is sent, and
   the signer step skips its name page only when the current owner list holds the user's name.
7. **Lose and regain the connection with the Payments page mounted under the flow.** Flow writes no longer touch
   `account.isLoading`, so the entry under the flow no longer swaps to its loader or offline view (BC-02). Reads that a
   page needs are sent again after the reconnect (BC-07).
8. **Open the same bank account by `bankAccountID` and by its workspace.** Both show the same account. By workspace the
   flow page reads the account when Onyx holds another workspace's account (BC-25). By `bankAccountID` it never reads,
   and the NonUSD bank info confirm, which needs a `policyID`, fails with the generic error (BC-20).

## What is simplified

- **Variants, not patterns.** Each step keeps two to four sub pages. Addresses, phone numbers, websites, incorporation
  dates and most Corpay fields are gone.
- **Change bank account has no backup key.** The real flow copies the account to a backup key and restores it when the
  user backs out. Here the first instance of the entry page fetches the account again when the focus returns to it.
- **The Back of the entry loader has three cases** instead of one per step, because the flow pages own the back
  navigation of their steps.
- **The entry page takes no `stepToOpen` route param.**
- **The business step of the USD flow sends one request** from its confirmation page. The real step saves after every sub
  page.
- **The current user as a beneficial owner** is only a flag in the USD flow. The NonUSD flow collects the details of the
  user, because its signer step depends on them.
- **Workspaces come from the read of the lab page**, which stands in for `OpenApp`.
- **No Concierge, 2FA or "Finish in chat" entries.**
- **Copy.** A screen uses an existing translation key when one fits. Text that only the lab needs is plain English and
  is not translated.
- **Styling** is the default of the shared components and nothing more.

## Not reproduced

The module leaves these mechanisms of the real flow out. An architecture that wins here still has to answer each of them
before the decision moves to the full flow. A box is checked when a later change brings the mechanism into the module.

Shared state and requests:

- [ ] `isSettingBA`, `IS_CHANGING_TO_NEW_BANK_ACCOUNT` and the backup key that restores the account when the user backs
      out of a replacement.
- [ ] `hideBankAccountErrors` and the other writers that clear errors on the account key from outside the flow.
- [ ] The two reset actions differ in the real flow (parameters, the keys they clear, the payment method they fix up).
      Here both share one function.
- [ ] The failure data of `createCorpayBankAccount` writes no error. Here every failed request writes a generic one.
- [ ] `isAskingForCorpaySignerInformationSuccess` is never cleared after a success in the real flow. Here the flow
      requests write no success flags at all (BC-02).
- [ ] Requests that carry files. Here a request carries the file names.
- [ ] The offline queue of the real app is persisted and replayed after a restart. Here it lives in memory.
- [ ] `achContractValuesRef` on the entry page, which copies the agreement values out of the draft and writes them back
      when the draft is cleared on the agreement step.

Routing and entry:

- [ ] The `stepToOpen` route parameter and `getStepToOpenFromRouteParams`.
- [ ] The full currency chain of the entry page (`prevPolicyCurrency`, the change of the workspace currency while the flow
      is open).
- [ ] A flow opened by `bankAccountID` cannot send the bank step again, because that request needs the workspace ID. The
      other steps work, because the mock server finds the account by its ID.
- [ ] Concierge, 2FA and "Finish in chat" entries, and the Wallet purpose page that a reset returns to.

Third parties:

- [ ] The Plaid OAuth return, `isPlaidDisabled` and `PLAID_CURRENT_EVENT`.
- [ ] The Onfido token source, its errors and the retry path.

Code shape:

- [ ] The second flow has its own copy of every signer page in the real code. Here it reuses the pages of the NonUSD
      flow, so the cost of that duplication is not visible.
- [ ] The cost of an incremental migration. The real flow has to move step by step with both architectures alive, and a
      rewrite of this module does not show that.

## Mock server

`mockBackend/` holds a database in memory and mirrors it to the Onyx key `SIMPLIFIED_BANK_ONBOARDING_MOCK_SERVER`, so
the state survives a reload. `mockApi.ts` exposes `read` and `write` with the same shape as `API.read` and `API.write`:
optimistic data first, then the Onyx updates of the server, then the success or failure data. The lab sends every
request through `runRequest` of the core, which adds the request status updates. The controls and the request log are in
`lab/mockServerPanel/`.

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

The module passes `npm run typecheck`, the React Compiler check, the spelling check and the lab tests in
`tests/unit/SimplifiedBankOnboarding` and `tests/ui/SimplifiedBankOnboarding`. `npm run lint-changed` reports nothing
inside the module.

After the rewrite the flows were walked in a browser on the web dev server:

- USD with manual numbers from the country step to a connected account, and the Plaid variant up to the review card.
- NonUSD in EUR from start to finish, and in AUD on the director path from start to finish. On the path of a user who
  is not a director: the email pages, the hang-tight page and the invited director form.
- The entry page in every state, start over and disconnect (also with a failed request), the blocked views and the
  verify account page.
- On each step: validation, edit from the confirmation, Back, reload and resume, a failed request with a retry, a
  double press, and the offline rules of BC-15.

Judge scenarios 1 to 6 pass. Scenario 7 was walked only for the offline half (the reads after a reconnect were not
measured), and scenario 8 only for the entry opened by `bankAccountID`. Not walked: the FR and ES bank fields, a cold
open of a deep flow URL, and the lab Reset button.

Known and left as it is:

- Next on the last page of a flow, and Done on the finish page reached by Next, go back one screen
  (`returnToEntry`), not all the way to the entry. The baseline does the same.
- The yes/no questions of the USD owners step have a slightly larger bottom margin than at the baseline, because every
  yes/no page now uses the same block.

A few places still differ from the one way, on purpose:

- `flows/nonUSD/bankInfo/ServerDrivenFields.tsx` and `flows/usd/bankAccount/PlaidBankPage.tsx` use their own
  `FormProvider` with `useSubPageSubmit`. The first builds its inputs and its validation from fields that the server
  sends, so it has no fixed `inputIDs`. The second submits a choice of the fake Plaid widget, not inputs.
- The director email page and the test deposits also keep their own `FormProvider`, because their forms do not map to
  one block.
