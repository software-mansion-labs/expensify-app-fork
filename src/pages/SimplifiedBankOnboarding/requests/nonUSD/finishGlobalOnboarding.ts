import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import getAccountErrorOnyxData from '@pages/SimplifiedBankOnboarding/requests/getAccountErrorOnyxData';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import runRequest from '@pages/SimplifiedBankOnboarding/requests/runRequest';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/requests/types';

type FinishDetails = Omit<WriteCommandParams[typeof WRITE_COMMANDS.FINISH_GLOBAL_BANK_ACCOUNT_ONBOARDING], keyof BankAccountParams>;

/** Sends the agreements and, for AUD, the names of the uploaded files. The mock server never receives the files. */
function finishGlobalOnboarding(bankAccount: BankAccountParams, details: FinishDetails): Promise<RequestOutcome> {
    return runRequest({
        name: REQUEST_NAMES.FINISH_GLOBAL_ONBOARDING,
        scope: bankAccount,
        type: 'write',
        command: WRITE_COMMANDS.FINISH_GLOBAL_BANK_ACCOUNT_ONBOARDING,
        params: {...bankAccount, ...details},
        onyxData: getAccountErrorOnyxData('common.genericErrorMessage'),
    });
}

export default finishGlobalOnboarding;
export type {FinishDetails};
