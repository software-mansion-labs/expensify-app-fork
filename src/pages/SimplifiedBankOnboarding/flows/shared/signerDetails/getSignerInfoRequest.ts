/**
 * The request that saves the details of an invited director from their own page. It sends the same command as the
 * director step of the NonUSD flow under its own request name.
 */
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/core';
import {planRequest} from '@pages/SimplifiedBankOnboarding/core';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

type DirectorInfo = Omit<WriteCommandParams[typeof WRITE_COMMANDS.SAVE_ONBOARDING_DIRECTOR_INFORMATION], keyof BankAccountParams>;

/**
 * The invited director is not in the flow, so the account error of the Payments page does not apply. The saved details
 * leave the draft of the page, so the next director starts from an empty form.
 */
function getSignerInfoRequest(bankAccount: BankAccountParams, {signerFullName, signerJobTitle}: DirectorInfo): PlannedRequest {
    return planRequest({
        name: REQUEST_NAMES.SAVE_SIGNER_INFO,
        scope: bankAccount,
        type: 'write',
        command: WRITE_COMMANDS.SAVE_ONBOARDING_DIRECTOR_INFORMATION,
        params: {...bankAccount, signerFullName, signerJobTitle},
        onyxData: {
            successData: [{onyxMethod: Onyx.METHOD.SET, key: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM_DRAFT, value: null}],
        },
    });
}

export default getSignerInfoRequest;
export type {DirectorInfo};
