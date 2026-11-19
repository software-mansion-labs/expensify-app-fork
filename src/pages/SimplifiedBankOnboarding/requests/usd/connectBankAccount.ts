/**
 * The two writes of the USD bank account step. Both are one user action, so they share one request name.
 */
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import runRequest from '@pages/SimplifiedBankOnboarding/requests/runRequest';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/requests/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import getUSDOnyxData, {USD_ERROR_KEY} from './getUSDOnyxData';

type ManualBankAccountParams = WriteCommandParams[typeof WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_MANUALLY];
type PlaidBankAccountParams = WriteCommandParams[typeof WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_WITH_PLAID];

function connectBankAccountManually(params: ManualBankAccountParams): Promise<RequestOutcome> {
    return runRequest({
        name: REQUEST_NAMES.CONNECT_BANK_ACCOUNT,
        type: 'write',
        command: WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_MANUALLY,
        params,
        onyxData: getUSDOnyxData(SBO_CONST.USD.STEP.BANK_ACCOUNT),
        errorKey: USD_ERROR_KEY,
    });
}

function connectBankAccountWithPlaid(params: PlaidBankAccountParams): Promise<RequestOutcome> {
    return runRequest({
        name: REQUEST_NAMES.CONNECT_BANK_ACCOUNT,
        type: 'write',
        command: WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_WITH_PLAID,
        params,
        onyxData: getUSDOnyxData(SBO_CONST.USD.STEP.BANK_ACCOUNT),
        errorKey: USD_ERROR_KEY,
    });
}

export {connectBankAccountManually, connectBankAccountWithPlaid};
export type {ManualBankAccountParams, PlaidBankAccountParams};
