import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import getAccountErrorOnyxData from '@pages/SimplifiedBankOnboarding/requests/getAccountErrorOnyxData';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import runRequest from '@pages/SimplifiedBankOnboarding/requests/runRequest';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/requests/types';

type GlobalCompanyDetails = Omit<WriteCommandParams[typeof WRITE_COMMANDS.SAVE_ONBOARDING_COMPANY_DETAILS], keyof BankAccountParams>;

function saveGlobalCompany(bankAccount: BankAccountParams, details: GlobalCompanyDetails): Promise<RequestOutcome> {
    return runRequest({
        name: REQUEST_NAMES.SAVE_GLOBAL_COMPANY,
        type: 'write',
        command: WRITE_COMMANDS.SAVE_ONBOARDING_COMPANY_DETAILS,
        params: {...bankAccount, ...details},
        onyxData: getAccountErrorOnyxData('common.genericErrorMessage'),
    });
}

export default saveGlobalCompany;
export type {GlobalCompanyDetails};
