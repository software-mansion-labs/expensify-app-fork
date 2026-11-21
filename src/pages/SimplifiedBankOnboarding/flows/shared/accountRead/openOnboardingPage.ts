import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/core';
import {runRequest} from '@pages/SimplifiedBankOnboarding/core';
import {READ_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {ReadCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

type OpenOnboardingPageParams = Partial<ReadCommandParams[typeof READ_COMMANDS.OPEN_ONBOARDING_PAGE]>;

/**
 * Reads the account of a workspace or of a bank account. The server answers with the step the client asks for when the
 * account already reached it. Unlike the read of the old entry page it does not raise `isLoading` on the account key.
 */
function openOnboardingPage({policyID, bankAccountID, stepToOpen = '', subStep = '', localCurrentStep = ''}: OpenOnboardingPageParams): Promise<RequestOutcome> {
    return runRequest({
        name: REQUEST_NAMES.OPEN_ONBOARDING_PAGE,
        scope: {policyID, bankAccountID},
        type: 'read',
        command: READ_COMMANDS.OPEN_ONBOARDING_PAGE,
        params: {policyID, bankAccountID, stepToOpen, subStep, localCurrentStep},
    });
}

export default openOnboardingPage;
export type {OpenOnboardingPageParams};
