import type {OwnerBuffer} from '@pages/SimplifiedBankOnboarding/model/owners/ownerBuffer';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';

/** The buffer lives only in the draft. The owner pages fill it before they show an owner. */
function getOwnerBufferAnswers(draft: OnboardingDraft | undefined): OwnerBuffer {
    return {
        ownerFirstName: draft?.ownerFirstName ?? '',
        ownerLastName: draft?.ownerLastName ?? '',
        ownerDob: draft?.ownerDob ?? '',
        ownerOwnershipPercentage: draft?.ownerOwnershipPercentage ?? '',
    };
}

export default getOwnerBufferAnswers;
