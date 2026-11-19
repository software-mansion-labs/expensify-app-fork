/**
 * Reads the data of one owner from the flat keys of the draft, in the shape that the server stores: the two name inputs
 * joined into one full name. It mirrors the real `getValuesForBeneficialOwner`, which reads only the draft.
 */
import {OWNER_FIELDS} from '@pages/SimplifiedBankOnboarding/nonUSD/BeneficialOwnerInfo/const';
import type {OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';
import type {GlobalBeneficialOwner} from '@pages/SimplifiedBankOnboarding/types/onyx';
import {getOwnerDraftValue} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';

import type {OnyxEntry} from 'react-native-onyx';

function getValuesForBeneficialOwner(ownerID: string, draft: OnyxEntry<OnboardingForm>): GlobalBeneficialOwner {
    const firstName = getOwnerDraftValue(draft, ownerID, OWNER_FIELDS.FIRST_NAME);
    const lastName = getOwnerDraftValue(draft, ownerID, OWNER_FIELDS.LAST_NAME);
    return {
        uid: ownerID,
        fullName: `${firstName} ${lastName}`.trim(),
        ownershipPercentage: getOwnerDraftValue(draft, ownerID, OWNER_FIELDS.OWNERSHIP_PERCENTAGE),
    };
}

export default getValuesForBeneficialOwner;
