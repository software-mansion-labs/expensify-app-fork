/**
 * Reads the share of every owner from the draft. The step uses the sum to decide whether more owners can be added, and
 * the percentage page uses the shares to keep the total at 100 or below, like the real step does.
 */
import OWNER_FIELDS from '@pages/SimplifiedBankOnboarding/nonUSD/BeneficialOwnerInfo/OWNER_FIELDS';
import type {OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';
import {getOwnerDraftValue} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';

import type {OnyxEntry} from 'react-native-onyx';

function getTotalOwnedPercentage(ownerKeys: string[], draft: OnyxEntry<OnboardingForm>): Record<string, number> {
    return Object.fromEntries(ownerKeys.map((ownerID) => [ownerID, Number(getOwnerDraftValue(draft, ownerID, OWNER_FIELDS.OWNERSHIP_PERCENTAGE)) || 0]));
}

function getTotalOwnedPercentageSum(ownerKeys: string[], draft: OnyxEntry<OnboardingForm>): number {
    return Object.values(getTotalOwnedPercentage(ownerKeys, draft)).reduce((sum, percentage) => sum + percentage, 0);
}

export default getTotalOwnedPercentage;
export {getTotalOwnedPercentageSum};
