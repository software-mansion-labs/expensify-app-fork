# Simplified bank onboarding (research module)

A small copy of the workspace bank account onboarding (`src/pages/ReimbursementAccount`). It keeps every pattern of the
real flow and cuts the number of variants: where the real flow has nine sub pages, this module has three. It talks to a
mock server that runs in the app, so no backend account is needed.

The module exists to try other architectures on something that is small enough to rewrite, but still shows the same
problems as the real flow. The first version (commit `a513a9853f9`) reproduced the weak patterns of the real flow on
purpose and is the baseline of every experiment. This version replaces the architecture of the flow with a modular one,
described in [Architecture](#architecture). The baseline stays readable in the git history.

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
- rejected SSN: last four digits `0000`
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
| Reset | Clears the server database and every client key of the lab |

The request log under the controls shows each command, its parameters and the answer of the server. A failed request shows
a generic error in the UI, like the real flow, and the specific reason only in the log.

## Module layout

Everything is under `src/pages/SimplifiedBankOnboarding/`. The module is a tree that starts at `index.ts`. The split that
matters most is between `core/`, the generic engine that knows no flow, and `flows/`, where each flow is a configuration
for that engine. A folder imports only from the folders below it in this table, and the deeper a file sits in a folder,
the lower its level.

| Folder | Content |
| --- | --- |
| `index.ts` | The entry of the module: the screens that the navigators register and the types of the Onyx keys. The app imports nothing else |
| `lab/` | The lab page: workspace list, the other entry points, the Payments page stand-in, the reads of these pages (`labActions.ts`) and the panel of the mock server (`mockServerPanel/`) |
| `entry/` | The entry page: the account reference, the pure screen state, one view per state, the start over modal, the verify-account page, its moves (`entryNavigation.ts`) and its requests (`requests/`) |
| `flows/` | **The flow configurations.** `index.ts` is what the entry page and the app import, and `openFlowAtResume.ts` picks the flow of a workspace |
| `flows/usd/`, `flows/nonUSD/` | One flow each. The route screen, the flow descriptor and the plan builder are at the top. Below them are the answers built from the draft and the server data (`answers/`), the custom pages that are not forms (`customSteps/`) and the requests that the plan names (`requests/`, each a `PlannedRequest`). The NonUSD flow also has the bank fields and picklists that the server sends (`serverLists/`) |
| `flows/enterSignerInfo/` | The separate flow that a director opens from an email, on the same controller with its own form |
| `flows/shared/` | What more than one flow uses, so that no flow folder imports another: the screen body of the USD and NonUSD flows (`setupScreen/`), the `FlowData` type and its reads (`flowData/`), the account read of a screen and the gate of a cold deep link (`accountRead/`), the owner step (`owners/`), the signer pages (`signerDetails/`) and the draft writes |
| `core/` | **The generic engine.** `index.ts` is the only path that `flows/` and `entry/` import |
| `core/controller/` | The generic flow screen (`OnboardingFlowPage`), its hook (`useOnboardingFlow`) and the `FlowDescriptor` type |
| `core/plan/` | The shape of a plan (`types.ts`) and the pure helpers over it: positions, the resume position, reachability and the moves between positions (`position/`) |
| `core/form/pages/` | The generic renderer: one component per page kind, and the rows of a confirmation page computed from the fields of its step (`getConfirmationRows.ts`) |
| `core/form/fields/` | The fields of a form page, one file per kind: text, legal name, date of birth, picklist, checkbox, file, read-only row. A `createXField` factory returns a `Field` (`types.ts`): the inputs it owns, their rules, its rows on the confirmation of the step and how it renders. `fieldSet.ts` answers what the page, the plan and the controller ask of the fields of a page |
| `core/requests/` | `runRequest`, the key of a request status and the request status hook `useRequestState` |
| `core/navigation/` | The mapping between a position and a route (`routes.ts`) and the moves of a flow. With `entry/entryNavigation.ts` it is the only code that calls `Navigation` |
| `contract/` | The data that every folder shares: the draft type, the Onyx types, step and page IDs, request names, mock values (`contract/SBO_CONST.ts`) and pure checks on the server data (`setupStatus.ts`) |
| `mockBackend/` | The server: database, command handlers, queue |

The files outside the module only register it: Onyx keys, routes, screens, the navigator entries, one menu item, one
translation key and the Sentry labels.

## Architecture

### The URL is the position

The position of a flow is the route: `page` is the step ID, `subPage` is the page ID and `action=edit` marks a page that
the confirmation of its step opened. Nothing else stores it: no `currentStep` written by the client, no `subStep`, no
numeric index. The invited director page has one step, so its URL holds the page alone. Step and page IDs are closed
unions of the constants in `contract/SBO_CONST.ts` (`contract/ids.ts`), and a URL value that is not one of them names no position.

The plan is built in render from the draft and the server data, so it always matches the data. Skipped pages are not in
the plan. `getResumePosition` finds the first page that still needs an answer, and `isPositionReachable` rejects a URL
that names a page the plan does not have or a page after the resume position. A URL without a reachable position is
redirected to the resume position by the only effect of the controller, and the redirect waits until the data of the plan
is there.

### A form page is a list of fields

A plan describes a form page as `fields: [createTextField(INPUT_IDS.COMPANY_NAME, {label, validate})]` and nothing else.
A field is a plain object, so everything that needs to know a page reads it without rendering the page:

- `FormPage` renders the fields, validates them and submits only the values of their inputs.
- The plan counts a page as complete when the answers pass the rules of its fields, so the flow resumes on the first
  page that the user could not submit.
- A confirmation page lists no rows. Its rows are the summary rows of the fields on the form pages before it in the
  step, and each row opens the page of its field.
- After a step request the draft drops the inputs of the fields, except a field that keeps its value, such as a file.

A step or a page names its request as `request: getCompanyRequest(bankAccount, answers)`. The request module picks the
values it sends and holds its guards, so the plan has no request code. A form page works offline exactly when its submit
sends no request, so a plan never says so itself.

A new kind of field is one new file in `core/form/fields/`. Nothing else has a list of field kinds to extend.

### Every move happens in a handler

A submit runs one handler: it writes the draft and awaits the write, rebuilds the plan from what Onyx holds now, runs the
request of the page or of the step and awaits its outcome, and only then navigates. No effect watches a request flag to
move the flow on. A second submit while a handler runs is ignored. The handler navigates only if the screen still shows
the page that sent the request, so a slow request that settles after the user went back or closed the flow moves no one.

The form inputs do not save to the draft while the user types. The draft holds only submitted answers, so the plan is
not rebuilt on every keystroke, and a value that the user typed but did not submit is gone when the page closes, like
in edit mode. After a step request succeeds, the draft drops the inputs of that step (`core/plan/getStepInputIDsToClear.ts`),
so the answers come from the server again and an old draft value cannot hide a newer server value. Files and the owner
lists stay in the draft, because the server never sends them back in a form the flow can show.

Each request goes through `runRequest`. It writes `{requestID, status, errors}` to one RAM-only status key and returns a
Promise of the outcome (`succeeded`, `failed` or `skipped`). The status is written by the optimistic, success and
failure data of the request, so the Promise only tells the handler when Onyx holds the result. The real `API.write`
resolves when the request is queued, not when the server answers, so the flow needs this bridge. The request ID ties
the outcome to this very request, so an older request never settles a newer one.

A status entry is keyed by the request name and the workspace, or the bank account when there is no workspace
(`core/requests/requestKey.ts`). The writer and the reader build the key from the same bank account params, so the error or
the spinner of one workspace never shows on another, and a request of one workspace never replaces the status of
another. The key is RAM-only because the offline queue of the mock lives in memory, so a pending status kept over a
reload would never settle.

A write made offline is queued, and the page shows it as pending until the connection returns and the request settles.
Reads made offline are not sent. The button spinner and the error come from `useRequestState(key)`. Requests keep the
account `errors` that the frozen landing page shows, and write no other flags to the account key. The entry page clears
those errors when the lab closes, so an error of the flow does not stay on the Payments page.

### One generic controller

A flow is a `FlowDescriptor`: its form ID, its draft writes, its plan builder, its step names and the component of its
custom steps (`CustomStep`), which the controller renders as an element keyed by the page ID. The
controller knows nothing else about a flow, so the USD flow, the NonUSD flow and the invited director page share it.
Custom steps never navigate: they report through `onComplete` and `goToStep`.

### Dependency direction

`contract` <- `mockBackend` <- `core` <- `flows` <- `entry`, `lab` <- `index.ts`. `core` imports nothing from `flows`. `flows`
and `entry` import the engine only through `core/index.ts`, and `entry` imports the flows only through `flows/index.ts`.
Inside `flows`, a flow folder imports `shared` and never another flow. Inside `core`: `requests`, `form/fields` <- `plan`
<- `form/pages`, `navigation` <- `controller`.

`core` is not generic yet. It shares the draft type, the step and page IDs and the request names of `contract` with the
flows, so a flow with another draft needs these types to become parameters of the engine first.

### The entry page

`getEntryState` is a pure function of the account, the workspaces, the draft, the network and the route. It returns a
discriminated union (offline, loading, not found, throttled, unsupported currency, connected, pending validation,
resume setup, new setup), and the page renders one view per state with a `switch`. The page keeps no mirrored state and no navigation
refs. `getAccountRef` turns `policyID` and `bankAccountID` into one account reference, so both entries resolve the same
account. The page reads the account on every focus and on reconnect.

An option saves `setupType` to the draft and awaits the write, then opens the verify-account page or the flow at the
resume position. The verify-account page awaits the validation and replaces itself with the flow. The start over modal
opens by a direct call that passes what happens after the reset, not through a flag on the account object.

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

Judge every experiment on the same scenarios, because they are the ones where the baseline is weak:

1. Leave in the middle of each flow, open it again and continue. Check the prefill, including the owner name.
2. Fail a request of each of the three styles and submit again.
3. Go back or submit twice while a slow request of the second style is running.
4. Start over from each of the three entries, online and with a failed request.
5. Replace a connected bank account and back out of the replacement.
6. Answer "I own 25% or more" in the NonUSD flow and reach the signer step, then change the answer and reach it again.
   The baseline is expected to fail here, like the real step: the saved answer wins over the new one, so the change is
   ignored, and the signer step can skip its name page with no name to send.
7. Lose and regain the connection with the Payments page mounted under the flow.
8. Open the same bank account by `bankAccountID` and by its workspace.

### How this version handles the scenarios

These are the expected results from reading the code. None of them was walked in a browser yet.

1. **Resume.** The plan is built from the draft and the server data with one rule: a draft value that is set wins. The
   flow opens at `getResumePosition`, so no server step needs a dictionary that turns it into a page. Owners are a list
   in the draft, so the owner name is not split and joined again while the draft lives. A name read back from the server
   is still split once.
2. **Failed requests.** The three request styles are gone: every page and step awaits the outcome of its request. A
   failure keeps the user on the page with the error of the request status, and a new submit runs the request again.
3. **Double submit and back.** A running handler ignores a second submit, and the controller navigates only when the
   request it awaits succeeded and the user is still on the page that sent it. An older request cannot settle a newer
   one, because the outcome is matched by request ID.
4. **Start over.** The modal opens by a direct call with the next screen as `onReset`. A failed reset reads the account
   again, so the entry page shows what the server holds. Where the reset leads still depends on `backTo`.
5. **Change bank account.** A second instance of the entry page, marked by the route, prepares a new setup and keeps
   `backTo`. It never reads. When the user backs out, the first instance reads the account again on focus.
6. **The 25% answer.** The draft holds the new answer, and the draft wins over the server value, so the change is kept.
   The signer step takes the name of the owner when the user is a saved owner, and asks for the name otherwise, including
   when the "I own 25%" answer is still only in the draft. So it cannot skip the name page with no name to send.
7. **Reconnect with the Payments page mounted.** The entry page reads again on reconnect unless a reset is on its way.
   Requests write no `isLoading` to the account key, so the read of the Payments page and the requests of the flow do not
   share a flag. A submit made offline waits in the queue with a spinner and moves on once the request succeeds.
8. **`bankAccountID` and workspace entry.** `getAccountRef` resolves both entries to the same account reference, so the
   two entries show the same screen state. The request status is keyed by workspace, so a request still running for
   another workspace does not show here.

## Pattern catalog

Each row names a pattern of the real flow, the real file that shows it best, and where this version handles it. Paths
that start with `R/` are relative to `src/pages/ReimbursementAccount/`. "Gone" means the architecture has no place for the
pattern.

### Opening the flow and picking a screen

| Pattern | Real flow | This module |
| --- | --- | --- |
| Chain of early returns that picks the screen | `R/ReimbursementAccountPage.tsx` | `entry/getEntryState.ts` (a pure union), `entry/OnboardingEntryPage.tsx` (one view per state) |
| USD or NonUSD flow chosen by the workspace currency | `R/ReimbursementAccountPage.tsx` | `contract/getNonUSDCurrency.ts`, `entry/getEntryState.ts` |
| One account key shared by every workspace, guarded by `achData.policyID === policyID` | `R/ReimbursementAccountPage.tsx` (`isPreviousPolicy`) | `entry/getAccountRef.ts`, `flows/shared/accountRead/useAccountRead.ts`, `flows/shared/accountRead/useFlowAccountRead.ts` (the gate of a cold deep link) |
| State that mirrors derived values through effects | `R/ReimbursementAccountPage.tsx` | Gone: `entry/getEntryState.ts` derives everything in render |
| Refetch after reconnect | `R/ReimbursementAccountPage.tsx` (`fetchData(true)`) | `entry/OnboardingEntryPage.tsx` (`onReconnect`) |
| Cleanup of the shared keys on unmount | `R/ReimbursementAccountPage.tsx` | The draft of another account is cleared on focus. Only the account `errors` are cleared on unmount (`entry/OnboardingEntryPage.tsx`) |
| Redirect of a pending USD account straight to the validation step | `R/ReimbursementAccountPage.tsx` | `entry/views/PendingValidationView.tsx` renders the flow at its resume position |
| Fresh setup: Plaid or manual. Started setup: continue, change bank account, start over | `R/VerifiedBankAccountFlowEntryPoint.tsx` | `entry/views/options/NewSetupOptions.tsx`, `entry/views/options/ResumeSetupOptions.tsx` |
| Validation gate | `R/VerifiedBankAccountFlowEntryPoint.tsx`, `R/DynamicReimbursementAccountVerifyAccountPage.tsx` | the option views save the setup type first and open the flow through `entry/views/options/useOpenSetup.ts`, `entry/VerifyAccountPage.tsx` awaits the validation and replaces itself with the flow |
| Reset modal requested through a flag on the account object | `src/hooks/useResetBankAccountModal.tsx` | `entry/reset/useStartOverModal.tsx`, opened by a direct call |
| Change bank account: a second instance of the entry page marked by a route param | `src/hooks/useChangeBankAccount.ts` | `entry/entryNavigation.ts` (`goToChangeBankAccount`), `flows/shared/draft.ts` (`prepareNewBankAccountSetup`) |
| Connected account view | `R/ConnectedVerifiedBankAccount.tsx` | `entry/views/ConnectedBankAccountView.tsx` |
| `backTo` read as data | `R/VerifiedBankAccountFlowEntryPoint.tsx` (`isComingFromWorkflowsPayments`, `navigateAfterReset`) | `entry/entryNavigation.ts` (`isOpenedFromPaymentsPage`, `leaveEntryAfterReset`) |
| Entry by `bankAccountID` without a workspace | `R/ReimbursementAccountPage.tsx` (`bankAccountIDParam`, `isNonUSDSetup`) | `entry/getAccountRef.ts` |
| A page outside the flow that reads the account key and raises `isLoading` on it | `WorkflowsPaymentsTab.tsx`, `WorkspacePageWithSections.tsx` | `lab/WorkspacePaymentsPage.tsx`, `lab/labActions.ts` |

### Position and resume

| Pattern | Real flow | This module |
| --- | --- | --- |
| USD: the server keeps `currentStep`, a dictionary turns it into a page name | `R/ReimbursementAccountPage.tsx` (`stepToPageName`) | Gone: `core/plan/position/resume.ts` finds the first incomplete page of the plan |
| NonUSD: the client works out the first unfinished page | `R/NonUSD/utils/getStartPageForContinueSetup.ts` | `core/plan/position/resume.ts`, the same rule for both flows |
| `draftStep`: an effect copies the server values of a step into the draft | `R/ReimbursementAccountPage.tsx` | Gone: the `answers/` folder of each flow merges the draft and the server data in render |
| Lossy prefill: the server returns a masked account number | `achData` of a resumed setup | `flows/usd/buildUSDPlan.ts` (the numbers are locked once the account exists) |
| Lossy round trip of the owner name | `R/NonUSD/utils/getDraftValuesForBeneficialOwners.ts` | `flows/shared/owners/` (owners are a list in the draft, a name from the server is split once) |
| The client writes the server-owned `currentStep` and `subStep` | `goToWithdrawalAccountSetupStep`, `setBankAccountSubStep` | Gone: the URL is the position |
| Start page of a step computed from which values exist | `R/USD/utils/getInitialSubStepForPersonalInfo.ts` and its siblings | `isComplete` of each page in the plan builders of `flows/`, read by `core/plan/position/resume.ts` |
| Three vocabularies for one position | `CONST.BANK_ACCOUNT.STEP`, `PAGE_NAMES`, `startStepIndex` | One: step ID and page ID, `core/plan/position/position.ts`, `core/navigation/routes.ts` |
| A typed or stale URL that skips a page | not guarded | `core/plan/position/reachability.ts` |
| `goBack` as a switch on `currentStep` | `R/ReimbursementAccountPage.tsx` | `core/plan/position/transitions.ts` (`getPreviousPosition`) |

### Forms

| Pattern | Real flow | This module |
| --- | --- | --- |
| One field per sub page, saved to the draft on every change | `R/USD/Requestor/PersonalInfo/subSteps/*` | `core/form/pages/FormPage.tsx` renders the `fields` of a page of the plan and checks their rules. The draft is written on submit only |
| Confirmation page that sends the user back by numeric `onMove(index)` | `ConfirmationStep` usages | `core/form/pages/ConfirmationPage.tsx`. The rows come from the fields of the step (`core/form/pages/getConfirmationRows.ts`) and each carries the ID of the page to edit |
| Default values read in a different order by different steps | `getSubStepValues`, the business and owner sub pages | The `answers/` folder of each flow (one rule for every value) |
| Fields locked once the account passed review | `R/USD/BusinessInfo/subSteps/*` | `flows/usd/buildUSDPlan.ts` (`isLocked` of the fields) |
| Validators written inside the component | most sub pages | The rule of each field in `core/form/fields/`, given by the plan as `validate` where a page has its own |
| Fields, rules and picklists sent by the server | `R/NonUSD/BankInfo/*`, `R/NonUSD/BusinessInfo/subSteps/BusinessType.tsx` | `flows/nonUSD/serverLists/`, `flows/nonUSD/buildNonUSDPlan.ts` (`createBankField`) |
| The form key and the account key are the same Onyx string | `ONYXKEYS.REIMBURSEMENT_ACCOUNT` and `FORMS.REIMBURSEMENT_ACCOUNT_FORM` | Separate keys: `FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM` |
| File uploads kept in local state and in the draft | `R/USD/KYBDocuments`, `R/NonUSD/Docusign` | `core/form/fields/createFileField.tsx`, in local state until the page is submitted |
| A file that one step collects and a later step sends | bank statement in `R/NonUSD/Agreements`, sent by `R/NonUSD/Docusign` | `flows/nonUSD/buildNonUSDPlan.ts` (the agreements and the docusign steps) |

### Requests

| Pattern | Real flow | This module |
| --- | --- | --- |
| Style 1: shared `isLoading` and `errors` on the account, a hook moves on when the request ends | `src/hooks/useReimbursementAccountSubmitCallback.ts` | `core/requests/runRequest.ts`: the handler awaits the outcome |
| Style 2: a flag per request, the shared `isSuccess`, a ref, a `clear...` call in the cleanup of an effect | `R/NonUSD/BusinessInfo/BusinessInfo.tsx` and the other NonUSD steps | The same as style 1, with one status entry per request and workspace read by `core/requests/useRequestState.ts` |
| Style 3: send and move on without waiting | `R/USD/Requestor/VerifyIdentity/VerifyIdentity.tsx` | The same as style 1: the identity step awaits its request |
| State-driven screen: the next screen follows the account state | `R/USD/ConnectBankAccount/*` | `flows/usd/customSteps/validation/ValidationStep.tsx` |
| One action that writes the account key and the workspace key, and restores the second on a failure | `src/libs/actions/ReimbursementAccount/resetUSDBankAccount.ts` | `entry/requests/resetBankAccount.ts` |
| A key that is never persisted | `RAM_ONLY_*` keys, the Plaid link token | `RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_PLAID_LINK_TOKEN`, `flows/usd/requests/plaid.ts` |
| A step that is blocked offline | Onfido and Plaid steps | `flows/usd/customSteps/OnfidoStep.tsx`, `flows/usd/customSteps/PlaidStep.tsx` |
| Offline queue for writes, optimistic data with rollback | `API.write` | `mockBackend/mockApi.ts` (unchanged) |

### Loops, branches and the second flow

| Pattern | Real flow | This module |
| --- | --- | --- |
| Owner loop limited by a count, owners under flat draft keys | `R/USD/BeneficialOwnerInfo/*` | `flows/usd/buildUSDPlan.ts`, `flows/shared/owners/`, owners as a list in the draft edited through a buffer (`flows/shared/owners/ownerBuffer.ts`) |
| Owner loop limited by the ownership sum | `R/NonUSD/BeneficialOwnerInfo/*` | `flows/nonUSD/buildNonUSDPlan.ts`, `flows/shared/owners/canAddMoreOwners.ts` |
| A step container that renders question pages itself and nests a second `useSubPage` | both owner steps | Gone: question, list and form pages are pages of one plan step |
| Branch on "are you a director", with an email request and a waiting page | `R/NonUSD/SignerInfo/*` | `flows/nonUSD/buildNonUSDPlan.ts` (the signer step), `flows/nonUSD/customSteps/HangTightStep.tsx` |
| A step whose pages depend on the answer of another step | `R/NonUSD/SignerInfo/SignerDetailsFormPages.tsx` (`skipPages`) | `flows/nonUSD/buildNonUSDPlan.ts` builds the pages from the current answers |
| The current user as an owner, stored under a reserved owner key | `R/NonUSD/BeneficialOwnerInfo/*` (`CURRENT_USER_KEY`) | `flows/nonUSD/buildNonUSDPlan.ts`, `contract/SBO_CONST.ts` (`CURRENT_USER_KEY`) |
| A second flow with its own form key | `R/EnterSignerInfo/*` | `flows/enterSignerInfo/`: the shared controller with its own form, reusing `flows/shared/signerDetails/getSignerDetailsPages.ts` |
| A step that only some currencies get | Docusign (`R/NonUSD/utils/requiresDocusignStep.ts`) | `contract/setupStatus.ts` (`requiresDocusignStep`), `flows/nonUSD/buildNonUSDPlan.ts` |
| Third-party widgets: Plaid, Onfido, Docusign | their real SDK wrappers | Fake widgets with `[mock]` buttons in the `customSteps/` folder of each flow |
| A review that ends on the backend and reaches the client as a push | Pusher updates of `reimbursementAccount` | `mockBackend/serverEvents.ts` (`finishReview`), `flows/shared/MockReviewButtons.tsx` |

## What is simplified

- **Variants, not patterns.** Each step keeps two to four sub pages. Addresses, phone numbers, websites, incorporation
  dates and most Corpay fields are gone.
- **Change bank account has no backup key.** The real flow copies the account to a backup key and restores it when the
  user backs out. Here the first instance of the entry page fetches the account again when the focus returns to it.
- **The entry page takes no `stepToOpen` route param.**
- **The business step of the USD flow sends one request** at the end of the step. The real step saves after every sub
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

- [ ] The second flow has its own copy of every signer page in the real code. Here it reuses the signer page builders
      of the NonUSD flow, so the cost of that duplication is not visible.
- [ ] The cost of an incremental migration. The real flow has to move step by step with both architectures alive, and a
      rewrite of this module does not show that.

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
reports nothing inside the module. Neither the baseline nor this version has been walked through in a browser yet.
Walk the eight scenarios of [Rules for an experiment](#rules-for-an-experiment) on both, and write down what breaks,
because an experiment can only be compared with a baseline that was measured.

Gaps to check on the first walk:

- A flow link opened cold while offline shows the loader until the connection returns.
- The verify-account page opened by a user who is already validated shows the form.
- `core/form/pages/QuestionPage.tsx` renders `YesNoStep`, which is bound to `FORMS.REIMBURSEMENT_ACCOUNT_FORM` and ignores
  the form ID of the flow.
