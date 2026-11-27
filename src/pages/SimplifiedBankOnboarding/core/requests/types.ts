import type {FlowData} from '@pages/SimplifiedBankOnboarding/core/flow/flowData';
import type {ReadCommand, ReadCommandParams, WriteCommand, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import type {TranslationPaths} from '@src/languages/types';
import type ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

/** One command of the mock server with the params of that command, matched per command so the call site needs no `as` */
type MockRequest =
    | {[TCommand in ReadCommand]: {type: 'read'; command: TCommand; params: ReadCommandParams[TCommand]}}[ReadCommand]
    | {[TCommand in WriteCommand]: {type: 'write'; command: TCommand; params: WriteCommandParams[TCommand]}}[WriteCommand];

/**
 * The Onyx keys that a request of the lab may update. A closed union, so the status updates join the data of the caller
 * without `as`. It includes the signer form draft, which the invited director request clears in its success data.
 */
type RequestOnyxKey =
    | typeof ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT
    | typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT
    | typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM_DRAFT
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA
    | typeof ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_PLAID_LINK_TOKEN
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PICKLISTS
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_OPTION_PRESSED;

/** One command with its params and the Onyx data of the command itself */
type RequestSpec = MockRequest & {
    onyxData?: OnyxData<RequestOnyxKey>;

    /** The message of a failure. Default: 'common.genericErrorMessage'. */
    errorKey?: TranslationPaths;

    /**
     * Whether a failure is also written to `account.errors` (with `errors: null` when the request starts). The Payments
     * page and the entry page read errors there. Default: true for a write sent from the USD or NonUSD flow, false
     * otherwise. The mirror lives exactly as long as the page error of the attempt that wrote it: it is cleared when a
     * new attempt starts, by any Back press of the step shell, and when the last component that uses the request
     * unmounts, but only while `account.errors` still holds the error of that request. A failure that arrives after its
     * owner unmounted is cleared as soon as it arrives.
     */
    shouldShowErrorOutsideFlow?: boolean;
};

/**
 * The name of a request: a string literal `<flow>.<step>.<action>` written in the file that defines the request, for
 * example 'usd.personalInfo.confirm'. Requests of the entry, the lab and the shared account read use
 * `entry.<page>.<action>`, `lab.<page>.<action>` and `core.account.open`. Uniqueness is a review rule.
 */
type RequestName = `${string}.${string}.${string}`;

/** The bank account that a request is about. A request about no bank account, such as the validate code, has no scope. */
type RequestScope = {
    policyID?: string;
    bankAccountID?: number;
};

/**
 * What a page sends. The name says which user action it is, and it is the start of the request key. `build` says what
 * is sent, from the data that Onyx holds at the send (a read on open uses the data of the last render). Blocks save
 * the draft first, so `data.draft` has the submitted values. It returns undefined when the request cannot be built (for
 * example no policyID). The attempt then counts as failed with the generic error, and nothing is sent.
 */
type OnboardingRequest<TInput = void> = {
    name: RequestName;
    build: (data: FlowData, input: TInput) => RequestSpec | undefined;
};

/**
 * `skipped`: nothing was sent (a read made offline, a second send while one is pending) or a newer attempt replaced it.
 * `failed` carries no reason: the mock API keeps the jsonCode on the server side.
 */
type RequestOutcome = {status: 'succeeded'} | {status: 'failed'} | {status: 'skipped'};

export type {MockRequest, OnboardingRequest, RequestName, RequestOnyxKey, RequestOutcome, RequestScope, RequestSpec};
