/**
 * Converts the owners of the NonUSD owner step between the server and the form. The server stores one full name, so the
 * form splits it into its two inputs and joins them again for the request. A name with more than two words loses its
 * middle part on that way back, as in the real flow. The frozen backend keeps that loss, and this file confines it.
 */
import type {DraftFields} from '@pages/SimplifiedBankOnboarding/requests/buildTrackedRequestData';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {GlobalBeneficialOwner} from '@pages/SimplifiedBankOnboarding/types/onyx';
import {getOwnerDraftKeys, getOwnerInputID} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';
import type {OwnerValues, SavedOwners} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';
import {getTextValue} from '@pages/SimplifiedBankOnboarding/values/resolveValue';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/values/resolveValue';

import type {ValueOf} from 'type-fest';

/** The fields of one owner, the last part of its flat draft keys */
const OWNER_FIELDS = {
    FIRST_NAME: 'firstName',
    LAST_NAME: 'lastName',
    OWNERSHIP_PERCENTAGE: 'ownershipPercentage',
} as const;

type GlobalOwnerField = ValueOf<typeof OWNER_FIELDS>;

type GlobalOwnerValues = OwnerValues<GlobalOwnerField>;

const GLOBAL_OWNER_FIELDS: readonly GlobalOwnerField[] = Object.values(OWNER_FIELDS);

function splitFullName(fullName: string): Pick<GlobalOwnerValues, 'firstName' | 'lastName'> {
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

function toForm(owners: GlobalBeneficialOwner[] | undefined): SavedOwners<GlobalOwnerField> {
    const savedOwners: SavedOwners<GlobalOwnerField> = {ownerKeys: [], owners: {}};
    for (const owner of owners ?? []) {
        savedOwners.ownerKeys.push(owner.uid);
        savedOwners.owners[owner.uid] = {...splitFullName(owner.fullName), ownershipPercentage: owner.ownershipPercentage};
    }
    return savedOwners;
}

function toParams(ownerID: string, values: GlobalOwnerValues): GlobalBeneficialOwner {
    return {
        uid: ownerID,
        fullName: `${values.firstName} ${values.lastName}`.trim(),
        ownershipPercentage: values.ownershipPercentage,
    };
}

/** The full name of one owner: the names in the draft when the user changed them, else the saved name as the server holds it */
function resolveOwnerFullName(draft: OnboardingDraft, owners: GlobalBeneficialOwner[] | undefined, ownerID: string): string {
    const firstName = getTextValue(draft, getOwnerInputID(ownerID, OWNER_FIELDS.FIRST_NAME)) ?? '';
    const lastName = getTextValue(draft, getOwnerInputID(ownerID, OWNER_FIELDS.LAST_NAME)) ?? '';
    const draftFullName = `${firstName} ${lastName}`.trim();
    return draftFullName || (owners?.find((owner) => owner.uid === ownerID)?.fullName ?? '');
}

/** The draft fields that the save of the step makes obsolete: the answers, the loop state and every owner key */
function getFieldsToClear(draft: OnboardingDraft): DraftFields {
    return [
        INPUT_IDS.OWNS_MORE_THAN_25_PERCENT,
        INPUT_IDS.ANY_INDIVIDUAL_OWN_25_PERCENT_OR_MORE,
        INPUT_IDS.BENEFICIAL_OWNERS,
        'beneficialOwnerKeys',
        'ownerBeingModifiedID',
        'isEditingCreatedOwner',
        ...getOwnerDraftKeys(draft),
    ];
}

export {GLOBAL_OWNER_FIELDS, OWNER_FIELDS, getFieldsToClear, resolveOwnerFullName, toForm, toParams};
export type {GlobalOwnerField, GlobalOwnerValues};
