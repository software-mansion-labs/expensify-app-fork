import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import getAccountErrorOnyxData from '@pages/SimplifiedBankOnboarding/requests/getAccountErrorOnyxData';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import runRequest from '@pages/SimplifiedBankOnboarding/requests/runRequest';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/requests/types';

type GlobalBankAccountDetails = WriteCommandParams[typeof WRITE_COMMANDS.CREATE_GLOBAL_BANK_ACCOUNT];

/** Creates the account. The fields are the values of the bank inputs that the server described, keyed by input ID. */
function createGlobalBankAccount(details: GlobalBankAccountDetails): Promise<RequestOutcome> {
    return runRequest({
        name: REQUEST_NAMES.CREATE_GLOBAL_BANK_ACCOUNT,
        scope: {policyID: details.policyID},
        type: 'write',
        command: WRITE_COMMANDS.CREATE_GLOBAL_BANK_ACCOUNT,
        params: details,
        onyxData: getAccountErrorOnyxData('common.genericErrorMessage'),
    });
}

export default createGlobalBankAccount;
export type {GlobalBankAccountDetails};
