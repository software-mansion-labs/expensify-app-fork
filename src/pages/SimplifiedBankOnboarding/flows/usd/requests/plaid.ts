/**
 * The reads of the mock Plaid widget. The link token lives in a RAM-only key, like in the real flow.
 */
/* eslint-disable rulesdir/prefer-actions-set-data -- This file is the action layer of an isolated research module, so it lives outside src/libs/actions */
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/core';
import {runRequest} from '@pages/SimplifiedBankOnboarding/core';
import {READ_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

/** Asks the server for the token that the Plaid widget needs to start */
function openPlaidBankLogin(): Promise<RequestOutcome> {
    return runRequest({name: REQUEST_NAMES.OPEN_PLAID_BANK_LOGIN, type: 'read', command: READ_COMMANDS.OPEN_PLAID_BANK_LOGIN, params: {}});
}

/** Exchanges the token that the widget returned after the bank login for the list of bank accounts */
function openPlaidBankAccountSelector(publicToken: string): Promise<RequestOutcome> {
    return runRequest({name: REQUEST_NAMES.OPEN_PLAID_BANK_ACCOUNT_SELECTOR, type: 'read', command: READ_COMMANDS.OPEN_PLAID_BANK_ACCOUNT_SELECTOR, params: {publicToken}});
}

function clearPlaid(): Promise<void> {
    return Promise.all([Onyx.set(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_PLAID_LINK_TOKEN, null), Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA, {})]).then(() => undefined);
}

export {clearPlaid, openPlaidBankAccountSelector, openPlaidBankLogin};
