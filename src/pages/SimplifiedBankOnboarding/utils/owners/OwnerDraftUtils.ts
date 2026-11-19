/**
 * Builds and reads the flat draft keys that hold the data of one beneficial owner. Both owner loops of the real flow
 * keep every owner field in the form draft under `beneficialOwner_${ownerID}_${field}`, with IDs made on the client.
 */
import type {BeneficialOwnerDataKey, OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';
import {getTextValue} from '@pages/SimplifiedBankOnboarding/utils/getSubStepValues';

import type {OnyxEntry} from 'react-native-onyx';

import {Str} from 'expensify-common';

function getOwnerInputID(ownerID: string, field: string): BeneficialOwnerDataKey {
    return `beneficialOwner_${ownerID}_${field}`;
}

function getOwnerDraftValue(draft: OnyxEntry<OnboardingForm>, ownerID: string, field: string): string {
    return getTextValue(draft, getOwnerInputID(ownerID, field)) ?? '';
}

function generateOwnerID(): string {
    return Str.guid();
}

export {generateOwnerID, getOwnerDraftValue, getOwnerInputID};
