/**
 * The requests of the NonUSD signer: the save of the director details, the invitation of other directors and the
 * reminder sent to them. The invited director saves the same details from their own page under its own request name.
 */
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import getAccountErrorOnyxData from '@pages/SimplifiedBankOnboarding/requests/getAccountErrorOnyxData';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import runRequest from '@pages/SimplifiedBankOnboarding/requests/runRequest';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/requests/types';

type DirectorInfo = Omit<WriteCommandParams[typeof WRITE_COMMANDS.SAVE_ONBOARDING_DIRECTOR_INFORMATION], keyof BankAccountParams>;
type SignerEmails = Omit<WriteCommandParams[typeof WRITE_COMMANDS.ASK_FOR_SIGNER_INFORMATION], keyof BankAccountParams>;

function saveDirectorInfo(bankAccount: BankAccountParams, directorInfo: DirectorInfo): Promise<RequestOutcome> {
    return runRequest({
        name: REQUEST_NAMES.SAVE_DIRECTOR_INFO,
        type: 'write',
        command: WRITE_COMMANDS.SAVE_ONBOARDING_DIRECTOR_INFORMATION,
        params: {...bankAccount, ...directorInfo},
        onyxData: getAccountErrorOnyxData('common.genericErrorMessage'),
    });
}

/** The invited director is not in the flow, so the account error of the Payments page does not apply */
function saveSignerInfo(bankAccount: BankAccountParams, directorInfo: DirectorInfo): Promise<RequestOutcome> {
    return runRequest({
        name: REQUEST_NAMES.SAVE_SIGNER_INFO,
        type: 'write',
        command: WRITE_COMMANDS.SAVE_ONBOARDING_DIRECTOR_INFORMATION,
        params: {...bankAccount, ...directorInfo},
    });
}

function askForSignerInfo(bankAccount: BankAccountParams, signerEmails: SignerEmails): Promise<RequestOutcome> {
    return runRequest({
        name: REQUEST_NAMES.ASK_FOR_SIGNER_INFO,
        type: 'write',
        command: WRITE_COMMANDS.ASK_FOR_SIGNER_INFORMATION,
        params: {...bankAccount, ...signerEmails},
        onyxData: getAccountErrorOnyxData('common.genericErrorMessage'),
    });
}

function sendSignerReminder(bankAccount: BankAccountParams): Promise<RequestOutcome> {
    return runRequest({
        name: REQUEST_NAMES.SEND_SIGNER_REMINDER,
        type: 'write',
        command: WRITE_COMMANDS.SEND_REMINDER_FOR_SIGNER_INFORMATION,
        params: bankAccount,
        onyxData: getAccountErrorOnyxData('common.genericErrorMessage'),
    });
}

export {askForSignerInfo, saveDirectorInfo, saveSignerInfo, sendSignerReminder};
export type {DirectorInfo, SignerEmails};
