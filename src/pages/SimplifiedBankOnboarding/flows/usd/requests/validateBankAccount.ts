import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/core';
import {runRequest} from '@pages/SimplifiedBankOnboarding/core';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import getUSDOnyxData, {USD_ERROR_KEY} from './getUSDOnyxData';

/** The server takes the test deposit amounts as one comma separated code, like the real validation request */
function validateBankAccount(bankAccount: BankAccountParams, amounts: string[]): Promise<RequestOutcome> {
    return runRequest({
        name: REQUEST_NAMES.VALIDATE_BANK_ACCOUNT,
        scope: bankAccount,
        type: 'write',
        command: WRITE_COMMANDS.VALIDATE_BANK_ACCOUNT,
        params: {...bankAccount, validateCode: amounts.join(',')},
        onyxData: getUSDOnyxData(SBO_CONST.USD.STEP.VALIDATION),
        errorKey: USD_ERROR_KEY,
    });
}

export default validateBankAccount;
