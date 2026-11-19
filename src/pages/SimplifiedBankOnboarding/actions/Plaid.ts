/**
 * The reads of the mock Plaid widget. The link token lives in a RAM-only key, like in the real flow.
 */
/* eslint-disable rulesdir/prefer-actions-set-data -- This file is the action layer of an isolated research module, so it lives outside src/libs/actions */
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';

import {READ_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {read} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';

import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

import Onyx from 'react-native-onyx';

function getPlaidDataForOnyx(): OnyxData<typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA> {
    return {
        optimisticData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA, value: {isLoading: true, errors: null}}],
        successData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA, value: {isLoading: false}}],
        failureData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA,
                value: {isLoading: false, errors: getMicroSecondOnyxErrorWithTranslationKey('common.genericErrorMessage')},
            },
        ],
    };
}

/** Asks the server for the token that the Plaid widget needs to start */
function openPlaidBankLogin() {
    read(READ_COMMANDS.OPEN_PLAID_BANK_LOGIN, {}, getPlaidDataForOnyx());
}

/** Exchanges the token that the widget returned after the bank login for the list of bank accounts */
function openPlaidBankAccountSelector(publicToken: string) {
    read(READ_COMMANDS.OPEN_PLAID_BANK_ACCOUNT_SELECTOR, {publicToken}, getPlaidDataForOnyx());
}

function clearPlaid() {
    Onyx.set(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_PLAID_LINK_TOKEN, null);
    Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA, {});
}

export {clearPlaid, openPlaidBankAccountSelector, openPlaidBankLogin};
