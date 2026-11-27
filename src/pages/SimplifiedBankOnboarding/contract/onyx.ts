/**
 * Onyx value types of the simplified bank onboarding. The account type mirrors the real `reimbursementAccount`:
 * server data (`achData`), request flags and navigation flags share one object.
 */
import type * as OnyxCommon from '@src/types/onyx/OnyxCommon';

import type {ValueOf} from 'type-fest';

import type INPUT_IDS from './form';
import type SBO_CONST from './SBO_CONST';

type BankAccountState = ValueOf<typeof SBO_CONST.STATE>;
type SetupType = ValueOf<typeof SBO_CONST.SETUP_TYPE>;
type USDStep = ValueOf<typeof SBO_CONST.USD.STEP>;
type KYBDocumentType = ValueOf<typeof SBO_CONST.USD.KYB_DOCUMENT_TYPES>;

/** A beneficial owner as the USD server stores it */
type BeneficialOwner = {
    firstName: string;
    lastName: string;
    dob: string;
};

/** A beneficial owner as the global provider stores it */
type GlobalBeneficialOwner = {
    /** The owner ID that the client made. The current user has a fixed one. */
    uid: string;

    /** The first and the last name joined, so the client has to split it again to fill its two inputs */
    fullName: string;
    ownershipPercentage: string;
};

/** Data of the global (NonUSD) provider, nested under `achData.corpay` like in the real flow */
type CorpayData = {
    iban?: string;
    swiftBicCode?: string;
    bsbNumber?: string;
    accountNumber?: string;
    bankName?: string;
    accountHolderName?: string;
    accountHolderCountry?: string;
    accountHolderRegion?: string;
    companyName?: string;
    businessType?: string;

    /** Undefined until the owners step has been saved, which the resume logic relies on */
    anyIndividualOwn25PercentOrMore?: boolean;
    ownsMoreThan25Percent?: boolean;
    beneficialOwners?: GlobalBeneficialOwner[];
    signerFullName?: string;
    signerJobTitle?: string;
    signerEmail?: string;
    secondSignerEmail?: string;
    secondSignerFullName?: string;
    authorizedToBindClientToAgreement?: boolean;
    agreeToTermsAndConditions?: boolean;
    consentToPrivacyNotice?: boolean;
};

/** Server data of the bank account that is being set up */
type ACHData = {
    bankAccountID?: number;

    /** The workspace this data was fetched for. The key is shared, so pages compare it with the URL. */
    policyID?: string;

    /** Step in the server vocabulary. The client also writes it to drive navigation. */
    currentStep?: USDStep;
    subStep?: SetupType | '';
    state?: BankAccountState;
    country?: string;

    /** The currency of the bank account. The entry page falls back to it when the URL names no workspace. */
    currency?: string;

    /** Set when the bank account was created on the server */
    created?: string;
    bankName?: string;
    routingNumber?: string;

    /** The server only returns the masked number */
    accountNumber?: string;
    plaidAccountID?: string;
    firstName?: string;
    lastName?: string;
    dob?: string;
    ssnLast4?: string;
    isOnfidoSetupComplete?: boolean;
    companyName?: string;
    companyTaxID?: string;
    incorporationType?: string;

    /** Undefined until the owners step has been saved */
    ownsMoreThan25Percent?: boolean;
    beneficialOwners?: BeneficialOwner[];
    beneficialOwnerKeys?: string[];
    isAuthorizedToUseBankAccount?: boolean;
    certifyTrueInformation?: boolean;
    acceptTermsAndConditions?: boolean;

    /** Documents that the verification checks still ask for */
    requiredKYBDocuments?: KYBDocumentType[];
    corpay?: CorpayData;
};

/** The single object that holds server data, request flags and navigation flags of the onboarding */
type OnboardingAccount = {
    achData?: ACHData;

    /** Shared by every USD request and by the open-page read */
    isLoading?: boolean | null;
    errors?: OnyxCommon.Errors | null;
    errorFields?: OnyxCommon.ErrorFields | null;
    pendingAction?: OnyxCommon.PendingAction;

    /** The step that the success data of the last USD request stored */
    draftStep?: USDStep;

    /** True after three wrong tries at the test deposit amounts */
    maxAttemptsReached?: boolean;

    /** The date when the server throttled the account. The entry page shows a blocking error while it is set. */
    throttledDate?: string;

    /** Shared by every NonUSD request, so each step also checks its own ref */
    isSuccess?: boolean | null;
    isCreateCorpayBankAccount?: boolean | null;
    isSavingCorpayOnboardingCompanyFields?: boolean | null;
    isSavingCorpayOnboardingBeneficialOwnersFields?: boolean | null;
    isSavingCorpayOnboardingDirectorInformation?: boolean | null;
    isAskingForCorpaySignerInformation?: boolean | null;
    isAskingForCorpaySignerInformationSuccess?: boolean | null;
    isSendingReminderForCorpaySignerInformation?: boolean | null;
    isFinishingCorpayBankAccountOnboarding?: boolean | null;
};

/** A mock workspace. It stands in for the policy of the real flow. */
type Workspace = {
    id: string;
    name: string;
    outputCurrency: string;
    role: ValueOf<typeof SBO_CONST.WORKSPACE_ROLE>;

    /** Summary of the connected bank account, written by the same responses that update the account */
    achAccount?: {
        bankAccountID: number;
        state: BankAccountState;
    };
};

type Workspaces = Record<string, Workspace>;

/** The mock user. `validated` stands in for `account.validated` of the real flow. */
type OnboardingUser = {
    validated?: boolean;
    isLoading?: boolean;
    errors?: OnyxCommon.Errors | null;
};

type PlaidBankAccount = {
    plaidAccountID: string;
    bankName: string;
    accountNumber: string;
    routingNumber: string;
    mask: string;
};

type PlaidData = {
    bankAccounts?: PlaidBankAccount[];
};

/** The inputs that the server may ask for in the NonUSD bank step */
type BankFieldID =
    | typeof INPUT_IDS.IBAN
    | typeof INPUT_IDS.SWIFT_BIC_CODE
    | typeof INPUT_IDS.BSB_NUMBER
    | typeof INPUT_IDS.ACCOUNT_NUMBER
    | typeof INPUT_IDS.BANK_NAME
    | typeof INPUT_IDS.ACCOUNT_HOLDER_NAME
    | typeof INPUT_IDS.ACCOUNT_HOLDER_COUNTRY
    | typeof INPUT_IDS.ACCOUNT_HOLDER_REGION;

/** One input of the NonUSD bank step, described by the server */
type BankFormField = {
    id: BankFieldID;
    label: string;
    isRequired: boolean;
    validationRules: Array<{regEx: string; errorMessage: string}>;

    /** When present the input is a picklist of these values */
    valueSet?: Array<{id: string; text: string}>;
};

type BankFields = {
    bankCountry?: string;
    bankCurrency?: string;
    formFields?: BankFormField[];
};

/** Where one attempt of a request is. `requestID` tells a new attempt apart from the answer of an older one. */
type RequestState = {
    requestID: string;
    status: 'pending' | 'succeeded' | 'failed';
    errors?: OnyxCommon.Errors | null;
};

/**
 * What the data of one answer says about its attempt. The request layer reads it and then writes the status, so the
 * answer of an older attempt never becomes the status that a page shows.
 */
type RequestAnswer = {
    /** The request key of the attempt. The final update writes it, so an answer with a key is complete. */
    key?: string;

    /** Written by the success data. An answer may apply neither the success nor the failure data, and that is a failure. */
    hasSucceeded?: boolean;
};

type OnboardingRequests = {
    /** One entry per request key: the request name plus the workspace or the bank account it is about */
    byKey?: Record<string, RequestState>;

    /** One entry per requestID, until the request layer has read the answer */
    answers?: Record<string, RequestAnswer>;
};

type OnboardingPicklists = {
    picklists?: {
        businessType?: Array<{id: string; name: string}>;
    };
};

export type {
    ACHData,
    BankAccountState,
    BankFieldID,
    BankFields,
    BankFormField,
    BeneficialOwner,
    CorpayData,
    GlobalBeneficialOwner,
    KYBDocumentType,
    OnboardingAccount,
    OnboardingPicklists,
    OnboardingRequests,
    OnboardingUser,
    PlaidBankAccount,
    PlaidData,
    RequestAnswer,
    RequestState,
    SetupType,
    USDStep,
    Workspace,
    Workspaces,
};
