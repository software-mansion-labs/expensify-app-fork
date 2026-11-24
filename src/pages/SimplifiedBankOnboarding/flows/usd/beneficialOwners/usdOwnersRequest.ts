/**
 * The one write of the USD owners step. It sends the answer about the user and every other owner of the list, or no
 * owners when the user said nobody else owns 25%, so the list of an earlier "yes" is not sent.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';
import {getUSDOwnersParams} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/ownerParams';
import getUSDWriteOptions from '@pages/SimplifiedBankOnboarding/flows/usd/usdWriteOptions';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import getOwnersAnswers from './getOwnersAnswers';

const usdOwnersRequest: OnboardingRequest = {
    name: 'usd.beneficialOwners.save',
    build: (data) => {
        const answers = getOwnersAnswers(data);
        const sentOwners = answers.hasOtherBeneficialOwners ? answers.owners : [];
        return {
            type: 'write',
            command: WRITE_COMMANDS.UPDATE_BENEFICIAL_OWNERS,
            params: {
                ...data.bankAccount,
                ownsMoreThan25Percent: answers.ownsMoreThan25Percent ?? false,
                ...getUSDOwnersParams(sentOwners),
            },
            ...getUSDWriteOptions(SBO_CONST.USD.STEP.BENEFICIAL_OWNERS),
        };
    },
};

export default usdOwnersRequest;
