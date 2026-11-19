/**
 * The requests of the global (NonUSD) flow. Each request has its own in-progress flag on the account object, but all of
 * them share one `isSuccess`, so a step has to clear both when it is done. They mirror the Corpay actions of
 * `libs/actions/BankAccounts`.
 */
/* eslint-disable rulesdir/prefer-actions-set-data -- This file is the action layer of an isolated research module, so it lives outside src/libs/actions */
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';

import {READ_COMMANDS, WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {read, write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/types/onyx';

import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

import Onyx from 'react-native-onyx';

type GlobalRequestFlag =
    | 'isCreateCorpayBankAccount'
    | 'isSavingCorpayOnboardingCompanyFields'
    | 'isSavingCorpayOnboardingBeneficialOwnersFields'
    | 'isSendingReminderForCorpaySignerInformation'
    | 'isFinishingCorpayBankAccountOnboarding';

type GlobalBankAccountDetails = WriteCommandParams[typeof WRITE_COMMANDS.CREATE_GLOBAL_BANK_ACCOUNT];
type CompanyDetails = Omit<WriteCommandParams[typeof WRITE_COMMANDS.SAVE_ONBOARDING_COMPANY_DETAILS], keyof BankAccountParams>;
type GlobalBeneficialOwnersDetails = Omit<WriteCommandParams[typeof WRITE_COMMANDS.SAVE_ONBOARDING_BENEFICIAL_OWNERS], keyof BankAccountParams>;
type DirectorInformation = Omit<WriteCommandParams[typeof WRITE_COMMANDS.SAVE_ONBOARDING_DIRECTOR_INFORMATION], keyof BankAccountParams>;
type SignerEmails = Omit<WriteCommandParams[typeof WRITE_COMMANDS.ASK_FOR_SIGNER_INFORMATION], keyof BankAccountParams>;
type FinishDetails = Omit<WriteCommandParams[typeof WRITE_COMMANDS.FINISH_GLOBAL_BANK_ACCOUNT_ONBOARDING], keyof BankAccountParams>;

/** Builds the Onyx data of a request that tracks its progress with its own flag and its result with the shared `isSuccess` */
function getGlobalRequestDataForOnyx(buildRequestFlag: (isInProgress: boolean) => Pick<OnboardingAccount, GlobalRequestFlag>): OnyxData<typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT> {
    return {
        optimisticData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {...buildRequestFlag(true), errors: null}}],
        successData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {...buildRequestFlag(false), isSuccess: true}}],
        failureData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT,
                value: {...buildRequestFlag(false), isSuccess: false, errors: getMicroSecondOnyxErrorWithTranslationKey('common.genericErrorMessage')},
            },
        ],
    };
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

function createGlobalBankAccount(details: GlobalBankAccountDetails) {
    write(
        WRITE_COMMANDS.CREATE_GLOBAL_BANK_ACCOUNT,
        details,
        getGlobalRequestDataForOnyx((isCreateCorpayBankAccount) => ({isCreateCorpayBankAccount})),
    );
}

function saveOnboardingCompanyDetails(bankAccount: BankAccountParams, details: CompanyDetails) {
    write(
        WRITE_COMMANDS.SAVE_ONBOARDING_COMPANY_DETAILS,
        {...bankAccount, ...details},
        getGlobalRequestDataForOnyx((isSavingCorpayOnboardingCompanyFields) => ({isSavingCorpayOnboardingCompanyFields})),
    );
}

function saveOnboardingBeneficialOwners(bankAccount: BankAccountParams, details: GlobalBeneficialOwnersDetails) {
    write(
        WRITE_COMMANDS.SAVE_ONBOARDING_BENEFICIAL_OWNERS,
        {...bankAccount, ...details},
        getGlobalRequestDataForOnyx((isSavingCorpayOnboardingBeneficialOwnersFields) => ({isSavingCorpayOnboardingBeneficialOwnersFields})),
    );
}

/**
 * Saves the director. Two flows send this request: the signer step of the onboarding and the page that an invited
 * director opens. Each of them watches its own Onyx key, so the request writes its progress to both.
 */
function saveOnboardingDirectorInformation(bankAccount: BankAccountParams, directorInformation: DirectorInformation) {
    const onyxData: OnyxData<typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT | typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM> = {
        optimisticData: [
            {onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {isSavingCorpayOnboardingDirectorInformation: true, errors: null}},
            {onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM, value: {isSavingSignerInformation: true, errors: null}},
        ],
        successData: [
            {onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {isSavingCorpayOnboardingDirectorInformation: false, isSuccess: true}},
            {onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM, value: {isSavingSignerInformation: false, isSuccess: true}},
        ],
        failureData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT,
                value: {isSavingCorpayOnboardingDirectorInformation: false, isSuccess: false, errors: getMicroSecondOnyxErrorWithTranslationKey('common.genericErrorMessage')},
            },
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM,
                value: {isSavingSignerInformation: false, isSuccess: false, errors: getMicroSecondOnyxErrorWithTranslationKey('common.genericErrorMessage')},
            },
        ],
    };
    write(WRITE_COMMANDS.SAVE_ONBOARDING_DIRECTOR_INFORMATION, {...bankAccount, ...directorInformation}, onyxData);
}

/** Emails a director who is not the current user. Unlike the other requests it reports the result with its own success flag. */
function askForSignerInformation(bankAccount: BankAccountParams, signerEmails: SignerEmails) {
    const onyxData: OnyxData<typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT> = {
        optimisticData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {isAskingForCorpaySignerInformation: true, errors: null}}],
        successData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT,
                value: {isAskingForCorpaySignerInformation: false, isAskingForCorpaySignerInformationSuccess: true},
            },
        ],
        failureData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT,
                value: {
                    isAskingForCorpaySignerInformation: false,
                    isAskingForCorpaySignerInformationSuccess: false,
                    errors: getMicroSecondOnyxErrorWithTranslationKey('common.genericErrorMessage'),
                },
            },
        ],
    };
    write(WRITE_COMMANDS.ASK_FOR_SIGNER_INFORMATION, {...bankAccount, ...signerEmails}, onyxData);
}

function sendReminderForSignerInformation(bankAccount: BankAccountParams) {
    write(
        WRITE_COMMANDS.SEND_REMINDER_FOR_SIGNER_INFORMATION,
        bankAccount,
        getGlobalRequestDataForOnyx((isSendingReminderForCorpaySignerInformation) => ({isSendingReminderForCorpaySignerInformation})),
    );
}

function finishGlobalBankAccountOnboarding(bankAccount: BankAccountParams, details: FinishDetails) {
    write(
        WRITE_COMMANDS.FINISH_GLOBAL_BANK_ACCOUNT_ONBOARDING,
        {...bankAccount, ...details},
        getGlobalRequestDataForOnyx((isFinishingCorpayBankAccountOnboarding) => ({isFinishingCorpayBankAccountOnboarding})),
    );
}

function clearGlobalBankAccountCreation() {
    Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {isCreateCorpayBankAccount: null, isSuccess: null});
}

function clearSaveOnboardingCompanyDetails() {
    Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {isSavingCorpayOnboardingCompanyFields: null, isSuccess: null});
}

function clearSaveOnboardingBeneficialOwners() {
    Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {isSavingCorpayOnboardingBeneficialOwnersFields: null, isSuccess: null});
}

function clearSaveOnboardingDirectorInformation() {
    Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {isSavingCorpayOnboardingDirectorInformation: null, isSuccess: null});
}

function clearAskForSignerInformation() {
    Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {isAskingForCorpaySignerInformation: null, isAskingForCorpaySignerInformationSuccess: null});
}

function clearSendReminderForSignerInformation() {
    Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {isSendingReminderForCorpaySignerInformation: null, isSuccess: null});
}

function clearFinishGlobalBankAccountOnboarding() {
    Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {isFinishingCorpayBankAccountOnboarding: null, isSuccess: null});
}

function clearEnterSignerInformationFormSave() {
    Onyx.merge(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM, {isSavingSignerInformation: null, isSuccess: null});
}

export {
    askForSignerInformation,
    clearAskForSignerInformation,
    clearEnterSignerInformationFormSave,
    clearFinishGlobalBankAccountOnboarding,
    clearGlobalBankAccountCreation,
    clearSaveOnboardingBeneficialOwners,
    clearSaveOnboardingCompanyDetails,
    clearSaveOnboardingDirectorInformation,
    clearSendReminderForSignerInformation,
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
