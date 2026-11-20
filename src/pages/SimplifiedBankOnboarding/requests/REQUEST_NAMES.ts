import type {ValueOf} from 'type-fest';

/** One name per user action. Each name is one entry of the request status key, so a page reads only its own request. */
const REQUEST_NAMES = {
    // Entry
    OPEN_ONBOARDING_PAGE: 'openOnboardingPage',
    VALIDATE_USER: 'validateUser',
    RESET_BANK_ACCOUNT: 'resetBankAccount',

    // USD
    OPEN_PLAID_BANK_LOGIN: 'openPlaidBankLogin',
    OPEN_PLAID_BANK_ACCOUNT_SELECTOR: 'openPlaidBankAccountSelector',
    CONNECT_BANK_ACCOUNT: 'connectBankAccount',
    SAVE_PERSONAL_INFO: 'savePersonalInfo',
    OPEN_IDENTITY_CHECK_FLOW: 'openIdentityCheckFlow',
    VERIFY_IDENTITY: 'verifyIdentity',
    SAVE_COMPANY: 'saveCompany',
    SAVE_OWNERS: 'saveOwners',
    ACCEPT_ACH_CONTRACT: 'acceptACHContract',
    UPLOAD_KYB_DOCUMENTS: 'uploadKYBDocuments',
    VALIDATE_BANK_ACCOUNT: 'validateBankAccount',

    // NonUSD
    GET_BANK_ACCOUNT_FIELDS: 'getBankAccountFields',
    GET_ONBOARDING_FIELDS: 'getOnboardingFields',
    CREATE_GLOBAL_BANK_ACCOUNT: 'createGlobalBankAccount',
    SAVE_GLOBAL_COMPANY: 'saveGlobalCompany',
    SAVE_GLOBAL_OWNERS: 'saveGlobalOwners',
    SAVE_DIRECTOR_INFO: 'saveDirectorInfo',
    ASK_FOR_SIGNER_INFO: 'askForSignerInfo',
    SEND_SIGNER_REMINDER: 'sendSignerReminder',
    FINISH_GLOBAL_ONBOARDING: 'finishGlobalOnboarding',

    // The page that an invited director opens
    SAVE_SIGNER_INFO: 'saveSignerInfo',
} as const;

type RequestName = ValueOf<typeof REQUEST_NAMES>;

export default REQUEST_NAMES;
export type {RequestName};
