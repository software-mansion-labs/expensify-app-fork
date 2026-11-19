/**
 * Helpers that build the responses of the mock backend, including the Onyx updates that a response carries.
 */
/* eslint-disable no-param-reassign -- The mock server keeps its database in memory and the handlers change it in place */
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {MockServerDatabase, MockServerResponse, ServerBankAccount} from '@pages/SimplifiedBankOnboarding/mockBackend/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {ACHData} from '@pages/SimplifiedBankOnboarding/types/onyx';

import ONYXKEYS from '@src/ONYXKEYS';
import type {AnyOnyxUpdate} from '@src/types/onyx/Request';

import type {OnyxKey, OnyxMergeInput, OnyxSetInput} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

const {JSON_CODE} = SBO_CONST.MOCK;
const VISIBLE_ACCOUNT_NUMBER_DIGITS = 4;

function buildMergeUpdate<TKey extends OnyxKey>(key: TKey, value: OnyxMergeInput<TKey>): AnyOnyxUpdate {
    return {onyxMethod: Onyx.METHOD.MERGE, key, value};
}

function buildSetUpdate<TKey extends OnyxKey>(key: TKey, value: OnyxSetInput<TKey>): AnyOnyxUpdate {
    return {onyxMethod: Onyx.METHOD.SET, key, value};
}

function buildSuccessResponse(onyxData: AnyOnyxUpdate[] = []): MockServerResponse {
    return {jsonCode: JSON_CODE.SUCCESS, onyxData};
}

function buildFailureResponse(message: string, jsonCode: number = JSON_CODE.BAD_REQUEST, onyxData: AnyOnyxUpdate[] = []): MockServerResponse {
    return {jsonCode, message, onyxData};
}

function buildNotFoundResponse(): MockServerResponse {
    return buildFailureResponse('The bank account does not exist', JSON_CODE.NOT_FOUND);
}

function maskAccountNumber(accountNumber: string): string {
    const visibleDigits = accountNumber.slice(-VISIBLE_ACCOUNT_NUMBER_DIGITS);
    return `${'X'.repeat(Math.max(accountNumber.length - VISIBLE_ACCOUNT_NUMBER_DIGITS, 0))}${visibleDigits}`;
}

function findBankAccount(database: MockServerDatabase, {policyID, bankAccountID}: BankAccountParams): ServerBankAccount | undefined {
    // A flow that was opened by the bank account ID has no workspace to name, so the ID alone identifies the row.
    const account = policyID ? database.bankAccounts[policyID] : Object.values(database.bankAccounts).find((row) => row.bankAccountID === bankAccountID);
    return account?.bankAccountID === bankAccountID ? account : undefined;
}

/** Returns the bank account that is still being set up. A connected one is not returned, because connecting again replaces it. */
function findBankAccountInSetup(database: MockServerDatabase, policyID: string): ServerBankAccount | undefined {
    const account = database.bankAccounts[policyID];
    return account?.state === SBO_CONST.STATE.OPEN ? undefined : account;
}

/** Drops the columns that never leave the server */
function buildClientACHData(account: ServerBankAccount): ACHData {
    const {unmaskedAccountNumber, validationAttempts, uploadedKYBDocuments, bankStatementName, achAuthorizationFormName, ...achData} = account;
    return achData;
}

/** The updates that every successful write sends back: the account data and the summary on the workspace */
function buildAccountUpdates(database: MockServerDatabase, policyID: string): AnyOnyxUpdate[] {
    const account = database.bankAccounts[policyID];
    if (!account) {
        return [buildMergeUpdate(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES, {[policyID]: {achAccount: null}})];
    }
    const workspace = database.workspaces[policyID];
    if (workspace && account.bankAccountID && account.state) {
        workspace.achAccount = {bankAccountID: account.bankAccountID, state: account.state};
    }
    return [
        buildMergeUpdate(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {achData: buildClientACHData(account)}),
        buildMergeUpdate(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES, {[policyID]: {achAccount: workspace?.achAccount ?? null}}),
    ];
}

function buildAccountResponse(database: MockServerDatabase, policyID: string): MockServerResponse {
    return buildSuccessResponse(buildAccountUpdates(database, policyID));
}

function removeBankAccount(database: MockServerDatabase, policyID: string): MockServerResponse {
    delete database.bankAccounts[policyID];
    const workspace = database.workspaces[policyID];
    if (workspace) {
        delete workspace.achAccount;
    }
    return buildAccountResponse(database, policyID);
}

export {
    buildAccountResponse,
    buildAccountUpdates,
    buildClientACHData,
    buildFailureResponse,
    buildMergeUpdate,
    buildNotFoundResponse,
    buildSetUpdate,
    buildSuccessResponse,
    findBankAccount,
    findBankAccountInSetup,
    maskAccountNumber,
    removeBankAccount,
};
