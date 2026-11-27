/**
 * The one write of the NonUSD owners step. It sends the answer about the user and the owner list, the user included
 * only while the user owns 25%. The answer about the other owners follows the sent list.
 */
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';
import {CURRENT_USER_OWNER_ID, removeOwner} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/ownerList';
import {getGlobalOwnersParams} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/ownerParams';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import getOwnersAnswers from './getOwnersAnswers';

const globalOwnersRequest: OnboardingRequest = {
    name: 'nonUSD.beneficialOwners.save',
    build: (data) => {
        const answers = getOwnersAnswers(data);
        const isUserOwner = answers.ownsMoreThan25Percent ?? false;
        const sentOwners = isUserOwner ? answers.owners : removeOwner(answers.owners, CURRENT_USER_OWNER_ID);
        return {
            type: 'write',
            command: WRITE_COMMANDS.SAVE_ONBOARDING_BENEFICIAL_OWNERS,
            params: {
                ...data.bankAccount,
                ownsMoreThan25Percent: isUserOwner,
                ...getGlobalOwnersParams(sentOwners),
            },
        };
    },
};

export default globalOwnersRequest;
