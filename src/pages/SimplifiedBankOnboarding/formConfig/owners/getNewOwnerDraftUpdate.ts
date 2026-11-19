import {EMPTY_OWNER_BUFFER} from '@pages/SimplifiedBankOnboarding/model/owners/ownerBuffer';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';

/** The answer of a question that leads to a new owner, with an empty buffer so the owner pages start blank */
function getNewOwnerDraftUpdate(answer: OnboardingDraft): OnboardingDraft {
    return {...answer, ...EMPTY_OWNER_BUFFER, ownerBeingModifiedID: null};
}

export default getNewOwnerDraftUpdate;
