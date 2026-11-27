/**
 * The requests of the identity check: the read that gives the widget its token when the page opens and the write of the
 * widget result, which the plan names as the request of the identity step.
 */
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import type {PlannedRead, PlannedRequest} from '@pages/SimplifiedBankOnboarding/core';
import {planFailedRequest, planRead, planRequest} from '@pages/SimplifiedBankOnboarding/core';
import getUSDOnyxData, {USD_ERROR_KEY} from '@pages/SimplifiedBankOnboarding/flows/usd/getUSDOnyxData';
import {READ_COMMANDS, WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

/** The token belongs to the bank account of a workspace, so a flow opened without one gets a read that only records the failure */
function getIdentityCheckRead(bankAccount: BankAccountParams, isLoaded: boolean): PlannedRead {
    const {policyID} = bankAccount;
    if (!policyID) {
        return {...planFailedRequest(REQUEST_NAMES.OPEN_IDENTITY_CHECK_FLOW, bankAccount), isLoaded};
    }
    return planRead({name: REQUEST_NAMES.OPEN_IDENTITY_CHECK_FLOW, scope: {policyID}, type: 'read', command: READ_COMMANDS.OPEN_IDENTITY_CHECK_FLOW, params: {policyID}}, isLoaded);
}

function getVerifyIdentityRequest(bankAccount: BankAccountParams, onfidoData: string): PlannedRequest {
    return planRequest({
        name: REQUEST_NAMES.VERIFY_IDENTITY,
        scope: bankAccount,
        type: 'write',
        command: WRITE_COMMANDS.VERIFY_IDENTITY,
        params: {...bankAccount, onfidoData},
        onyxData: getUSDOnyxData(),
        errorKey: USD_ERROR_KEY,
    });
}

export {getIdentityCheckRead, getVerifyIdentityRequest};
