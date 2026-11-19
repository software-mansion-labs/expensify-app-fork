/**
 * Turns the owners that the server saved into draft values: the owner keys plus the flat keys of every owner. The step
 * writes them to the draft on resume, like the real `getDraftValuesForBeneficialOwners`. The mock server stores no
 * owner IDs, so the saved owners get IDs from their position.
 */
import {OWNER_FIELDS} from '@pages/SimplifiedBankOnboarding/nonUSD/BeneficialOwnerInfo/const';
import type {OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/types/onyx';
import {getOwnerInputID} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';

import type {OnyxEntry} from 'react-native-onyx';

type DraftValuesForBeneficialOwners = Partial<OnboardingForm> & {
    beneficialOwnerKeys: string[];
};

function getSavedOwnerID(index: number): string {
    return `saved${index}`;
}

function getDraftValuesForBeneficialOwners(account: OnyxEntry<OnboardingAccount>): DraftValuesForBeneficialOwners {
    const owners = account?.achData?.corpay?.beneficialOwners ?? [];
    const values: DraftValuesForBeneficialOwners = {beneficialOwnerKeys: owners.map((owner, index) => getSavedOwnerID(index))};

    for (const [index, owner] of owners.entries()) {
        const ownerID = getSavedOwnerID(index);
        values[getOwnerInputID(ownerID, OWNER_FIELDS.FULL_NAME)] = owner.fullName;
        values[getOwnerInputID(ownerID, OWNER_FIELDS.OWNERSHIP_PERCENTAGE)] = owner.ownershipPercentage;
    }
    return values;
}

export default getDraftValuesForBeneficialOwners;
