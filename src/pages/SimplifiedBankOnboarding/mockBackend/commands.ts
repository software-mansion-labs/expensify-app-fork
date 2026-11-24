/**
 * The commands that the mock backend understands and the parameters of each one.
 * They stand in for `WRITE_COMMANDS`, `READ_COMMANDS` and the parameter types of the real API layer.
 */
import type {SetupType, USDStep} from '@pages/SimplifiedBankOnboarding/contract/onyx';

const READ_COMMANDS = {
    OPEN_LANDING_PAGE: 'OpenLandingPage',
    OPEN_ONBOARDING_PAGE: 'OpenOnboardingPage',
    OPEN_PLAID_BANK_LOGIN: 'OpenPlaidBankLogin',
    OPEN_PLAID_BANK_ACCOUNT_SELECTOR: 'OpenPlaidBankAccountSelector',
    OPEN_IDENTITY_CHECK_FLOW: 'OpenIdentityCheckFlow',
    GET_BANK_ACCOUNT_FIELDS: 'GetBankAccountFields',
    GET_ONBOARDING_FIELDS: 'GetOnboardingFields',
} as const;

const WRITE_COMMANDS = {
    VALIDATE_USER: 'ValidateUser',
    CONNECT_BANK_ACCOUNT_MANUALLY: 'ConnectBankAccountManually',
    CONNECT_BANK_ACCOUNT_WITH_PLAID: 'ConnectBankAccountWithPlaid',
    UPDATE_PERSONAL_INFORMATION: 'UpdatePersonalInformationForBankAccount',
    VERIFY_IDENTITY: 'VerifyIdentityForBankAccount',
    UPDATE_COMPANY_INFORMATION: 'UpdateCompanyInformationForBankAccount',
    UPDATE_BENEFICIAL_OWNERS: 'UpdateBeneficialOwnersForBankAccount',
    ACCEPT_ACH_CONTRACT: 'AcceptACHContractForBankAccount',
    UPLOAD_KYB_DOCUMENTS: 'UploadKYBDocuments',
    VALIDATE_BANK_ACCOUNT: 'ValidateBankAccountWithTransactions',
    RESTART_BANK_ACCOUNT_SETUP: 'RestartBankAccountSetup',
    CREATE_GLOBAL_BANK_ACCOUNT: 'CreateGlobalBankAccount',
    SAVE_ONBOARDING_COMPANY_DETAILS: 'SaveOnboardingCompanyDetails',
    SAVE_ONBOARDING_BENEFICIAL_OWNERS: 'SaveOnboardingBeneficialOwners',
    SAVE_ONBOARDING_DIRECTOR_INFORMATION: 'SaveOnboardingDirectorInformation',
    ASK_FOR_SIGNER_INFORMATION: 'AskForSignerInformation',
    SEND_REMINDER_FOR_SIGNER_INFORMATION: 'SendReminderForSignerInformation',
    FINISH_GLOBAL_BANK_ACCOUNT_ONBOARDING: 'FinishGlobalBankAccountOnboarding',
    RESET_GLOBAL_BANK_ACCOUNT: 'ResetGlobalBankAccount',
} as const;

type BankAccountParams = {
    /** Missing when the flow was opened by the bank account ID. The server then finds the account by that ID alone. */
    policyID: string | undefined;
    bankAccountID: number;
};

type ReadCommandParams = {
    [READ_COMMANDS.OPEN_LANDING_PAGE]: Record<string, never>;
    [READ_COMMANDS.OPEN_ONBOARDING_PAGE]: {
        /** The page names the workspace or the bank account, like `OpenReimbursementAccountPage` */
        policyID?: string;
        bankAccountID?: number;
        stepToOpen: USDStep | '';
        subStep: SetupType | '';
        localCurrentStep: USDStep | '';
    };
    [READ_COMMANDS.OPEN_PLAID_BANK_LOGIN]: Record<string, never>;
    [READ_COMMANDS.OPEN_PLAID_BANK_ACCOUNT_SELECTOR]: {publicToken: string};
    [READ_COMMANDS.OPEN_IDENTITY_CHECK_FLOW]: {policyID: string};
    [READ_COMMANDS.GET_BANK_ACCOUNT_FIELDS]: {countryISO: string; currency: string};
    [READ_COMMANDS.GET_ONBOARDING_FIELDS]: {countryISO: string};
};

type WriteCommandParams = {
    [WRITE_COMMANDS.VALIDATE_USER]: {validateCode: string};
    [WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_MANUALLY]: {policyID: string; routingNumber: string; accountNumber: string};
    [WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_WITH_PLAID]: {policyID: string; plaidAccountID: string};
    [WRITE_COMMANDS.UPDATE_PERSONAL_INFORMATION]: BankAccountParams & {
        firstName?: string;
        lastName?: string;
        dob?: string;
        ssnLast4?: string;

        /** Only the confirmation page asks the server to move to the next step */
        confirm: boolean;
    };
    [WRITE_COMMANDS.VERIFY_IDENTITY]: BankAccountParams & {onfidoData: string};
    [WRITE_COMMANDS.UPDATE_COMPANY_INFORMATION]: BankAccountParams & {companyName: string; companyTaxID: string; incorporationType: string};
    [WRITE_COMMANDS.UPDATE_BENEFICIAL_OWNERS]: BankAccountParams & {
        ownsMoreThan25Percent: boolean;

        /** A JSON string, the same way the real flow sends the owners */
        beneficialOwners: string;
        beneficialOwnerKeys: string[];
    };
    [WRITE_COMMANDS.ACCEPT_ACH_CONTRACT]: BankAccountParams & {
        isAuthorizedToUseBankAccount: boolean;
        certifyTrueInformation: boolean;
        acceptTermsAndConditions: boolean;
    };
    [WRITE_COMMANDS.UPLOAD_KYB_DOCUMENTS]: BankAccountParams & {documentNames: string[]};
    [WRITE_COMMANDS.VALIDATE_BANK_ACCOUNT]: BankAccountParams & {validateCode: string};
    [WRITE_COMMANDS.RESTART_BANK_ACCOUNT_SETUP]: BankAccountParams;
    [WRITE_COMMANDS.CREATE_GLOBAL_BANK_ACCOUNT]: {
        policyID: string;
        country: string;
        currency: string;

        /** The values of the inputs that the server described, keyed by field ID */
        fields: Record<string, string>;
    };
    [WRITE_COMMANDS.SAVE_ONBOARDING_COMPANY_DETAILS]: BankAccountParams & {companyName: string; businessType: string};
    [WRITE_COMMANDS.SAVE_ONBOARDING_BENEFICIAL_OWNERS]: BankAccountParams & {
        ownsMoreThan25Percent: boolean;
        anyIndividualOwn25PercentOrMore: boolean;
        beneficialOwners: string;
    };
    [WRITE_COMMANDS.SAVE_ONBOARDING_DIRECTOR_INFORMATION]: BankAccountParams & {signerFullName: string; signerJobTitle: string};
    [WRITE_COMMANDS.ASK_FOR_SIGNER_INFORMATION]: BankAccountParams & {signerEmail?: string; secondSignerEmail?: string};
    [WRITE_COMMANDS.SEND_REMINDER_FOR_SIGNER_INFORMATION]: BankAccountParams;
    [WRITE_COMMANDS.FINISH_GLOBAL_BANK_ACCOUNT_ONBOARDING]: BankAccountParams & {
        authorizedToBindClientToAgreement: boolean;
        agreeToTermsAndConditions: boolean;
        consentToPrivacyNotice: boolean;
        bankStatementName?: string;
        achAuthorizationFormName?: string;
    };
    [WRITE_COMMANDS.RESET_GLOBAL_BANK_ACCOUNT]: BankAccountParams;
};

type ReadCommand = keyof ReadCommandParams;
type WriteCommand = keyof WriteCommandParams;

export {READ_COMMANDS, WRITE_COMMANDS};
export type {BankAccountParams, ReadCommand, ReadCommandParams, WriteCommand, WriteCommandParams};
