import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import runRequest from '@pages/SimplifiedBankOnboarding/requests/runRequest';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/requests/types';

import getUSDOnyxData, {USD_ERROR_KEY} from './getUSDOnyxData';

type ACHContract = Omit<WriteCommandParams[typeof WRITE_COMMANDS.ACCEPT_ACH_CONTRACT], keyof BankAccountParams>;

function acceptACHContract(bankAccount: BankAccountParams, contract: ACHContract): Promise<RequestOutcome> {
    return runRequest({
        name: REQUEST_NAMES.ACCEPT_ACH_CONTRACT,
        type: 'write',
        command: WRITE_COMMANDS.ACCEPT_ACH_CONTRACT,
        params: {...bankAccount, ...contract},
        onyxData: getUSDOnyxData(),
        errorKey: USD_ERROR_KEY,
    });
}

export default acceptACHContract;
export type {ACHContract};
