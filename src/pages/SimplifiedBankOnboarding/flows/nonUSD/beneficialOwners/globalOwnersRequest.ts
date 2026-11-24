/**
 * The one write of the NonUSD owners step. It sends the answer about the user and the owner list, the user included
 * only while the user owns 25%. The answer about the other owners follows the sent list.
 */
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';
import {getNonUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/nonUSD/nonUSDAnswers';
import {CURRENT_USER_OWNER_ID, removeOwner} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/ownerList';
import {getGlobalOwnersParams} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/ownerParams';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

const globalOwnersRequest: OnboardingRequest = {
    name: 'nonUSD.beneficialOwners.save',
    build: ({bankAccount, account, draft, currency}) => {
        const answers = getNonUSDAnswers(draft, account, currency);
        const isUserOwner = answers.ownsMoreThan25Percent ?? false;
        const sentOwners = isUserOwner ? answers.owners : removeOwner(answers.owners, CURRENT_USER_OWNER_ID);
        return {
            type: 'write',
            command: WRITE_COMMANDS.SAVE_ONBOARDING_BENEFICIAL_OWNERS,
            params: {
                ...bankAccount,
                ownsMoreThan25Percent: isUserOwner,
                ...getGlobalOwnersParams(sentOwners),
            },
        };
    },
};

export default globalOwnersRequest;
