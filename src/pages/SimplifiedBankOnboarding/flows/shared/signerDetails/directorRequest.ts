/**
 * The SaveOnboardingDirectorInformation request of the signer details pages. The signer step of the NonUSD flow and the
 * invited director send it with different names and options. Neither touches the signer form itself, so each page shows
 * only the state of its own request (BC-16).
 */
import type {RequestSpec} from '@pages/SimplifiedBankOnboarding/core';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

type DirectorDetails = {
    signerFullName: string;
    signerJobTitle: string;
};

function buildDirectorRequest(bankAccount: BankAccountParams, details: DirectorDetails): RequestSpec {
    return {type: 'write', command: WRITE_COMMANDS.SAVE_ONBOARDING_DIRECTOR_INFORMATION, params: {...bankAccount, ...details}};
}

export default buildDirectorRequest;
