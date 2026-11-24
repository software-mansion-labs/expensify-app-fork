/**
 * The reads of the mock Plaid widget: the link token that starts the widget, and the exchange of the public token from
 * the bank login for the list of bank accounts. Both keep the loading flag and the error of the Plaid data key, which the
 * Plaid page shows.
 */
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';

import type {OnboardingRequest, RequestSpec} from '@pages/SimplifiedBankOnboarding/core';
import {READ_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

/** The token that the fake widget returns after the bank login. The mock server accepts any value. */
const MOCK_PUBLIC_TOKEN = 'mock-public-token';

function getPlaidOnyxData(): RequestSpec['onyxData'] {
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

const plaidLoginRead: OnboardingRequest = {
    name: 'usd.bankAccount.openPlaidLogin',
    build: () => ({type: 'read', command: READ_COMMANDS.OPEN_PLAID_BANK_LOGIN, params: {}, onyxData: getPlaidOnyxData()}),
};

const plaidAccountSelectorRead: OnboardingRequest = {
    name: 'usd.bankAccount.openPlaidAccountSelector',
    build: () => ({type: 'read', command: READ_COMMANDS.OPEN_PLAID_BANK_ACCOUNT_SELECTOR, params: {publicToken: MOCK_PUBLIC_TOKEN}, onyxData: getPlaidOnyxData()}),
};

export {plaidAccountSelectorRead, plaidLoginRead};
