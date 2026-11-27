/**
 * Constants of the simplified bank onboarding module. STEP is the step that the server stores and PAGE_NAMES is the step
 * that the URL holds. The header counter comes from the step list of each flow, not from a constant.
 */
const USD_PAGE_NAMES = {
    COUNTRY: 'country',
    BANK_ACCOUNT: 'bank-account',
    REQUESTOR: 'personal-info',
    VERIFY_IDENTITY: 'verify-identity',
    COMPANY: 'business-info',
    BENEFICIAL_OWNERS: 'beneficial-owners',
    ACH_CONTRACT: 'complete-verification',
    KYB_DOCS: 'kyb-documents',
    VALIDATION: 'validation',
} as const;

const NON_USD_PAGE_NAMES = {
    COUNTRY: 'country',
    BANK_INFO: 'bank-info',
    BUSINESS_INFO: 'business-info',
    BENEFICIAL_OWNER_INFO: 'beneficial-owner-info',
    SIGNER_INFO: 'signer-info',
    AGREEMENTS: 'agreements',
    DOCUSIGN: 'docusign',
    FINISH: 'finish',
} as const;

const SBO_CONST = {
    CURRENCY: {
        USD: 'USD',
        EUR: 'EUR',
        AUD: 'AUD',
    },
    SUPPORTED_CURRENCIES: ['USD', 'EUR', 'AUD'],
    COUNTRY: {
        US: 'US',
        AU: 'AU',
        DE: 'DE',
        FR: 'FR',
        ES: 'ES',
    },
    EUR_COUNTRIES: ['DE', 'FR', 'ES'],
    COUNTRY_NAMES: {
        US: 'United States',
        AU: 'Australia',
        DE: 'Germany',
        FR: 'France',
        ES: 'Spain',
    },
    SETUP_TYPE: {
        MANUAL: 'manual',
        PLAID: 'plaid',
    },
    STATE: {
        SETUP: 'SETUP',
        VERIFYING: 'VERIFYING',
        PENDING: 'PENDING',
        OPEN: 'OPEN',
    },
    WORKSPACE_ROLE: {
        ADMIN: 'admin',
        USER: 'user',
    },
    MAX_VALIDATION_ATTEMPTS: 3,
    USD: {
        STEP: {
            COUNTRY: 'CountryStep',
            BANK_ACCOUNT: 'BankAccountStep',
            REQUESTOR: 'RequestorStep',
            COMPANY: 'CompanyStep',
            BENEFICIAL_OWNERS: 'BeneficialOwnersStep',
            ACH_CONTRACT: 'ACHContractStep',
            KYB_DOCS: 'KYBDocsStep',
            VALIDATION: 'ValidationStep',
            ENABLE: 'EnableStep',
        },
        PAGE_NAMES: USD_PAGE_NAMES,
        MAX_NUMBER_OF_UBOS: 3,
        INCORPORATION_TYPES: {
            LLC: 'LLC',
            CORPORATION: 'Corporation',
            PARTNERSHIP: 'Partnership',
        },
        KYB_DOCUMENT_TYPES: {
            COMPANY_TAX_ID: 'companyTaxID',
            COMPANY_ADDRESS: 'companyAddress',
        },
    },
    NON_USD: {
        STEP: {
            COUNTRY: 'CountryStep',
            BANK_INFO: 'BankInfoStep',
            BUSINESS_INFO: 'BusinessInfoStep',
            BENEFICIAL_OWNER_INFO: 'BeneficialOwnerInfoStep',
            SIGNER_INFO: 'SignerInfoStep',
            AGREEMENTS: 'AgreementsStep',
            DOCUSIGN: 'DocusignStep',
            FINISH: 'FinishStep',
        },
        PAGE_NAMES: NON_USD_PAGE_NAMES,
        ACCOUNT_HOLDER_KEY_PREFIX: 'accountHolder',

        /** The owner ID of the current user. Every other owner gets a generated one. */
        CURRENT_USER_KEY: 'currentUser',
        MAX_OWNERSHIP_SUM_TO_ADD_MORE: 75,

        /** The bank statement and the signed authorization form are one file each */
        DOCUMENT_FILE_LIMIT: 1,
    },
    SSN_LAST_4_LENGTH: 4,
    MOCK: {
        LATENCY_OPTIONS_MS: [0, 600, 2500],
        DEFAULT_LATENCY_MS: 600,
        FAILURE_MODE: {
            NONE: 'none',
            NEXT_WRITE: 'nextWrite',
            ALL_REQUESTS: 'allRequests',
        },
        REVIEW_OUTCOME: {
            OPEN: 'open',
            MICRO_DEPOSITS: 'microDeposits',
        },
        VALID_VALIDATE_CODE: '123456',
        MICRO_DEPOSIT_AMOUNTS: ['0.01', '0.02', '0.03'],
        REJECTED_SSN_LAST_4: '0000',
        REJECTED_TAX_ID: '000000000',
        JSON_CODE: {
            SUCCESS: 200,
            BAD_REQUEST: 400,
            NOT_FOUND: 404,
            SERVER_ERROR: 500,
        },
    },
} as const;

export default SBO_CONST;
