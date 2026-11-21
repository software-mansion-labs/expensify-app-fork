import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import getAccountErrorOnyxData from '@pages/SimplifiedBankOnboarding/requests/getAccountErrorOnyxData';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import {planRequest} from '@pages/SimplifiedBankOnboarding/requests/runRequest';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/requests/types';

type GlobalCompanyDetails = Omit<WriteCommandParams[typeof WRITE_COMMANDS.SAVE_ONBOARDING_COMPANY_DETAILS], keyof BankAccountParams>;

/** The details may be the answers of the whole flow, so only their own values are sent */
function getGlobalCompanyRequest(bankAccount: BankAccountParams, {companyName, businessType}: GlobalCompanyDetails): PlannedRequest {
    return planRequest({
        name: REQUEST_NAMES.SAVE_GLOBAL_COMPANY,
        scope: bankAccount,
        type: 'write',
        command: WRITE_COMMANDS.SAVE_ONBOARDING_COMPANY_DETAILS,
        params: {...bankAccount, companyName, businessType},
        onyxData: getAccountErrorOnyxData('common.genericErrorMessage'),
    });
}

export default getGlobalCompanyRequest;
export type {GlobalCompanyDetails};
