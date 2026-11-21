import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import {planRequest} from '@pages/SimplifiedBankOnboarding/requests/runRequest';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/requests/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

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
