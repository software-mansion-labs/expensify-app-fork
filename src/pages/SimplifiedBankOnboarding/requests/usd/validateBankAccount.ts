import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import runRequest from '@pages/SimplifiedBankOnboarding/requests/runRequest';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/requests/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import getUSDOnyxData, {USD_ERROR_KEY} from './getUSDOnyxData';

/** The server takes the test deposit amounts as one comma separated code, like the real validation request */
function validateBankAccount(bankAccount: BankAccountParams, amounts: string[]): Promise<RequestOutcome> {
    return runRequest({
        name: REQUEST_NAMES.VALIDATE_BANK_ACCOUNT,
        type: 'write',
        command: WRITE_COMMANDS.VALIDATE_BANK_ACCOUNT,
        params: {...bankAccount, validateCode: amounts.join(',')},
        onyxData: getUSDOnyxData(SBO_CONST.USD.STEP.VALIDATION),
        errorKey: USD_ERROR_KEY,
    });
}

export default validateBankAccount;
