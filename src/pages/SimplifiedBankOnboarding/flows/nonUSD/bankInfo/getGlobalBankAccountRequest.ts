import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/core';
import {planFailedRequest, planRequest} from '@pages/SimplifiedBankOnboarding/core';
import getAccountErrorOnyxData from '@pages/SimplifiedBankOnboarding/flows/shared/getAccountErrorOnyxData';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

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
