import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import getAccountErrorOnyxData from '@pages/SimplifiedBankOnboarding/requests/getAccountErrorOnyxData';
import planFailedRequest from '@pages/SimplifiedBankOnboarding/requests/planFailedRequest';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import {planRequest} from '@pages/SimplifiedBankOnboarding/requests/runRequest';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/requests/types';

type GlobalBankAccountDetails = Omit<WriteCommandParams[typeof WRITE_COMMANDS.CREATE_GLOBAL_BANK_ACCOUNT], 'policyID'>;

/**
 * Creates the account. The fields are the values of the bank inputs that the server described, keyed by input ID. The
 * account belongs to a workspace, so a flow opened without one gets a request that only records the failure. The entry
 * always opens the flow with a workspace, so that request is only a guard.
 */
function getGlobalBankAccountRequest(bankAccount: BankAccountParams, {country, currency, fields}: GlobalBankAccountDetails): PlannedRequest {
    const {policyID} = bankAccount;
    if (!policyID) {
        return planFailedRequest(REQUEST_NAMES.CREATE_GLOBAL_BANK_ACCOUNT, bankAccount);
    }
    return planRequest({
        name: REQUEST_NAMES.CREATE_GLOBAL_BANK_ACCOUNT,
        scope: {policyID},
        type: 'write',
        command: WRITE_COMMANDS.CREATE_GLOBAL_BANK_ACCOUNT,
        params: {policyID, country, currency, fields},
        onyxData: getAccountErrorOnyxData('common.genericErrorMessage'),
    });
}

export default getGlobalBankAccountRequest;
export type {GlobalBankAccountDetails};
