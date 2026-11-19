/**
 * The requests of the global (NonUSD) flow. They mirror the Corpay actions of `libs/actions/BankAccounts`. Every write
 * takes the ID that the step created for it, and the step follows that request with `useStepRequest`.
 */
/* eslint-disable rulesdir/prefer-actions-set-data -- This file is the action layer of an isolated research module, so it lives outside src/libs/actions */
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';

import {READ_COMMANDS, WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {read, write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';
import buildTrackedRequestData from '@pages/SimplifiedBankOnboarding/requests/buildTrackedRequestData';

import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

import Onyx from 'react-native-onyx';

type GlobalBankAccountDetails = WriteCommandParams[typeof WRITE_COMMANDS.CREATE_GLOBAL_BANK_ACCOUNT];
type CompanyDetails = Omit<WriteCommandParams[typeof WRITE_COMMANDS.SAVE_ONBOARDING_COMPANY_DETAILS], keyof BankAccountParams>;
type GlobalBeneficialOwnersDetails = Omit<WriteCommandParams[typeof WRITE_COMMANDS.SAVE_ONBOARDING_BENEFICIAL_OWNERS], keyof BankAccountParams>;
type DirectorInformation = Omit<WriteCommandParams[typeof WRITE_COMMANDS.SAVE_ONBOARDING_DIRECTOR_INFORMATION], keyof BankAccountParams>;
type SignerEmails = Omit<WriteCommandParams[typeof WRITE_COMMANDS.ASK_FOR_SIGNER_INFORMATION], keyof BankAccountParams>;
type FinishDetails = Omit<WriteCommandParams[typeof WRITE_COMMANDS.FINISH_GLOBAL_BANK_ACCOUNT_ONBOARDING], keyof BankAccountParams>;

/** The Onyx data of a NonUSD request that a step waits for under its own ID */
function getTrackedRequestData(requestID: string, command: string) {
    return buildTrackedRequestData({requestID, command, errors: getMicroSecondOnyxErrorWithTranslationKey('common.genericErrorMessage')});
}

/** Asks the server which bank inputs the country needs */
function getBankAccountFields(countryISO: string, currency: string) {
    const onyxData: OnyxData<typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS> = {
        optimisticData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS, value: {isLoading: true}}],
        successData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS, value: {isLoading: false, isSuccess: true}}],
        failureData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS, value: {isLoading: false, isSuccess: false}}],
    };
    read(READ_COMMANDS.GET_BANK_ACCOUNT_FIELDS, {countryISO, currency}, onyxData);
}

/** Asks the server for the picklists of the business step */
function getOnboardingFields(countryISO: string) {
    const onyxData: OnyxData<typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PICKLISTS> = {
        optimisticData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PICKLISTS, value: {isLoading: true}}],
        finallyData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PICKLISTS, value: {isLoading: false}}],
    };
    read(READ_COMMANDS.GET_ONBOARDING_FIELDS, {countryISO}, onyxData);
}

function createGlobalBankAccount(requestID: string, details: GlobalBankAccountDetails) {
    write(WRITE_COMMANDS.CREATE_GLOBAL_BANK_ACCOUNT, details, getTrackedRequestData(requestID, WRITE_COMMANDS.CREATE_GLOBAL_BANK_ACCOUNT));
}

function saveOnboardingCompanyDetails(requestID: string, bankAccount: BankAccountParams, details: CompanyDetails) {
    write(WRITE_COMMANDS.SAVE_ONBOARDING_COMPANY_DETAILS, {...bankAccount, ...details}, getTrackedRequestData(requestID, WRITE_COMMANDS.SAVE_ONBOARDING_COMPANY_DETAILS));
}

function saveOnboardingBeneficialOwners(requestID: string, bankAccount: BankAccountParams, details: GlobalBeneficialOwnersDetails) {
    write(WRITE_COMMANDS.SAVE_ONBOARDING_BENEFICIAL_OWNERS, {...bankAccount, ...details}, getTrackedRequestData(requestID, WRITE_COMMANDS.SAVE_ONBOARDING_BENEFICIAL_OWNERS));
}

/** Saves the director. The signer step of the onboarding and the page that an invited director opens both send it. */
function saveOnboardingDirectorInformation(requestID: string, bankAccount: BankAccountParams, directorInformation: DirectorInformation) {
    write(
        WRITE_COMMANDS.SAVE_ONBOARDING_DIRECTOR_INFORMATION,
        {...bankAccount, ...directorInformation},
        getTrackedRequestData(requestID, WRITE_COMMANDS.SAVE_ONBOARDING_DIRECTOR_INFORMATION),
    );
}

/** Emails a director who is not the current user */
function askForSignerInformation(requestID: string, bankAccount: BankAccountParams, signerEmails: SignerEmails) {
    write(WRITE_COMMANDS.ASK_FOR_SIGNER_INFORMATION, {...bankAccount, ...signerEmails}, getTrackedRequestData(requestID, WRITE_COMMANDS.ASK_FOR_SIGNER_INFORMATION));
}

function sendReminderForSignerInformation(requestID: string, bankAccount: BankAccountParams) {
    write(WRITE_COMMANDS.SEND_REMINDER_FOR_SIGNER_INFORMATION, bankAccount, getTrackedRequestData(requestID, WRITE_COMMANDS.SEND_REMINDER_FOR_SIGNER_INFORMATION));
}

function finishGlobalBankAccountOnboarding(requestID: string, bankAccount: BankAccountParams, details: FinishDetails) {
    write(WRITE_COMMANDS.FINISH_GLOBAL_BANK_ACCOUNT_ONBOARDING, {...bankAccount, ...details}, getTrackedRequestData(requestID, WRITE_COMMANDS.FINISH_GLOBAL_BANK_ACCOUNT_ONBOARDING));
}

export {
    askForSignerInformation,
    createGlobalBankAccount,
    finishGlobalBankAccountOnboarding,
    getBankAccountFields,
    getOnboardingFields,
    saveOnboardingBeneficialOwners,
    saveOnboardingCompanyDetails,
    saveOnboardingDirectorInformation,
    sendReminderForSignerInformation,
};
export type {CompanyDetails, DirectorInformation, FinishDetails, GlobalBankAccountDetails, GlobalBeneficialOwnersDetails, SignerEmails};
