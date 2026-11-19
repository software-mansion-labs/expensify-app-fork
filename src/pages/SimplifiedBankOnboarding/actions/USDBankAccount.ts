/**
 * The requests of the USD flow. Each one is tracked under the request ID that its step created, so a step only waits for
 * its own request, and a confirmed one removes the draft fields that its step passes once the server holds them. They
 * mirror the VBBA actions of `libs/actions/BankAccounts`.
 */
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';

import {READ_COMMANDS, WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {read, write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';
import buildTrackedRequestData from '@pages/SimplifiedBankOnboarding/requests/buildTrackedRequestData';
import type {DraftFields, TrackedRequestKey} from '@pages/SimplifiedBankOnboarding/requests/buildTrackedRequestData';
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

/** Builds the Onyx data of a USD request, with the token resets of the real flow on failure */
function getUSDRequestData(requestID: string, command: keyof WriteCommandParams, draftFieldsToClear: DraftFields, currentStep?: USDStep): OnyxData<USDOnyxKey | TrackedRequestKey> {
    const {optimisticData, successData, failureData} = buildTrackedRequestData({
        requestID,
        command,
        errors: getMicroSecondOnyxErrorWithTranslationKey('walletPage.addBankAccountFailure'),
        draftFieldsToClear,
    });
    const tokenResets: Array<OnyxUpdate<USDOnyxKey>> = [{onyxMethod: Onyx.METHOD.SET, key: ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_PLAID_LINK_TOKEN, value: null}];

    // The requestor step and the identity check keep the token, because a failed save there does not restart the check,
    // and the identity step waits for its answer and can send the result again.
    if (currentStep !== STEP.REQUESTOR && command !== WRITE_COMMANDS.VERIFY_IDENTITY) {
        tokenResets.push({onyxMethod: Onyx.METHOD.SET, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN, value: null});
    }

    return {
        optimisticData,
        successData,
        failureData: [...failureData, ...tokenResets],
    };
}

function connectBankAccountManually(requestID: string, policyID: string, routingNumber: string, accountNumber: string, draftFieldsToClear: DraftFields) {
    const command = WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_MANUALLY;
    write(command, {policyID, routingNumber, accountNumber}, getUSDRequestData(requestID, command, draftFieldsToClear, STEP.BANK_ACCOUNT));
}

function connectBankAccountWithPlaid(requestID: string, policyID: string, plaidAccountID: string, draftFieldsToClear: DraftFields) {
    const command = WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_WITH_PLAID;
    write(command, {policyID, plaidAccountID}, getUSDRequestData(requestID, command, draftFieldsToClear, STEP.BANK_ACCOUNT));
}

/**
 * Saves the personal information. Only the confirmation page asks the server to move to the next step, and only its
 * request clears the draft, because the user may already edit the next sub page while a background save runs.
 */
function updatePersonalInformation(requestID: string, bankAccount: BankAccountParams, personalInformation: PersonalInformation, isConfirmPage: boolean, draftFieldsToClear: DraftFields) {
    const command = WRITE_COMMANDS.UPDATE_PERSONAL_INFORMATION;
    write(command, {...bankAccount, ...personalInformation, confirm: isConfirmPage}, getUSDRequestData(requestID, command, isConfirmPage ? draftFieldsToClear : [], STEP.REQUESTOR));
}

function openIdentityCheckFlow(policyID: string) {
    read(READ_COMMANDS.OPEN_IDENTITY_CHECK_FLOW, {policyID});
}

function verifyIdentity(requestID: string, bankAccount: BankAccountParams, onfidoData: string) {
    const command = WRITE_COMMANDS.VERIFY_IDENTITY;
    write(command, {...bankAccount, onfidoData}, getUSDRequestData(requestID, command, []));
}

function updateCompanyInformation(requestID: string, bankAccount: BankAccountParams, companyInformation: CompanyInformation, draftFieldsToClear: DraftFields) {
    const command = WRITE_COMMANDS.UPDATE_COMPANY_INFORMATION;
    write(command, {...bankAccount, ...companyInformation}, getUSDRequestData(requestID, command, draftFieldsToClear, STEP.COMPANY));
}

function updateBeneficialOwners(requestID: string, bankAccount: BankAccountParams, beneficialOwnersInformation: BeneficialOwnersInformation, draftFieldsToClear: DraftFields) {
    const command = WRITE_COMMANDS.UPDATE_BENEFICIAL_OWNERS;
    write(command, {...bankAccount, ...beneficialOwnersInformation}, getUSDRequestData(requestID, command, draftFieldsToClear));
}

function acceptACHContract(requestID: string, bankAccount: BankAccountParams, contractInformation: ACHContractInformation, draftFieldsToClear: DraftFields) {
    const command = WRITE_COMMANDS.ACCEPT_ACH_CONTRACT;
    write(command, {...bankAccount, ...contractInformation}, getUSDRequestData(requestID, command, draftFieldsToClear));
}

function uploadKYBDocuments(requestID: string, bankAccount: BankAccountParams, documentNames: string[], draftFieldsToClear: DraftFields) {
    const command = WRITE_COMMANDS.UPLOAD_KYB_DOCUMENTS;
    write(command, {...bankAccount, documentNames}, getUSDRequestData(requestID, command, draftFieldsToClear));
}

/** Sends the three test deposit amounts joined into one code, the way the real flow does */
function validateBankAccount(requestID: string, bankAccount: BankAccountParams, amounts: string[]) {
    const command = WRITE_COMMANDS.VALIDATE_BANK_ACCOUNT;
    write(command, {...bankAccount, validateCode: amounts.join(',')}, getUSDRequestData(requestID, command, [], STEP.VALIDATION));
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
