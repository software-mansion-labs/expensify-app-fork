/**
 * The owner pages edit one owner at a time through four buffer inputs of the draft. These helpers copy an owner into the
 * buffer when the user opens it and build the owner back from the buffer when the user confirms it.
 */
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {GlobalOwnerDraft, OnboardingForm, USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/types/form';

type OwnerBuffer = Pick<OnboardingForm, typeof INPUT_IDS.OWNER_FIRST_NAME | typeof INPUT_IDS.OWNER_LAST_NAME | typeof INPUT_IDS.OWNER_DOB | typeof INPUT_IDS.OWNER_OWNERSHIP_PERCENTAGE>;

const EMPTY_OWNER_BUFFER: OwnerBuffer = {
    [INPUT_IDS.OWNER_FIRST_NAME]: '',
    [INPUT_IDS.OWNER_LAST_NAME]: '',
    [INPUT_IDS.OWNER_DOB]: '',
    [INPUT_IDS.OWNER_OWNERSHIP_PERCENTAGE]: '',
};

/** An owner the list does not know yet starts with an empty buffer */
function getUSDOwnerBuffer(owner: USDOwnerDraft | undefined): OwnerBuffer {
    if (!owner) {
        return EMPTY_OWNER_BUFFER;
    }
    return {...EMPTY_OWNER_BUFFER, [INPUT_IDS.OWNER_FIRST_NAME]: owner.firstName, [INPUT_IDS.OWNER_LAST_NAME]: owner.lastName, [INPUT_IDS.OWNER_DOB]: owner.dob};
}

function getGlobalOwnerBuffer(owner: GlobalOwnerDraft | undefined): OwnerBuffer {
    if (!owner) {
        return EMPTY_OWNER_BUFFER;
    }
    return {
        ...EMPTY_OWNER_BUFFER,
        [INPUT_IDS.OWNER_FIRST_NAME]: owner.firstName,
        [INPUT_IDS.OWNER_LAST_NAME]: owner.lastName,
        [INPUT_IDS.OWNER_OWNERSHIP_PERCENTAGE]: owner.ownershipPercentage,
    };
}

function getUSDOwnerFromBuffer(id: string, buffer: OwnerBuffer): USDOwnerDraft {
    return {id, firstName: buffer.ownerFirstName, lastName: buffer.ownerLastName, dob: buffer.ownerDob};
}

function getGlobalOwnerFromBuffer(id: string, buffer: OwnerBuffer): GlobalOwnerDraft {
    return {id, firstName: buffer.ownerFirstName, lastName: buffer.ownerLastName, ownershipPercentage: buffer.ownerOwnershipPercentage};
}

export {EMPTY_OWNER_BUFFER, getGlobalOwnerBuffer, getGlobalOwnerFromBuffer, getUSDOwnerBuffer, getUSDOwnerFromBuffer};
export type {OwnerBuffer};
