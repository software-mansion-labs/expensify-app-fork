/* eslint-disable rulesdir/prefer-actions-set-data -- This file is the action layer of an isolated research module, so it lives outside src/libs/actions */
/**
 * The writes of the entry on the account key: the requests that start the setup over, and the clears around the entry.
 * A reset clears the account on the client before the server answers and marks it with a pending delete, like
 * `resetUSDBankAccount` and `resetNonUSDBankAccount` of the real flow. Like them, it also clears the summary on the
 * workspace, which is a key that the pages outside the flow read.
 *
 * What the reset hides: the two commands, the optimistic, success and failure data, the clear of every request state
 * (BC-22), and the recovery of a failure (BC-18): the account is read again and the generic error is shown on it.
 */
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';

import {DEFAULT_ACCOUNT} from '@pages/SimplifiedBankOnboarding/contract/defaultAccount';
import type {Workspace} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import {clearRequestState, openOnboardingPage, runRequest} from '@pages/SimplifiedBankOnboarding/core';
import type {RequestOnyxKey} from '@pages/SimplifiedBankOnboarding/core';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

import type {OnyxUpdate} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

type WorkspaceACHAccount = Workspace['achAccount'];

type ResetBankAccountOptions = {
    /** Picks the command: `RESET_GLOBAL_BANK_ACCOUNT` for NonUSD, `RESTART_BANK_ACCOUNT_SETUP` for USD */
    isNonUSD: boolean;
    bankAccount: BankAccountParams;

    /** The summary on the workspace, restored when the reset fails */
    workspaceACHAccount: WorkspaceACHAccount;
};

/** Builds the update of the summary on the workspace. There is none when the account data names no workspace. */
function buildWorkspaceSummaryUpdates(policyID: string | undefined, achAccount: WorkspaceACHAccount | null): Array<OnyxUpdate<typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES>> {
    if (!policyID) {
        return [];
    }
    return [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES,
            value: {[policyID]: {achAccount}},
        },
    ];
}

function getResetDataForOnyx(policyID: string | undefined, achAccount: WorkspaceACHAccount): OnyxData<RequestOnyxKey> {
    return {
        optimisticData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT,
                value: {
                    shouldShowResetModal: false,
                    isLoading: true,
                    pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE,
                    achData: null,
                },
            },
            ...buildWorkspaceSummaryUpdates(policyID, null),
        ],
        successData: [
            {
                onyxMethod: Onyx.METHOD.SET,
                key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN,
                value: null,
            },
            {
                onyxMethod: Onyx.METHOD.SET,
                key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA,
                value: {},
            },
            {
                onyxMethod: Onyx.METHOD.SET,
                key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS,
                value: null,
            },
            {
                onyxMethod: Onyx.METHOD.SET,
                key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT,
                value: {
                    ...DEFAULT_ACCOUNT,
                    achData: {...DEFAULT_ACCOUNT.achData, policyID},
                },
            },
            {
                onyxMethod: Onyx.METHOD.SET,
                key: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT,
                value: {},
            },
        ],
        failureData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT,
                value: {isLoading: false, pendingAction: null},
            },

            // The account data comes back with the read that follows the failure, but the summary has no such read.
            ...buildWorkspaceSummaryUpdates(policyID, achAccount ?? null),
        ],
    };
}

/** Sends the reset and resolves when its answer is applied. A failure reads the account again, then shows the generic error on it. */
async function resetBankAccount({isNonUSD, bankAccount, workspaceACHAccount}: ResetBankAccountOptions): Promise<void> {
    await clearRequestState();

    const outcome = await runRequest({
        name: isNonUSD ? 'entry.startOver.resetNonUSD' : 'entry.startOver.resetUSD',
        scope: bankAccount,
        type: 'write',
        command: isNonUSD ? WRITE_COMMANDS.RESET_GLOBAL_BANK_ACCOUNT : WRITE_COMMANDS.RESTART_BANK_ACCOUNT_SETUP,
        params: bankAccount,
        onyxData: getResetDataForOnyx(bankAccount.policyID, workspaceACHAccount),
    });
    if (outcome.status !== 'failed') {
        return;
    }

    // The read replaces the whole account, so the error is written after it, or the read would wipe it.
    await openOnboardingPage(bankAccount.policyID ? {policyID: bankAccount.policyID} : {bankAccountID: bankAccount.bankAccountID});
    await Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {
        errors: getMicroSecondOnyxErrorWithTranslationKey('common.genericErrorMessage'),
    });
}

/** Puts the account in its loading state before the entry reads the account of another workspace */
function startAccountLoading(): Promise<void> {
    return Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {
        isLoading: true,
    });
}

/** Forgets the account when the entry closes, so the next workspace never shows its data */
function clearOnboardingAccount(): Promise<void> {
    return Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, DEFAULT_ACCOUNT);
}

/** The dismiss of an error on the entry rows */
function clearOnboardingAccountErrors() {
    Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {
        errors: null,
        pendingAction: null,
        errorFields: null,
    });
}

export {clearOnboardingAccount, clearOnboardingAccountErrors, resetBankAccount, startAccountLoading};
