/**
 * The one write of the USD agreements step. It sends the three agreements that the draft holds. The server answer may
 * ask for company documents, which decides the step that opens next.
 */
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';
import {getUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/usd/usdAnswers';
import getUSDWriteOptions from '@pages/SimplifiedBankOnboarding/flows/usd/usdWriteOptions';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

const achContractRequest: OnboardingRequest = {
    name: 'usd.completeVerification.acceptContract',
    build: ({bankAccount, account, draft}) => {
        const answers = getUSDAnswers(draft, account);
        return {
            type: 'write',
            command: WRITE_COMMANDS.ACCEPT_ACH_CONTRACT,
            params: {
                ...bankAccount,
                isAuthorizedToUseBankAccount: answers.isAuthorizedToUseBankAccount,
                certifyTrueInformation: answers.certifyTrueInformation,
                acceptTermsAndConditions: answers.acceptTermsAndConditions,
            },
            ...getUSDWriteOptions(),
        };
    },
};

export default achContractRequest;
