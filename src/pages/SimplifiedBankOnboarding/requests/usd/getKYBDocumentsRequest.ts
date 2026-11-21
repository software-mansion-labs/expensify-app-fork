import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import {planRequest} from '@pages/SimplifiedBankOnboarding/requests/runRequest';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/requests/types';

import getUSDOnyxData, {USD_ERROR_KEY} from './getUSDOnyxData';

/** The mock server only checks the names, so the files themselves are not sent */
function getKYBDocumentsRequest(bankAccount: BankAccountParams, documentNames: string[]): PlannedRequest {
    return planRequest({
        name: REQUEST_NAMES.UPLOAD_KYB_DOCUMENTS,
        scope: bankAccount,
        type: 'write',
        command: WRITE_COMMANDS.UPLOAD_KYB_DOCUMENTS,
        params: {...bankAccount, documentNames},
        onyxData: getUSDOnyxData(),
        errorKey: USD_ERROR_KEY,
    });
}

export default getKYBDocumentsRequest;
