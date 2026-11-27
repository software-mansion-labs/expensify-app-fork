/**
 * The requests of the NonUSD signer step: the save of the director details, the invitation of other directors and the
 * reminder sent to them. The plan names the first two as the requests of their pages, which the controller sends, and
 * the hang tight page sends the reminder itself.
 */
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/core';
import {planRequest} from '@pages/SimplifiedBankOnboarding/core';
import getAccountErrorOnyxData from '@pages/SimplifiedBankOnboarding/flows/shared/getAccountErrorOnyxData';
import type {DirectorInfo} from '@pages/SimplifiedBankOnboarding/flows/shared/signerDetails/getSignerInfoRequest';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

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

function getSignerReminderRequest(bankAccount: BankAccountParams): PlannedRequest {
    return planRequest({
        name: REQUEST_NAMES.SEND_SIGNER_REMINDER,
        scope: bankAccount,
        type: 'write',
        command: WRITE_COMMANDS.SEND_REMINDER_FOR_SIGNER_INFORMATION,
        params: bankAccount,
        onyxData: getAccountErrorOnyxData('common.genericErrorMessage'),
    });
}

export {getDirectorInfoRequest, getSignerInvitationRequest, getSignerReminderRequest};
