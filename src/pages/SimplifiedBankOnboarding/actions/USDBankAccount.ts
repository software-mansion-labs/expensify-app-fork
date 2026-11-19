/**
 * The requests of the USD flow. Every one of them shares the same `isLoading` and `errors` of the account object, and the
 * steps wait for the answer with `useOnboardingSubmitCallback`. They mirror the VBBA actions of `libs/actions/BankAccounts`.
 */
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';

import {READ_COMMANDS, WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {read, write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {USDStep} from '@pages/SimplifiedBankOnboarding/types/onyx';

import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

import type {OnyxUpdate} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

type USDOnyxKey =
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT
    | typeof ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_PLAID_LINK_TOKEN
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN;

type PersonalInformation = Omit<WriteCommandParams[typeof WRITE_COMMANDS.UPDATE_PERSONAL_INFORMATION], keyof BankAccountParams | 'confirm'>;
type CompanyInformation = Omit<WriteCommandParams[typeof WRITE_COMMANDS.UPDATE_COMPANY_INFORMATION], keyof BankAccountParams>;
type BeneficialOwnersInformation = Omit<WriteCommandParams[typeof WRITE_COMMANDS.UPDATE_BENEFICIAL_OWNERS], keyof BankAccountParams>;
type ACHContractInformation = Omit<WriteCommandParams[typeof WRITE_COMMANDS.ACCEPT_ACH_CONTRACT], keyof BankAccountParams>;

const {STEP} = SBO_CONST.USD;

/**
 * Builds the Onyx data that every USD request shares. On success it stores the step in `draftStep`, which tells the entry
 * page to copy the values that the server saved for that step into the draft.
 */
function getOnboardingDataForOnyx(currentStep?: USDStep, shouldShowLoading = true): OnyxData<USDOnyxKey> {
    const failureData: Array<OnyxUpdate<USDOnyxKey>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT,
            value: {isLoading: false, errors: getMicroSecondOnyxErrorWithTranslationKey('walletPage.addBankAccountFailure')},
        },
        {onyxMethod: Onyx.METHOD.SET, key: ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_PLAID_LINK_TOKEN, value: null},
    ];

    // The requestor step keeps its token, because a failed save there does not restart the identity check.
    if (currentStep !== STEP.REQUESTOR) {
        failureData.push({onyxMethod: Onyx.METHOD.SET, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN, value: null});
    }

    return {
        optimisticData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {isLoading: shouldShowLoading, errors: null}}],
        successData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {isLoading: false, errors: null, draftStep: currentStep}}],
        failureData,
    };
}

function connectBankAccountManually(policyID: string, routingNumber: string, accountNumber: string) {
    write(WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_MANUALLY, {policyID, routingNumber, accountNumber}, getOnboardingDataForOnyx(STEP.BANK_ACCOUNT));
}

function connectBankAccountWithPlaid(policyID: string, plaidAccountID: string) {
    write(WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_WITH_PLAID, {policyID, plaidAccountID}, getOnboardingDataForOnyx(STEP.BANK_ACCOUNT));
}

/** Saves the personal information. Only the confirmation page shows the loader and asks the server to move to the next step. */
function updatePersonalInformation(bankAccount: BankAccountParams, personalInformation: PersonalInformation, isConfirmPage: boolean) {
    write(WRITE_COMMANDS.UPDATE_PERSONAL_INFORMATION, {...bankAccount, ...personalInformation, confirm: isConfirmPage}, getOnboardingDataForOnyx(STEP.REQUESTOR, isConfirmPage));
}

function openIdentityCheckFlow(policyID: string) {
    read(READ_COMMANDS.OPEN_IDENTITY_CHECK_FLOW, {policyID});
}

function verifyIdentity(bankAccount: BankAccountParams, onfidoData: string) {
    write(WRITE_COMMANDS.VERIFY_IDENTITY, {...bankAccount, onfidoData}, getOnboardingDataForOnyx());
}

function updateCompanyInformation(bankAccount: BankAccountParams, companyInformation: CompanyInformation) {
    write(WRITE_COMMANDS.UPDATE_COMPANY_INFORMATION, {...bankAccount, ...companyInformation}, getOnboardingDataForOnyx(STEP.COMPANY));
}

function updateBeneficialOwners(bankAccount: BankAccountParams, beneficialOwnersInformation: BeneficialOwnersInformation) {
    write(WRITE_COMMANDS.UPDATE_BENEFICIAL_OWNERS, {...bankAccount, ...beneficialOwnersInformation}, getOnboardingDataForOnyx());
}

function acceptACHContract(bankAccount: BankAccountParams, contractInformation: ACHContractInformation) {
    write(WRITE_COMMANDS.ACCEPT_ACH_CONTRACT, {...bankAccount, ...contractInformation}, getOnboardingDataForOnyx());
}

function uploadKYBDocuments(bankAccount: BankAccountParams, documentNames: string[]) {
    write(WRITE_COMMANDS.UPLOAD_KYB_DOCUMENTS, {...bankAccount, documentNames}, getOnboardingDataForOnyx());
}

/** Sends the three test deposit amounts joined into one code, the way the real flow does */
function validateBankAccount(bankAccount: BankAccountParams, amounts: string[]) {
    write(WRITE_COMMANDS.VALIDATE_BANK_ACCOUNT, {...bankAccount, validateCode: amounts.join(',')}, getOnboardingDataForOnyx(STEP.VALIDATION));
}

export {
    acceptACHContract,
    connectBankAccountManually,
    connectBankAccountWithPlaid,
    openIdentityCheckFlow,
    updateBeneficialOwners,
    updateCompanyInformation,
    updatePersonalInformation,
    uploadKYBDocuments,
    validateBankAccount,
    verifyIdentity,
};
export type {ACHContractInformation, BeneficialOwnersInformation, CompanyInformation, PersonalInformation};
