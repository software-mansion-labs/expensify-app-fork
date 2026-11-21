/**
 * The requests of the NonUSD signer: the save of the director details, the invitation of other directors and the
 * reminder sent to them. The invited director saves the same details from their own page under its own request name.
 * The plans name the first three as the requests of their pages, and the hang tight page sends the reminder itself.
 */
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import type {PlannedRequest, RequestOutcome} from '@pages/SimplifiedBankOnboarding/core';
import {planRequest, runRequest} from '@pages/SimplifiedBankOnboarding/core';
import getAccountErrorOnyxData from '@pages/SimplifiedBankOnboarding/flows/shared/getAccountErrorOnyxData';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

type DirectorInfo = Omit<WriteCommandParams[typeof WRITE_COMMANDS.SAVE_ONBOARDING_DIRECTOR_INFORMATION], keyof BankAccountParams>;
type SignerEmails = Omit<WriteCommandParams[typeof WRITE_COMMANDS.ASK_FOR_SIGNER_INFORMATION], keyof BankAccountParams>;

function getDirectorInfoRequest(bankAccount: BankAccountParams, {signerFullName, signerJobTitle}: DirectorInfo): PlannedRequest {
    return planRequest({
        name: REQUEST_NAMES.SAVE_DIRECTOR_INFO,
        scope: bankAccount,
        type: 'write',
        command: WRITE_COMMANDS.SAVE_ONBOARDING_DIRECTOR_INFORMATION,
        params: {...bankAccount, signerFullName, signerJobTitle},
        onyxData: getAccountErrorOnyxData('common.genericErrorMessage'),
    });
}

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

function getSignerInvitationRequest(bankAccount: BankAccountParams, {signerEmail, secondSignerEmail}: SignerEmails): PlannedRequest {
    return planRequest({
        name: REQUEST_NAMES.ASK_FOR_SIGNER_INFO,
        scope: bankAccount,
        type: 'write',
        command: WRITE_COMMANDS.ASK_FOR_SIGNER_INFORMATION,
        params: {...bankAccount, signerEmail, secondSignerEmail},
        onyxData: getAccountErrorOnyxData('common.genericErrorMessage'),
    });
}

function sendSignerReminder(bankAccount: BankAccountParams): Promise<RequestOutcome> {
    return runRequest({
        name: REQUEST_NAMES.SEND_SIGNER_REMINDER,
        scope: bankAccount,
        type: 'write',
        command: WRITE_COMMANDS.SEND_REMINDER_FOR_SIGNER_INFORMATION,
        params: bankAccount,
        onyxData: getAccountErrorOnyxData('common.genericErrorMessage'),
    });
}

export {getDirectorInfoRequest, getSignerInfoRequest, getSignerInvitationRequest, sendSignerReminder};
export type {DirectorInfo, SignerEmails};
