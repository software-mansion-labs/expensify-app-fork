/**
 * The owner pages edit one owner at a time through four buffer inputs of the draft. Each flow has its own kind of owner
 * and its own list in the draft, so it describes once how its owner goes into the buffer when the user opens it, how the
 * buffer becomes an owner when the user confirms it and where the list is saved.
 */
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {GlobalOwnerDraft, OnboardingDraft, OnboardingForm, USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/contract/form';

import type {Owner} from './ownerList';

type OwnerBuffer = Pick<OnboardingForm, typeof INPUT_IDS.OWNER_FIRST_NAME | typeof INPUT_IDS.OWNER_LAST_NAME | typeof INPUT_IDS.OWNER_DOB | typeof INPUT_IDS.OWNER_OWNERSHIP_PERCENTAGE>;

const EMPTY_OWNER_BUFFER: OwnerBuffer = {
    [INPUT_IDS.OWNER_FIRST_NAME]: '',
    [INPUT_IDS.OWNER_LAST_NAME]: '',
    [INPUT_IDS.OWNER_DOB]: '',
    [INPUT_IDS.OWNER_OWNERSHIP_PERCENTAGE]: '',
};

type OwnerDraftMapping<TOwner extends Owner> = {
    /** An owner the list does not know yet starts with an empty buffer */
    getBuffer: (owner: TOwner | undefined) => OwnerBuffer;
    getOwner: (id: string, buffer: OwnerBuffer) => TOwner;

    /** The draft write that saves the owner list of the flow */
    getOwnersDraftUpdate: (owners: TOwner[]) => OnboardingDraft;
};

const USD_OWNER_DRAFT: OwnerDraftMapping<USDOwnerDraft> = {
    getBuffer: (owner) =>
        owner ? {...EMPTY_OWNER_BUFFER, [INPUT_IDS.OWNER_FIRST_NAME]: owner.firstName, [INPUT_IDS.OWNER_LAST_NAME]: owner.lastName, [INPUT_IDS.OWNER_DOB]: owner.dob} : EMPTY_OWNER_BUFFER,
    getOwner: (id, buffer) => ({id, firstName: buffer.ownerFirstName, lastName: buffer.ownerLastName, dob: buffer.ownerDob}),
    getOwnersDraftUpdate: (owners) => ({usdOwners: owners}),
};

const GLOBAL_OWNER_DRAFT: OwnerDraftMapping<GlobalOwnerDraft> = {
    getBuffer: (owner) =>
        owner
            ? {
                  ...EMPTY_OWNER_BUFFER,
                  [INPUT_IDS.OWNER_FIRST_NAME]: owner.firstName,
                  [INPUT_IDS.OWNER_LAST_NAME]: owner.lastName,
                  [INPUT_IDS.OWNER_OWNERSHIP_PERCENTAGE]: owner.ownershipPercentage,
              }
            : EMPTY_OWNER_BUFFER,
    getOwner: (id, buffer) => ({id, firstName: buffer.ownerFirstName, lastName: buffer.ownerLastName, ownershipPercentage: buffer.ownerOwnershipPercentage}),
    getOwnersDraftUpdate: (owners) => ({globalOwners: owners}),
};

export {EMPTY_OWNER_BUFFER, GLOBAL_OWNER_DRAFT, USD_OWNER_DRAFT};
export type {OwnerBuffer, OwnerDraftMapping};
