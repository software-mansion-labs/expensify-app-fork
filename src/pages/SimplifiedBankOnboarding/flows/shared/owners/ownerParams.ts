/**
 * Maps the owner lists of the draft to the owner parameters of the two owner requests. Both servers take the owners as a
 * JSON string, the way the real flow sends them.
 */
import type {GlobalOwnerDraft, USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/contract/form';

import {CURRENT_USER_OWNER_ID} from './ownerList';
import {getOwnerFullName} from './serverOwners';

type USDOwnersParams = {
    beneficialOwners: string;
    beneficialOwnerKeys: string[];
};

type GlobalOwnersParams = {
    anyIndividualOwn25PercentOrMore: boolean;
    beneficialOwners: string;
};

function getUSDOwnersParams(owners: USDOwnerDraft[]): USDOwnersParams {
    return {
        beneficialOwners: JSON.stringify(
            owners.map(({firstName, lastName, dob}) => ({
                firstName,
                lastName,
                dob,
            })),
        ),
        beneficialOwnerKeys: owners.map((owner) => owner.id),
    };
}

/** Anyone sent other than the user is another owner, so the server answer to that question follows the sent list */
function getGlobalOwnersParams(owners: GlobalOwnerDraft[]): GlobalOwnersParams {
    return {
        anyIndividualOwn25PercentOrMore: owners.some((owner) => owner.id !== CURRENT_USER_OWNER_ID),
        beneficialOwners: JSON.stringify(
            owners.map((owner) => ({
                uid: owner.id,
                fullName: getOwnerFullName(owner),
                ownershipPercentage: owner.ownershipPercentage,
            })),
        ),
    };
}

export {getGlobalOwnersParams, getUSDOwnersParams};
