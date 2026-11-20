/**
 * Constants of the simplified bank onboarding module.
 * STEP is what the USD server stores and PAGE_NAMES is what the URL holds. The order of the steps and the step counter of
 * the header come from the flow definitions in `flow/`.
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

    /** The states of a request that a step tracks by its ID */
    REQUEST_STATUS: {
        PENDING: 'pending',
        SUCCEEDED: 'succeeded',
        FAILED: 'failed',
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
        BANK_INFO_SUB_PAGES: {
            MANUAL: 'manual',
            PLAID: 'plaid',
        },
        PERSONAL_INFO_SUB_PAGES: {
            FULL_NAME: 'full-name',
            DATE_OF_BIRTH: 'date-of-birth',
            SSN: 'ssn',
            CONFIRMATION: 'confirmation',
        },
        BUSINESS_INFO_SUB_PAGES: {
            NAME: 'name',
            TAX_ID: 'tax-id',
            INCORPORATION_TYPE: 'incorporation-type',
            CONFIRMATION: 'confirmation',
        },
        BENEFICIAL_OWNERS_SUB_PAGES: {
            IS_USER_UBO: 'is-user-ubo',
            IS_ANYONE_ELSE_UBO: 'is-anyone-else-ubo',
            LEGAL_NAME: 'legal-name',
            DATE_OF_BIRTH: 'date-of-birth',
            CONFIRMATION: 'confirmation',
            ARE_THERE_MORE_UBOS: 'are-there-more-ubos',
            UBOS_LIST: 'ubos-list',
        },
        COMPLETE_VERIFICATION_SUB_PAGES: {
            CONFIRM_AGREEMENTS: 'confirm-agreements',
        },

        /** Positions of the sub pages, which the confirmation pages use to send the user back to one of them */
        SUBSTEP_INDEX: {
            PERSONAL_INFO: {
                LEGAL_NAME: 0,
                DATE_OF_BIRTH: 1,
                SSN: 2,
            },
            BUSINESS_INFO: {
                NAME: 0,
                TAX_ID: 1,
                INCORPORATION_TYPE: 2,
            },
            UBO: {
                IS_USER_UBO: 0,
                IS_ANYONE_ELSE_UBO: 1,
                LEGAL_NAME: 2,
                DATE_OF_BIRTH: 3,
                CONFIRMATION: 4,
                ARE_THERE_MORE_UBOS: 5,
                UBOS_LIST: 6,
            },
        },
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
        PAGE_NAMES: NON_USD_PAGE_NAMES,
        ACCOUNT_HOLDER_KEY_PREFIX: 'accountHolder',

        /** The owner ID of the current user. Every other owner gets a generated one. */
        CURRENT_USER_KEY: 'currentUser',
        MIN_OWNERSHIP_PERCENTAGE: 25,
        MAX_OWNERSHIP_SUM_TO_ADD_MORE: 75,
        BANK_INFO_SUB_PAGES: {
            BANK_ACCOUNT_DETAILS: 'bank-account-details',
            ACCOUNT_HOLDER_DETAILS: 'account-holder-details',
            CONFIRMATION: 'confirmation',
        },
        BUSINESS_INFO_SUB_PAGES: {
            NAME: 'name',
            BUSINESS_TYPE: 'business-type',
            CONFIRMATION: 'confirmation',
        },
        BENEFICIAL_OWNER_INFO_SUB_PAGES: {
            IS_USER_BENEFICIAL_OWNER: 'is-user-beneficial-owner',
            IS_ANYONE_ELSE_BENEFICIAL_OWNER: 'is-anyone-else-beneficial-owner',
            NAME: 'name',
            OWNERSHIP_PERCENTAGE: 'ownership-percentage',
            CONFIRMATION: 'confirmation',
            ARE_THERE_MORE_BENEFICIAL_OWNERS: 'are-there-more-beneficial-owners',
            BENEFICIAL_OWNERS_LIST: 'beneficial-owners-list',
        },
        SIGNER_INFO_SUB_PAGES: {
            IS_DIRECTOR: 'is-director',
            NAME: 'name',
            JOB_TITLE: 'job-title',
            CONFIRMATION: 'confirmation',
            ENTER_EMAIL: 'enter-email',
            HANG_TIGHT: 'hang-tight',
        },
        SUBSTEP_INDEX: {
            BANK_INFO: {
                BANK_ACCOUNT_DETAILS: 0,
                ACCOUNT_HOLDER_DETAILS: 1,
            },
            BUSINESS_INFO: {
                NAME: 0,
                BUSINESS_TYPE: 1,
            },
            BENEFICIAL_OWNER_INFO: {
                IS_USER_BENEFICIAL_OWNER: 0,
                IS_ANYONE_ELSE_BENEFICIAL_OWNER: 1,
                NAME: 2,
                OWNERSHIP_PERCENTAGE: 3,
                CONFIRMATION: 4,
                ARE_THERE_MORE_BENEFICIAL_OWNERS: 5,
                BENEFICIAL_OWNERS_LIST: 6,
            },
            SIGNER_INFO: {
                IS_DIRECTOR: 0,
                NAME: 1,
                JOB_TITLE: 2,
                CONFIRMATION: 3,
                ENTER_EMAIL: 4,
                HANG_TIGHT: 5,
            },
        },
    },
    ENTER_SIGNER_INFO_SUB_PAGES: {
        NAME: 'name',
        JOB_TITLE: 'job-title',
        CONFIRMATION: 'confirmation',
    },
    ENTER_SIGNER_INFO_SUBSTEP_INDEX: {
        NAME: 0,
        JOB_TITLE: 1,
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
