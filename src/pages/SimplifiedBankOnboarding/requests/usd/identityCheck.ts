/**
 * The requests of the identity check: the read that gives the widget its token and the write of the widget result,
 * which the plan names as the request of the identity step.
 */
import {READ_COMMANDS, WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import runRequest, {planRequest} from '@pages/SimplifiedBankOnboarding/requests/runRequest';
import type {PlannedRequest, RequestOutcome} from '@pages/SimplifiedBankOnboarding/requests/types';

import getUSDOnyxData, {USD_ERROR_KEY} from './getUSDOnyxData';

function openIdentityCheckFlow(policyID: string): Promise<RequestOutcome> {
    return runRequest({name: REQUEST_NAMES.OPEN_IDENTITY_CHECK_FLOW, type: 'read', command: READ_COMMANDS.OPEN_IDENTITY_CHECK_FLOW, params: {policyID}});
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

export {getVerifyIdentityRequest, openIdentityCheckFlow};
