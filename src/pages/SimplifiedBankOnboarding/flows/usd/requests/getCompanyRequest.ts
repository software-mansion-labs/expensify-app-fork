import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/core';
import {planRequest} from '@pages/SimplifiedBankOnboarding/core';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

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
