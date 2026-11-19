/**
 * Handlers of the write commands of the USD flow. Each one changes the bank account of a workspace and moves the server
 * step forward, the same way the real backend decides which step the client opens next.
 */
/* eslint-disable no-param-reassign -- The mock server keeps its database in memory and the handlers change it in place */
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {PLAID_BANK_ACCOUNTS} from '@pages/SimplifiedBankOnboarding/mockBackend/serverCatalog';
import type {CommandHandler, MockServerDatabase, ServerBankAccount} from '@pages/SimplifiedBankOnboarding/mockBackend/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {SetupType} from '@pages/SimplifiedBankOnboarding/types/onyx';

import ONYXKEYS from '@src/ONYXKEYS';

import {
    buildAccountResponse,
    buildFailureResponse,
    buildMergeUpdate,
    buildNotFoundResponse,
    buildSuccessResponse,
    findBankAccount,
    findBankAccountInSetup,
    maskAccountNumber,
    removeBankAccount,
} from './buildResponse';
import {parseBeneficialOwners} from './parseOwners';

type USDWriteCommand =
    | typeof WRITE_COMMANDS.VALIDATE_USER
    | typeof WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_MANUALLY
    | typeof WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_WITH_PLAID
    | typeof WRITE_COMMANDS.UPDATE_PERSONAL_INFORMATION
    | typeof WRITE_COMMANDS.VERIFY_IDENTITY
    | typeof WRITE_COMMANDS.UPDATE_COMPANY_INFORMATION
    | typeof WRITE_COMMANDS.UPDATE_BENEFICIAL_OWNERS
    | typeof WRITE_COMMANDS.ACCEPT_ACH_CONTRACT
    | typeof WRITE_COMMANDS.UPLOAD_KYB_DOCUMENTS
    | typeof WRITE_COMMANDS.VALIDATE_BANK_ACCOUNT
    | typeof WRITE_COMMANDS.RESTART_BANK_ACCOUNT_SETUP;

type USDWriteHandlers = {[TCommand in USDWriteCommand]: CommandHandler<WriteCommandParams[TCommand]>};

type BankDetails = {
    bankName: string;
    routingNumber: string;
    accountNumber: string;
    plaidAccountID?: string;
};

const {STEP} = SBO_CONST.USD;
const {STATE, SETUP_TYPE, MOCK} = SBO_CONST;
const ROUTING_NUMBER_PATTERN = /^\d{9}$/;

/** Creates the bank account of a workspace, or replaces the bank details of the one that is already being set up */
function connectBankAccount(database: MockServerDatabase, policyID: string, setupType: SetupType, bankDetails: BankDetails) {
    const existingAccount = findBankAccountInSetup(database, policyID);
    if (!existingAccount) {
        database.lastBankAccountID += 1;
    }
    database.bankAccounts[policyID] = {
        bankAccountID: database.lastBankAccountID,
        policyID,
        state: STATE.SETUP,
        country: SBO_CONST.COUNTRY.US,
        currency: SBO_CONST.CURRENCY.USD,
        created: new Date().toISOString(),
        ...existingAccount,
        currentStep: STEP.REQUESTOR,
        subStep: setupType,
        bankName: bankDetails.bankName,
        routingNumber: bankDetails.routingNumber,
        accountNumber: maskAccountNumber(bankDetails.accountNumber),
        unmaskedAccountNumber: bankDetails.accountNumber,
        plaidAccountID: bankDetails.plaidAccountID,
    };
    return buildAccountResponse(database, policyID);
}

/** A Plaid account is trusted and only waits for the review. A manual one has to prove ownership with test deposits. */
function moveToValidation(account: ServerBankAccount) {
    account.currentStep = STEP.VALIDATION;
    account.state = account.subStep === SETUP_TYPE.PLAID ? STATE.VERIFYING : STATE.PENDING;
}

const usdWriteHandlers: USDWriteHandlers = {
    [WRITE_COMMANDS.VALIDATE_USER]: ({validateCode}, database) => {
        if (validateCode !== MOCK.VALID_VALIDATE_CODE) {
            return buildFailureResponse('Incorrect validate code');
        }
        database.user.validated = true;
        return buildSuccessResponse([buildMergeUpdate(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER, {validated: true})]);
    },

    [WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_MANUALLY]: ({policyID, routingNumber, accountNumber}, database) => {
        if (!ROUTING_NUMBER_PATTERN.test(routingNumber) || !accountNumber) {
            return buildFailureResponse('Invalid routing or account number');
        }
        return connectBankAccount(database, policyID, SETUP_TYPE.MANUAL, {bankName: 'Manually added bank', routingNumber, accountNumber});
    },

    [WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_WITH_PLAID]: ({policyID, plaidAccountID}, database) => {
        const plaidAccount = PLAID_BANK_ACCOUNTS.find((bankAccount) => bankAccount.plaidAccountID === plaidAccountID);
        if (!plaidAccount) {
            return buildFailureResponse('Unknown Plaid account');
        }
        return connectBankAccount(database, policyID, SETUP_TYPE.PLAID, plaidAccount);
    },

    [WRITE_COMMANDS.UPDATE_PERSONAL_INFORMATION]: ({confirm, policyID, bankAccountID, ...personalInformation}, database) => {
        const account = findBankAccount(database, {policyID, bankAccountID});
        if (!account) {
            return buildNotFoundResponse();
        }
        if (personalInformation.ssnLast4 === MOCK.REJECTED_SSN_LAST_4) {
            return buildFailureResponse('The SSN did not pass the identity check');
        }
        Object.assign(account, personalInformation);
        if (confirm) {
            account.currentStep = account.isOnfidoSetupComplete ? STEP.COMPANY : STEP.REQUESTOR;
        }
        return buildAccountResponse(database, account.policyID);
    },

    [WRITE_COMMANDS.VERIFY_IDENTITY]: ({policyID, bankAccountID, onfidoData}, database) => {
        const account = findBankAccount(database, {policyID, bankAccountID});
        if (!account) {
            return buildNotFoundResponse();
        }
        if (!onfidoData) {
            return buildFailureResponse('The identity check returned no data');
        }
        account.isOnfidoSetupComplete = true;
        account.currentStep = STEP.COMPANY;
        return buildAccountResponse(database, account.policyID);
    },

    [WRITE_COMMANDS.UPDATE_COMPANY_INFORMATION]: ({policyID, bankAccountID, ...companyInformation}, database) => {
        const account = findBankAccount(database, {policyID, bankAccountID});
        if (!account) {
            return buildNotFoundResponse();
        }
        if (companyInformation.companyTaxID === MOCK.REJECTED_TAX_ID) {
            return buildFailureResponse('The tax ID did not pass the company check');
        }
        Object.assign(account, companyInformation);
        account.currentStep = STEP.BENEFICIAL_OWNERS;
        return buildAccountResponse(database, account.policyID);
    },

    [WRITE_COMMANDS.UPDATE_BENEFICIAL_OWNERS]: ({policyID, bankAccountID, ownsMoreThan25Percent, beneficialOwners, beneficialOwnerKeys}, database) => {
        const account = findBankAccount(database, {policyID, bankAccountID});
        if (!account) {
            return buildNotFoundResponse();
        }
        const owners = parseBeneficialOwners(beneficialOwners);
        if (!owners || owners.length > SBO_CONST.USD.MAX_NUMBER_OF_UBOS) {
            return buildFailureResponse('Invalid beneficial owners');
        }
        account.ownsMoreThan25Percent = ownsMoreThan25Percent;
        account.beneficialOwners = owners;
        account.beneficialOwnerKeys = beneficialOwnerKeys;
        account.currentStep = STEP.ACH_CONTRACT;
        return buildAccountResponse(database, account.policyID);
    },

    [WRITE_COMMANDS.ACCEPT_ACH_CONTRACT]: ({policyID, bankAccountID, ...agreements}, database) => {
        const account = findBankAccount(database, {policyID, bankAccountID});
        if (!account) {
            return buildNotFoundResponse();
        }
        if (!agreements.isAuthorizedToUseBankAccount || !agreements.certifyTrueInformation || !agreements.acceptTermsAndConditions) {
            return buildFailureResponse('Every agreement has to be accepted');
        }
        Object.assign(account, agreements);
        const needsDocuments = database.settings.shouldRequireKYBDocuments && !account.uploadedKYBDocuments?.length;
        if (needsDocuments) {
            account.requiredKYBDocuments = Object.values(SBO_CONST.USD.KYB_DOCUMENT_TYPES);
            account.currentStep = STEP.KYB_DOCS;
        } else {
            moveToValidation(account);
        }
        return buildAccountResponse(database, account.policyID);
    },

    [WRITE_COMMANDS.UPLOAD_KYB_DOCUMENTS]: ({policyID, bankAccountID, documentNames}, database) => {
        const account = findBankAccount(database, {policyID, bankAccountID});
        if (!account) {
            return buildNotFoundResponse();
        }
        if (documentNames.length < (account.requiredKYBDocuments?.length ?? 0)) {
            return buildFailureResponse('A required document is missing');
        }
        account.uploadedKYBDocuments = documentNames;
        account.requiredKYBDocuments = [];
        moveToValidation(account);
        return buildAccountResponse(database, account.policyID);
    },

    [WRITE_COMMANDS.VALIDATE_BANK_ACCOUNT]: ({policyID, bankAccountID, validateCode}, database) => {
        const account = findBankAccount(database, {policyID, bankAccountID});
        if (!account) {
            return buildNotFoundResponse();
        }
        if (account.state !== STATE.PENDING) {
            return buildFailureResponse('The bank account does not wait for validation');
        }
        if (validateCode !== MOCK.MICRO_DEPOSIT_AMOUNTS.join(',')) {
            account.validationAttempts = (account.validationAttempts ?? 0) + 1;
            const maxAttemptsReached = account.validationAttempts >= SBO_CONST.MAX_VALIDATION_ATTEMPTS;
            return buildFailureResponse('The amounts do not match', MOCK.JSON_CODE.BAD_REQUEST, [buildMergeUpdate(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {maxAttemptsReached})]);
        }
        account.state = STATE.OPEN;
        account.currentStep = STEP.ENABLE;
        return buildAccountResponse(database, account.policyID);
    },

    [WRITE_COMMANDS.RESTART_BANK_ACCOUNT_SETUP]: (params, database) => {
        const account = findBankAccount(database, params);
        if (!account) {
            return buildNotFoundResponse();
        }
        return removeBankAccount(database, account.policyID);
    },
};

export default usdWriteHandlers;
export type {USDWriteHandlers};
