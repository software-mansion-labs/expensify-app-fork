/**
 * The owner pages edit one owner at a time through the buffer inputs of the draft. Each flow has its own kind of owner and
 * its own list in the draft, so each kind says once how its owner fills the buffer, how the buffer becomes its owner, and
 * where its list is saved.
 */
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {GlobalOwnerDraft, OnboardingDraft, OnboardingForm, USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/contract/form';

import type {OnyxEntry} from 'react-native-onyx';

type OwnerBuffer = Pick<OnboardingForm, typeof INPUT_IDS.OWNER_FIRST_NAME | typeof INPUT_IDS.OWNER_LAST_NAME | typeof INPUT_IDS.OWNER_DOB | typeof INPUT_IDS.OWNER_OWNERSHIP_PERCENTAGE>;

const EMPTY_OWNER_BUFFER: OwnerBuffer = {
    [INPUT_IDS.OWNER_FIRST_NAME]: '',
    [INPUT_IDS.OWNER_LAST_NAME]: '',
    [INPUT_IDS.OWNER_DOB]: '',
    [INPUT_IDS.OWNER_OWNERSHIP_PERCENTAGE]: '',
};

type OwnerBufferMapping<TOwner> = {
    /** An owner that the list does not hold yet starts with an empty buffer */
    getBuffer: (owner: TOwner | undefined) => OwnerBuffer;
    getOwner: (id: string, buffer: OwnerBuffer) => TOwner;
    getListUpdate: (owners: TOwner[]) => OnboardingDraft;
};

const USD_OWNER_BUFFER: OwnerBufferMapping<USDOwnerDraft> = {
    getBuffer: (owner) =>
        owner
            ? {
                  ...EMPTY_OWNER_BUFFER,
                  [INPUT_IDS.OWNER_FIRST_NAME]: owner.firstName,
                  [INPUT_IDS.OWNER_LAST_NAME]: owner.lastName,
                  [INPUT_IDS.OWNER_DOB]: owner.dob,
              }
            : EMPTY_OWNER_BUFFER,
    getOwner: (id, buffer) => ({
        id,
        firstName: buffer.ownerFirstName,
        lastName: buffer.ownerLastName,
        dob: buffer.ownerDob,
    }),
    getListUpdate: (owners) => ({usdOwners: owners}),
};

const GLOBAL_OWNER_BUFFER: OwnerBufferMapping<GlobalOwnerDraft> = {
    getBuffer: (owner) =>
        owner
            ? {
                  ...EMPTY_OWNER_BUFFER,
                  [INPUT_IDS.OWNER_FIRST_NAME]: owner.firstName,
                  [INPUT_IDS.OWNER_LAST_NAME]: owner.lastName,
                  [INPUT_IDS.OWNER_OWNERSHIP_PERCENTAGE]: owner.ownershipPercentage,
              }
            : EMPTY_OWNER_BUFFER,
    getOwner: (id, buffer) => ({
        id,
        firstName: buffer.ownerFirstName,
        lastName: buffer.ownerLastName,
        ownershipPercentage: buffer.ownerOwnershipPercentage,
    }),
    getListUpdate: (owners) => ({globalOwners: owners}),
};

function readOwnerBuffer(draft: OnyxEntry<OnboardingDraft>): OwnerBuffer {
    return {
        [INPUT_IDS.OWNER_FIRST_NAME]: draft?.ownerFirstName ?? '',
        [INPUT_IDS.OWNER_LAST_NAME]: draft?.ownerLastName ?? '',
        [INPUT_IDS.OWNER_DOB]: draft?.ownerDob ?? '',
        [INPUT_IDS.OWNER_OWNERSHIP_PERCENTAGE]: draft?.ownerOwnershipPercentage ?? '',
    };
}

export {EMPTY_OWNER_BUFFER, GLOBAL_OWNER_BUFFER, readOwnerBuffer, USD_OWNER_BUFFER};
export type {OwnerBuffer, OwnerBufferMapping};
