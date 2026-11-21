import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/core';
import {planRequest} from '@pages/SimplifiedBankOnboarding/core';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import getUSDOnyxData, {USD_ERROR_KEY} from './getUSDOnyxData';

type PersonalInfo = Required<Omit<WriteCommandParams[typeof WRITE_COMMANDS.UPDATE_PERSONAL_INFORMATION], keyof BankAccountParams | 'confirm'>>;

/**
 * The personal info may be the answers of the whole flow, so only its own values are sent. The flow sends them from the
 * confirmation of the step, so it always asks the server to move the account to the next step.
 */
function getPersonalInfoRequest(bankAccount: BankAccountParams, {firstName, lastName, dob, ssnLast4}: PersonalInfo): PlannedRequest {
    return planRequest({
        name: REQUEST_NAMES.SAVE_PERSONAL_INFO,
        scope: bankAccount,
        type: 'write',
        command: WRITE_COMMANDS.UPDATE_PERSONAL_INFORMATION,
        params: {...bankAccount, firstName, lastName, dob, ssnLast4, confirm: true},
        onyxData: getUSDOnyxData(SBO_CONST.USD.STEP.REQUESTOR),
        errorKey: USD_ERROR_KEY,
    });
}

export default getPersonalInfoRequest;
