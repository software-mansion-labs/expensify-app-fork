import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/core';
import {planRequest} from '@pages/SimplifiedBankOnboarding/core';
import getUSDOnyxData, {USD_ERROR_KEY} from '@pages/SimplifiedBankOnboarding/flows/usd/getUSDOnyxData';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

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
