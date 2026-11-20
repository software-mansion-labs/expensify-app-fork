/**
 * Converts the owners of the USD owner step between the server and the form. The server keeps the owner IDs that the
 * client made in `beneficialOwnerKeys`, in the same order as the owners, so an owner is matched to its ID by position.
 */
import type {DraftFields} from '@pages/SimplifiedBankOnboarding/requests/buildTrackedRequestData';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {ACHData, BeneficialOwner} from '@pages/SimplifiedBankOnboarding/types/onyx';
import {getOwnerDraftKeys} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';
import type {OwnerValues, SavedOwners} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/values/resolveValue';

import type {TupleToUnion} from 'type-fest';

const UBO_FIELDS = [INPUT_IDS.FIRST_NAME, INPUT_IDS.LAST_NAME, INPUT_IDS.DOB] as const;

type UBOField = TupleToUnion<typeof UBO_FIELDS>;

type UBOValues = OwnerValues<UBOField>;

function toForm(achData: ACHData | undefined): SavedOwners<UBOField> {
    const ownerKeys = achData?.beneficialOwnerKeys ?? [];
    const savedOwners: SavedOwners<UBOField> = {ownerKeys, owners: {}};
    for (const [index, ownerID] of ownerKeys.entries()) {
        const owner = achData?.beneficialOwners?.at(index);
        if (owner) {
            savedOwners.owners[ownerID] = {firstName: owner.firstName, lastName: owner.lastName, dob: owner.dob};
        }
    }
    return savedOwners;
}

function toParams(values: UBOValues): BeneficialOwner {
    return {firstName: values.firstName, lastName: values.lastName, dob: values.dob};
}

/** The draft fields that the save of the step makes obsolete: the answers, the loop state and every owner key */
function getFieldsToClear(draft: OnboardingDraft): DraftFields {
    return [INPUT_IDS.OWNS_MORE_THAN_25_PERCENT, INPUT_IDS.HAS_OTHER_BENEFICIAL_OWNERS, 'beneficialOwnerKeys', 'ownerBeingModifiedID', 'isEditingCreatedOwner', ...getOwnerDraftKeys(draft)];
}

export {UBO_FIELDS, getFieldsToClear, toForm, toParams};
export type {UBOField, UBOValues};
