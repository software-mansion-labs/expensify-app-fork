/**
 * The requests that start the setup over. They clear the account on the client before the server answers and mark it with
 * a pending action, like `resetUSDBankAccount` and `resetNonUSDBankAccount` of the real flow. Like them, they also clear
 * the summary on the workspace, which is a key that the pages outside the flow read.
 */
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';
import type {Workspace} from '@pages/SimplifiedBankOnboarding/types/onyx';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

import type {OnyxUpdate} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

import {DEFAULT_ACCOUNT} from './OnboardingAccount';

type WorkspaceACHAccount = Workspace['achAccount'];

type ResetOnyxKey =
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES
    | typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS;

/** Builds the update of the summary on the workspace. There is none when the account data names no workspace. */
function buildWorkspaceSummaryUpdates(policyID: string | undefined, achAccount: WorkspaceACHAccount | null): Array<OnyxUpdate<typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES>> {
    if (!policyID) {
        return [];
    }
    return [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES, value: {[policyID]: {achAccount}}}];
}

function getResetDataForOnyx(policyID: string | undefined, achAccount: WorkspaceACHAccount): OnyxData<ResetOnyxKey> {
    return {
        optimisticData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT,
                value: {shouldShowResetModal: false, isLoading: true, pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE, achData: null},
            },
            ...buildWorkspaceSummaryUpdates(policyID, null),
        ],
        successData: [
            {onyxMethod: Onyx.METHOD.SET, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN, value: null},
            {onyxMethod: Onyx.METHOD.SET, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA, value: {}},
            {onyxMethod: Onyx.METHOD.SET, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS, value: null},
            {
                onyxMethod: Onyx.METHOD.SET,
                key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT,
                value: {...DEFAULT_ACCOUNT, achData: {...DEFAULT_ACCOUNT.achData, policyID}},
            },
            {onyxMethod: Onyx.METHOD.SET, key: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, value: {}},
        ],
        failureData: [
            {onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {isLoading: false, pendingAction: null}},

            // The account data is not restored here. It comes back with the next read of the entry page, but the summary has no such read.
            ...buildWorkspaceSummaryUpdates(policyID, achAccount ?? null),
        ],
    };
}

function resetUSDBankAccount(bankAccount: BankAccountParams, workspaceACHAccount: WorkspaceACHAccount) {
    write(WRITE_COMMANDS.RESTART_BANK_ACCOUNT_SETUP, bankAccount, getResetDataForOnyx(bankAccount.policyID, workspaceACHAccount));
}

function resetNonUSDBankAccount(bankAccount: BankAccountParams, workspaceACHAccount: WorkspaceACHAccount) {
    write(WRITE_COMMANDS.RESET_GLOBAL_BANK_ACCOUNT, bankAccount, getResetDataForOnyx(bankAccount.policyID, workspaceACHAccount));
}

export {resetNonUSDBankAccount, resetUSDBankAccount};
