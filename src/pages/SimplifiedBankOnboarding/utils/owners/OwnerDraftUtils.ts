/**
 * Builds and resolves the flat draft keys that hold the data of one beneficial owner. Both owner loops keep every owner
 * field in the form draft under `beneficialOwner_${ownerID}_${field}`, with IDs made on the client, because the form
 * library needs flat input IDs. Each owner field follows the rule of the other inputs: the draft wins until the step is
 * saved, then the owner that the server holds under the same ID.
 */
import type {BeneficialOwnerDataKey} from '@pages/SimplifiedBankOnboarding/types/form';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/values/resolveValue';
import {getTextValue} from '@pages/SimplifiedBankOnboarding/values/resolveValue';

import {Str} from 'expensify-common';

const OWNER_KEY_PREFIX = 'beneficialOwner_';

type OwnerValues<TField extends string> = Record<TField, string>;

/** The owners that the server holds, in the shape of the form, by owner ID */
type SavedOwners<TField extends string> = {
    ownerKeys: string[];
    owners: Record<string, OwnerValues<TField>>;
};

function getOwnerInputID(ownerID: string, field: string): BeneficialOwnerDataKey {
    return `${OWNER_KEY_PREFIX}${ownerID}_${field}`;
}

/** The owner list is the one that the user edits in the draft, and the saved one until the user changes it */
function resolveOwnerKeys<TField extends string>(draft: OnboardingDraft, savedOwners: SavedOwners<TField>): string[] {
    return draft?.beneficialOwnerKeys ?? savedOwners.ownerKeys;
}

function resolveOwnerValues<TField extends string>(draft: OnboardingDraft, savedOwners: SavedOwners<TField>, ownerID: string, fields: readonly TField[]): OwnerValues<TField> {
    const savedOwner = savedOwners.owners[ownerID];
    const values: Partial<OwnerValues<TField>> = {};
    for (const field of fields) {
        values[field] = getTextValue(draft, getOwnerInputID(ownerID, field)) ?? savedOwner?.[field] ?? '';
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- The loop fills every field of `fields`, which TypeScript cannot follow through the iteration
    return values as OwnerValues<TField>;
}

/** Every owner key in the draft, including the keys of owners that the user removed from the list */
function getOwnerDraftKeys(draft: OnboardingDraft): BeneficialOwnerDataKey[] {
    return Object.keys(draft ?? {}).filter((key): key is BeneficialOwnerDataKey => key.startsWith(OWNER_KEY_PREFIX));
}

function generateOwnerID(): string {
    return Str.guid();
}

export {generateOwnerID, getOwnerDraftKeys, getOwnerInputID, resolveOwnerKeys, resolveOwnerValues};
export type {OwnerValues, SavedOwners};
