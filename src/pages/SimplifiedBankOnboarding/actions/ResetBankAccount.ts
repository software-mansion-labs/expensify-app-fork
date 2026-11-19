/**
 * The requests that start the setup over. They clear the account on the client before the server answers and mark it with
 * a pending action, like `resetUSDBankAccount` and `resetNonUSDBankAccount` of the real flow.
 */
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

import Onyx from 'react-native-onyx';

import {DEFAULT_ACCOUNT} from './OnboardingAccount';

type ResetOnyxKey =
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT
    | typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS;

function getResetDataForOnyx(policyID: string | undefined): OnyxData<ResetOnyxKey> {
    return {
        optimisticData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT,
                value: {shouldShowResetModal: false, isLoading: true, pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE, achData: null},
            },
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
        failureData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {isLoading: false, pendingAction: null}}],
    };
}

function resetUSDBankAccount(bankAccount: BankAccountParams) {
    write(WRITE_COMMANDS.RESTART_BANK_ACCOUNT_SETUP, bankAccount, getResetDataForOnyx(bankAccount.policyID));
}

function resetNonUSDBankAccount(bankAccount: BankAccountParams) {
    write(WRITE_COMMANDS.RESET_GLOBAL_BANK_ACCOUNT, bankAccount, getResetDataForOnyx(bankAccount.policyID));
}

export {resetNonUSDBankAccount, resetUSDBankAccount};
