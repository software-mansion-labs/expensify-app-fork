import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import runRequest from '@pages/SimplifiedBankOnboarding/requests/runRequest';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/requests/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import getUSDOnyxData, {USD_ERROR_KEY} from './getUSDOnyxData';

type CompanyInfo = Omit<WriteCommandParams[typeof WRITE_COMMANDS.UPDATE_COMPANY_INFORMATION], keyof BankAccountParams>;

function saveCompany(bankAccount: BankAccountParams, companyInfo: CompanyInfo): Promise<RequestOutcome> {
    return runRequest({
        name: REQUEST_NAMES.SAVE_COMPANY,
        scope: bankAccount,
        type: 'write',
        command: WRITE_COMMANDS.UPDATE_COMPANY_INFORMATION,
        params: {...bankAccount, ...companyInfo},
        onyxData: getUSDOnyxData(SBO_CONST.USD.STEP.COMPANY),
        errorKey: USD_ERROR_KEY,
    });
}

export default saveCompany;
export type {CompanyInfo};
