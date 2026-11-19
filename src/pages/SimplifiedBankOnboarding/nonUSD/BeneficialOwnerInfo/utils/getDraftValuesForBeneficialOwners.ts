/**
 * Turns the owners that the server saved into draft values: the owner keys plus the flat keys of every owner. The step
 * writes them to the draft on resume, like the real `getDraftValuesForBeneficialOwners`. The server stores one full name,
 * so the split into the two name inputs drops the middle part of a name with more than two words, as the real flow does.
 */
import OWNER_FIELDS from '@pages/SimplifiedBankOnboarding/nonUSD/BeneficialOwnerInfo/OWNER_FIELDS';
import type {OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/types/onyx';
import {getOwnerInputID} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';

import type {OnyxEntry} from 'react-native-onyx';

type DraftValuesForBeneficialOwners = Partial<OnboardingForm> & {
    beneficialOwnerKeys: string[];
};

type SplitName = {
    firstName: string;
    lastName: string;
};

function splitFullName(fullName: string): SplitName {
    const trimmedFullName = fullName.trim();
    const firstSpaceIndex = trimmedFullName.indexOf(' ');
    if (firstSpaceIndex === -1) {
        return {firstName: trimmedFullName, lastName: ''};
    }
    return {
        firstName: trimmedFullName.substring(0, firstSpaceIndex).trim(),
        lastName: trimmedFullName.substring(trimmedFullName.lastIndexOf(' ')).trim(),
    };
}

function getDraftValuesForBeneficialOwners(account: OnyxEntry<OnboardingAccount>): DraftValuesForBeneficialOwners {
    const owners = account?.achData?.corpay?.beneficialOwners ?? [];
    const values: DraftValuesForBeneficialOwners = {beneficialOwnerKeys: owners.map((owner) => owner.uid)};

    for (const owner of owners) {
        const {firstName, lastName} = splitFullName(owner.fullName);
        values[getOwnerInputID(owner.uid, OWNER_FIELDS.FIRST_NAME)] = firstName;
        values[getOwnerInputID(owner.uid, OWNER_FIELDS.LAST_NAME)] = lastName;
        values[getOwnerInputID(owner.uid, OWNER_FIELDS.OWNERSHIP_PERCENTAGE)] = owner.ownershipPercentage;
    }
    return values;
}

export default getDraftValuesForBeneficialOwners;
