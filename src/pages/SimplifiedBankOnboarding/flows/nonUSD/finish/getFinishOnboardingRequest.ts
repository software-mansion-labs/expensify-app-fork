import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/core';
import {planRequest} from '@pages/SimplifiedBankOnboarding/core';
import getAccountErrorOnyxData from '@pages/SimplifiedBankOnboarding/flows/shared/getAccountErrorOnyxData';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

type FinishDetails = Omit<WriteCommandParams[typeof WRITE_COMMANDS.FINISH_GLOBAL_BANK_ACCOUNT_ONBOARDING], keyof BankAccountParams>;

/**
 * Sends the agreements and, for AUD, the names of the uploaded files. The mock server never receives the files. The
 * details may be the answers of the whole flow, so only their own values are sent.
 */
function getFinishOnboardingRequest(
    bankAccount: BankAccountParams,
    {authorizedToBindClientToAgreement, agreeToTermsAndConditions, consentToPrivacyNotice, bankStatementName, achAuthorizationFormName}: FinishDetails,
): PlannedRequest {
    return planRequest({
        name: REQUEST_NAMES.FINISH_GLOBAL_ONBOARDING,
        scope: bankAccount,
        type: 'write',
        command: WRITE_COMMANDS.FINISH_GLOBAL_BANK_ACCOUNT_ONBOARDING,
        params: {...bankAccount, authorizedToBindClientToAgreement, agreeToTermsAndConditions, consentToPrivacyNotice, bankStatementName, achAuthorizationFormName},
        onyxData: getAccountErrorOnyxData('common.genericErrorMessage'),
    });
}

export default getFinishOnboardingRequest;
export type {FinishDetails};
