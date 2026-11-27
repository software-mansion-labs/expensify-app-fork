/**
 * The one write of the USD agreements step. It sends the three agreements that the draft holds. The server answer may
 * ask for company documents, which decides the step that opens next.
 */
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';
import getUSDWriteOptions from '@pages/SimplifiedBankOnboarding/flows/usd/usdWriteOptions';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import getAgreementsAnswers from './getAgreementsAnswers';

const achContractRequest: OnboardingRequest = {
    name: 'usd.completeVerification.acceptContract',
    build: (data) => ({
        type: 'write',
        command: WRITE_COMMANDS.ACCEPT_ACH_CONTRACT,
        params: {...data.bankAccount, ...getAgreementsAnswers(data)},
        ...getUSDWriteOptions(),
    }),
};

export default achContractRequest;
