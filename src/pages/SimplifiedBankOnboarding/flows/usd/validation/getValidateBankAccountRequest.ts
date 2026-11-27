import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/core';
import {planRequestWithInput} from '@pages/SimplifiedBankOnboarding/core';
import getUSDOnyxData, {USD_ERROR_KEY} from '@pages/SimplifiedBankOnboarding/flows/usd/getUSDOnyxData';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

/**
 * The amounts come from the test deposit form when the user sends them. The server takes them as one comma separated
 * code, like the real validation request.
 */
function getValidateBankAccountRequest(bankAccount: BankAccountParams): PlannedRequest<string[]> {
    return planRequestWithInput({name: REQUEST_NAMES.VALIDATE_BANK_ACCOUNT, scope: bankAccount}, (amounts: string[]) => ({
        type: 'write',
        command: WRITE_COMMANDS.VALIDATE_BANK_ACCOUNT,
        params: {...bankAccount, validateCode: amounts.join(',')},
        onyxData: getUSDOnyxData(SBO_CONST.USD.STEP.VALIDATION),
        errorKey: USD_ERROR_KEY,
    }));
}

export default getValidateBankAccountRequest;
