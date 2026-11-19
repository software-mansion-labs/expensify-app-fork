/**
 * Reads the data of one owner from the flat keys of the draft. Like the real `getValuesForBeneficialOwner`, it reads
 * only the draft, so the list, the confirmation page and the request all show what the user typed on this device.
 */
import type {OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {BeneficialOwner} from '@pages/SimplifiedBankOnboarding/types/onyx';
import {getOwnerDraftValue} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';

import type {OnyxEntry} from 'react-native-onyx';

function getValuesForBeneficialOwner(ownerID: string, draft: OnyxEntry<OnboardingForm>): BeneficialOwner {
    return {
        firstName: getOwnerDraftValue(draft, ownerID, INPUT_IDS.FIRST_NAME),
        lastName: getOwnerDraftValue(draft, ownerID, INPUT_IDS.LAST_NAME),
        dob: getOwnerDraftValue(draft, ownerID, INPUT_IDS.DOB),
    };
}

export default getValuesForBeneficialOwner;
