/**
 * The request that starts the setup over. It clears the account on the client before the server answers and marks it
 * with a pending action, like `resetUSDBankAccount` and `resetNonUSDBankAccount` of the real flow. It also clears the
 * summary on the workspace, which the pages outside the flow read.
 */
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import DEFAULT_ACCOUNT from '@pages/SimplifiedBankOnboarding/model/defaultAccount';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import runRequest from '@pages/SimplifiedBankOnboarding/requests/runRequest';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/requests/types';
import type {Workspace} from '@pages/SimplifiedBankOnboarding/types/onyx';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

import type {OnyxUpdate} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

type WorkspaceACHAccount = Workspace['achAccount'];

type ResetOnyxKey =
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES
    | typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS;

/** There is no summary to update when the account data names no workspace */
function buildWorkspaceSummaryUpdates(policyID: string | undefined, achAccount: WorkspaceACHAccount | null): Array<OnyxUpdate<typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES>> {
    if (!policyID) {
        return [];
    }
    return [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES, value: {[policyID]: {achAccount}}}];
}

function getResetOnyxData(policyID: string | undefined, achAccount: WorkspaceACHAccount): OnyxData<ResetOnyxKey> {
    return {
        optimisticData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT,
                value: {pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE, achData: null},
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
            {onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {pendingAction: null}},

            // The account data is not restored here. It comes back with the next read of the entry page, but the summary has no such read.
            ...buildWorkspaceSummaryUpdates(policyID, achAccount ?? null),
        ],
    };
}

/** Each flow has its own reset command on the server, the client side of both is the same */
function resetBankAccount(bankAccount: BankAccountParams, workspaceACHAccount: WorkspaceACHAccount, isNonUSD: boolean): Promise<RequestOutcome> {
    return runRequest({
        name: REQUEST_NAMES.RESET_BANK_ACCOUNT,
        scope: bankAccount,
        type: 'write',
        command: isNonUSD ? WRITE_COMMANDS.RESET_GLOBAL_BANK_ACCOUNT : WRITE_COMMANDS.RESTART_BANK_ACCOUNT_SETUP,
        params: bankAccount,
        onyxData: getResetOnyxData(bankAccount.policyID, workspaceACHAccount),
    });
}

export default resetBankAccount;
export type {WorkspaceACHAccount};
