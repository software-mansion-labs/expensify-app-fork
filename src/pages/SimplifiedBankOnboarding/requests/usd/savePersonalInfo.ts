import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import runRequest from '@pages/SimplifiedBankOnboarding/requests/runRequest';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/requests/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import getUSDOnyxData, {USD_ERROR_KEY} from './getUSDOnyxData';

type PersonalInfo = Omit<WriteCommandParams[typeof WRITE_COMMANDS.UPDATE_PERSONAL_INFORMATION], keyof BankAccountParams | 'confirm'>;

/** Only a save with `confirm` asks the server to move the account to the next step */
function savePersonalInfo(bankAccount: BankAccountParams, personalInfo: PersonalInfo, confirm: boolean): Promise<RequestOutcome> {
    return runRequest({
        name: REQUEST_NAMES.SAVE_PERSONAL_INFO,
        scope: bankAccount,
        type: 'write',
        command: WRITE_COMMANDS.UPDATE_PERSONAL_INFORMATION,
        params: {...bankAccount, ...personalInfo, confirm},
        onyxData: getUSDOnyxData(SBO_CONST.USD.STEP.REQUESTOR),
        errorKey: USD_ERROR_KEY,
    });
}

export default savePersonalInfo;
export type {PersonalInfo};
