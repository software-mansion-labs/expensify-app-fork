/**
 * Handlers of the write commands of the global (NonUSD) flow. The server keeps no step here: it only stores the fields
 * under `corpay`, and the client guesses the step to resume from the fields that are present.
 */
/* eslint-disable no-param-reassign -- The mock server keeps its database in memory and the handlers change it in place */
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {getBankFormFields} from '@pages/SimplifiedBankOnboarding/mockBackend/serverCatalog';
import type {CommandHandler} from '@pages/SimplifiedBankOnboarding/mockBackend/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {BankFormField} from '@pages/SimplifiedBankOnboarding/types/onyx';

import {
    buildAccountResponse,
    buildFailureResponse,
    buildNotFoundResponse,
    buildSuccessResponse,
    findBankAccount,
    findBankAccountInSetup,
    maskAccountNumber,
    removeBankAccount,
} from './buildResponse';
import {parseGlobalBeneficialOwners} from './parseOwners';

type NonUSDWriteCommand =
    | typeof WRITE_COMMANDS.CREATE_GLOBAL_BANK_ACCOUNT
    | typeof WRITE_COMMANDS.SAVE_ONBOARDING_COMPANY_DETAILS
    | typeof WRITE_COMMANDS.SAVE_ONBOARDING_BENEFICIAL_OWNERS
    | typeof WRITE_COMMANDS.SAVE_ONBOARDING_DIRECTOR_INFORMATION
    | typeof WRITE_COMMANDS.ASK_FOR_SIGNER_INFORMATION
    | typeof WRITE_COMMANDS.SEND_REMINDER_FOR_SIGNER_INFORMATION
    | typeof WRITE_COMMANDS.FINISH_GLOBAL_BANK_ACCOUNT_ONBOARDING
    | typeof WRITE_COMMANDS.RESET_GLOBAL_BANK_ACCOUNT;

type NonUSDWriteHandlers = {[TCommand in NonUSDWriteCommand]: CommandHandler<WriteCommandParams[TCommand]>};

const {STATE} = SBO_CONST;

function isFieldValueValid(field: BankFormField, value: string | undefined): boolean {
    if (!value) {
        return !field.isRequired;
    }
    if (field.valueSet && !field.valueSet.some((option) => option.id === value)) {
        return false;
    }
    return field.validationRules.every((rule) => new RegExp(rule.regEx).test(value));
}

const nonUSDWriteHandlers: NonUSDWriteHandlers = {
    [WRITE_COMMANDS.CREATE_GLOBAL_BANK_ACCOUNT]: ({policyID, country, currency, fields}, database) => {
        const formFields = getBankFormFields(country);
        if (!formFields || database.workspaces[policyID]?.outputCurrency !== currency) {
            return buildFailureResponse('The country or the currency is not supported');
        }
        const invalidField = formFields.find((field) => !isFieldValueValid(field, fields[field.id]));
        if (invalidField) {
            return buildFailureResponse(`Invalid value of ${invalidField.id}`);
        }
        const existingAccount = findBankAccountInSetup(database, policyID);
        if (!existingAccount) {
            database.lastBankAccountID += 1;
        }
        const unmaskedAccountNumber = fields[INPUT_IDS.IBAN] ?? fields[INPUT_IDS.ACCOUNT_NUMBER] ?? '';
        database.bankAccounts[policyID] = {
            bankAccountID: database.lastBankAccountID,
            policyID,
            state: STATE.SETUP,
            created: new Date().toISOString(),
            ...existingAccount,
            country,
            currency,
            unmaskedAccountNumber,
            corpay: {
                ...existingAccount?.corpay,
                iban: fields[INPUT_IDS.IBAN] ? maskAccountNumber(fields[INPUT_IDS.IBAN]) : undefined,
                accountNumber: fields[INPUT_IDS.ACCOUNT_NUMBER] ? maskAccountNumber(fields[INPUT_IDS.ACCOUNT_NUMBER]) : undefined,
                swiftBicCode: fields[INPUT_IDS.SWIFT_BIC_CODE],
                bsbNumber: fields[INPUT_IDS.BSB_NUMBER],
                accountHolderName: fields[INPUT_IDS.ACCOUNT_HOLDER_NAME],
                accountHolderCountry: fields[INPUT_IDS.ACCOUNT_HOLDER_COUNTRY],
                accountHolderRegion: fields[INPUT_IDS.ACCOUNT_HOLDER_REGION],
            },
        };
        return buildAccountResponse(database, policyID);
    },

    [WRITE_COMMANDS.SAVE_ONBOARDING_COMPANY_DETAILS]: ({policyID, bankAccountID, companyName, businessType}, database) => {
        const account = findBankAccount(database, {policyID, bankAccountID});
        if (!account) {
            return buildNotFoundResponse();
        }
        if (!companyName || !businessType) {
            return buildFailureResponse('The company details are incomplete');
        }
        account.corpay = {...account.corpay, companyName, businessType};
        return buildAccountResponse(database, account.policyID);
    },

    [WRITE_COMMANDS.SAVE_ONBOARDING_BENEFICIAL_OWNERS]: ({policyID, bankAccountID, ownsMoreThan25Percent, anyIndividualOwn25PercentOrMore, beneficialOwners}, database) => {
        const account = findBankAccount(database, {policyID, bankAccountID});
        if (!account) {
            return buildNotFoundResponse();
        }
        const owners = parseGlobalBeneficialOwners(beneficialOwners);
        if (!owners) {
            return buildFailureResponse('Invalid beneficial owners');
        }
        account.corpay = {...account.corpay, ownsMoreThan25Percent, anyIndividualOwn25PercentOrMore, beneficialOwners: owners};
        return buildAccountResponse(database, account.policyID);
    },

    [WRITE_COMMANDS.SAVE_ONBOARDING_DIRECTOR_INFORMATION]: ({policyID, bankAccountID, signerFullName, signerJobTitle}, database) => {
        const account = findBankAccount(database, {policyID, bankAccountID});
        if (!account) {
            return buildNotFoundResponse();
        }
        if (!signerFullName || !signerJobTitle) {
            return buildFailureResponse('The director information is incomplete');
        }
        // The first director is already known, so this answer comes from the second one who was invited by email.
        const isSecondDirector = !!account.corpay?.signerFullName && !!account.corpay.secondSignerEmail;
        account.corpay = isSecondDirector ? {...account.corpay, secondSignerFullName: signerFullName} : {...account.corpay, signerFullName, signerJobTitle};
        return buildAccountResponse(database, account.policyID);
    },

    [WRITE_COMMANDS.ASK_FOR_SIGNER_INFORMATION]: ({policyID, bankAccountID, signerEmail, secondSignerEmail}, database) => {
        const account = findBankAccount(database, {policyID, bankAccountID});
        if (!account) {
            return buildNotFoundResponse();
        }
        if (!signerEmail && !secondSignerEmail) {
            return buildFailureResponse('An email address is required');
        }
        account.corpay = {
            ...account.corpay,
            signerEmail: signerEmail ?? account.corpay?.signerEmail,
            secondSignerEmail: secondSignerEmail ?? account.corpay?.secondSignerEmail,
        };
        return buildAccountResponse(database, account.policyID);
    },

    [WRITE_COMMANDS.SEND_REMINDER_FOR_SIGNER_INFORMATION]: (params, database) => (findBankAccount(database, params) ? buildSuccessResponse() : buildNotFoundResponse()),

    [WRITE_COMMANDS.FINISH_GLOBAL_BANK_ACCOUNT_ONBOARDING]: ({policyID, bankAccountID, bankStatementName, achAuthorizationFormName, ...agreements}, database) => {
        const account = findBankAccount(database, {policyID, bankAccountID});
        if (!account) {
            return buildNotFoundResponse();
        }
        if (!agreements.authorizedToBindClientToAgreement || !agreements.agreeToTermsAndConditions || !agreements.consentToPrivacyNotice) {
            return buildFailureResponse('Every agreement has to be accepted');
        }
        if (account.country === SBO_CONST.COUNTRY.AU && !bankStatementName) {
            return buildFailureResponse('The bank statement is missing');
        }
        if (account.country === SBO_CONST.COUNTRY.AU && !achAuthorizationFormName) {
            return buildFailureResponse('The signed authorization form is missing');
        }
        account.corpay = {...account.corpay, ...agreements};
        account.bankStatementName = bankStatementName;
        account.achAuthorizationFormName = achAuthorizationFormName;
        account.state = STATE.VERIFYING;
        return buildAccountResponse(database, account.policyID);
    },

    [WRITE_COMMANDS.RESET_GLOBAL_BANK_ACCOUNT]: (params, database) => {
        const account = findBankAccount(database, params);
        if (!account) {
            return buildNotFoundResponse();
        }
        return removeBankAccount(database, account.policyID);
    },
};

export default nonUSDWriteHandlers;
export type {NonUSDWriteHandlers};
