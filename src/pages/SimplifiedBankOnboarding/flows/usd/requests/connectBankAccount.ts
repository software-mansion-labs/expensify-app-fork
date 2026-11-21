/**
 * The two writes of the USD bank account step. Both are one user action, so they share one request name. The account
 * belongs to a workspace, so a flow opened without one gets a request that only records the failure. The entry always
 * opens the flow with a workspace, so that request is only a guard.
 */
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/core';
import {planFailedRequest, planRequest} from '@pages/SimplifiedBankOnboarding/core';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import getUSDOnyxData, {USD_ERROR_KEY} from './getUSDOnyxData';

type ManualBankAccountNumbers = {
    routingNumber: string;
    accountNumber: string;
};

function getManualBankAccountRequest(bankAccount: BankAccountParams, {routingNumber, accountNumber}: ManualBankAccountNumbers): PlannedRequest {
    const {policyID} = bankAccount;
    if (!policyID) {
        return planFailedRequest(REQUEST_NAMES.CONNECT_BANK_ACCOUNT, bankAccount);
    }
    return planRequest({
        name: REQUEST_NAMES.CONNECT_BANK_ACCOUNT,
        scope: {policyID},
        type: 'write',
        command: WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_MANUALLY,
        params: {policyID, routingNumber: routingNumber.trim(), accountNumber: accountNumber.trim()},
        onyxData: getUSDOnyxData(SBO_CONST.USD.STEP.BANK_ACCOUNT),
        errorKey: USD_ERROR_KEY,
    });
}

/** The Plaid page blocks Next until the user picks an account, so a missing account is only a guard as well */
function getPlaidBankAccountRequest(bankAccount: BankAccountParams, plaidAccountID: string | undefined): PlannedRequest {
    const {policyID} = bankAccount;
    if (!policyID || !plaidAccountID) {
        return planFailedRequest(REQUEST_NAMES.CONNECT_BANK_ACCOUNT, bankAccount);
    }
    return planRequest({
        name: REQUEST_NAMES.CONNECT_BANK_ACCOUNT,
        scope: {policyID},
        type: 'write',
        command: WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_WITH_PLAID,
        params: {policyID, plaidAccountID},
        onyxData: getUSDOnyxData(SBO_CONST.USD.STEP.BANK_ACCOUNT),
        errorKey: USD_ERROR_KEY,
    });
}

export {getManualBankAccountRequest, getPlaidBankAccountRequest};
