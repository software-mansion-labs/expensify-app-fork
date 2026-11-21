import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/core';
import {planRequest} from '@pages/SimplifiedBankOnboarding/core';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import getUSDOnyxData, {USD_ERROR_KEY} from './getUSDOnyxData';

type ACHContract = Omit<WriteCommandParams[typeof WRITE_COMMANDS.ACCEPT_ACH_CONTRACT], keyof BankAccountParams>;

/** The contract may be the answers of the whole flow, so only its own values are sent */
function getACHContractRequest(bankAccount: BankAccountParams, {isAuthorizedToUseBankAccount, certifyTrueInformation, acceptTermsAndConditions}: ACHContract): PlannedRequest {
    return planRequest({
        name: REQUEST_NAMES.ACCEPT_ACH_CONTRACT,
        scope: bankAccount,
        type: 'write',
        command: WRITE_COMMANDS.ACCEPT_ACH_CONTRACT,
        params: {...bankAccount, isAuthorizedToUseBankAccount, certifyTrueInformation, acceptTermsAndConditions},
        onyxData: getUSDOnyxData(),
        errorKey: USD_ERROR_KEY,
    });
}

export default getACHContractRequest;
