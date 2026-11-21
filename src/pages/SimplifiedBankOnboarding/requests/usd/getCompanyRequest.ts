import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import {planRequest} from '@pages/SimplifiedBankOnboarding/requests/runRequest';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/requests/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import CONST from '@src/CONST';

import getUSDOnyxData, {USD_ERROR_KEY} from './getUSDOnyxData';

type CompanyInfo = Omit<WriteCommandParams[typeof WRITE_COMMANDS.UPDATE_COMPANY_INFORMATION], keyof BankAccountParams>;

/** The company may be the answers of the whole flow, so only its own values are sent. The server takes the tax ID as digits only. */
function getCompanyRequest(bankAccount: BankAccountParams, {companyName, companyTaxID, incorporationType}: CompanyInfo): PlannedRequest {
    return planRequest({
        name: REQUEST_NAMES.SAVE_COMPANY,
        scope: bankAccount,
        type: 'write',
        command: WRITE_COMMANDS.UPDATE_COMPANY_INFORMATION,
        params: {...bankAccount, companyName, companyTaxID: companyTaxID.replaceAll(CONST.REGEX.NON_NUMERIC, ''), incorporationType},
        onyxData: getUSDOnyxData(SBO_CONST.USD.STEP.COMPANY),
        errorKey: USD_ERROR_KEY,
    });
}

export default getCompanyRequest;
