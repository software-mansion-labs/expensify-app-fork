/**
 * The requests of the signer step. The user as a director saves their name and job title, where a user who owns 25% or
 * more sends the name of the owner step. The directors who are not the user get an invitation email and, from the
 * waiting page, a reminder. The emails are the input of the send and never go to the draft.
 */
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';
import buildDirectorRequest from '@pages/SimplifiedBankOnboarding/flows/shared/signerDetails/directorRequest';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import getSignerAnswers from './getSignerAnswers';
import {getSignerFullName} from './signerRules';

type SignerEmails = Omit<WriteCommandParams[typeof WRITE_COMMANDS.ASK_FOR_SIGNER_INFORMATION], keyof BankAccountParams>;

const signerDetailsRequest: OnboardingRequest = {
    name: 'nonUSD.signer.saveDirector',
    build: (data) => buildDirectorRequest(data.bankAccount, {signerFullName: getSignerFullName(data), signerJobTitle: getSignerAnswers(data).signerJobTitle}),
};

const signerInvitationRequest: OnboardingRequest<SignerEmails> = {
    name: 'nonUSD.signer.askForSigners',
    build: ({bankAccount}, emails) => ({
        type: 'write',
        command: WRITE_COMMANDS.ASK_FOR_SIGNER_INFORMATION,
        params: {...bankAccount, ...emails},
    }),
};

const signerReminderRequest: OnboardingRequest = {
    name: 'nonUSD.signer.sendReminder',
    build: ({bankAccount}) => ({
        type: 'write',
        command: WRITE_COMMANDS.SEND_REMINDER_FOR_SIGNER_INFORMATION,
        params: bankAccount,
    }),
};

export {signerDetailsRequest, signerInvitationRequest, signerReminderRequest};
export type {SignerEmails};
