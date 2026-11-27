/**
 * Maps the draft owner lists to the parameters of the owner requests. Both servers take the owners as a JSON string,
 * the same way as the real flow sends them.
 */
import type {GlobalOwnerDraft, USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import {getOwnerFullName} from '@pages/SimplifiedBankOnboarding/contract/ownerNames';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';

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
        beneficialOwners: JSON.stringify(owners.map(({firstName, lastName, dob}) => ({firstName, lastName, dob}))),
        beneficialOwnerKeys: owners.map((owner) => owner.id),
    };
}

/** Anyone in the list other than the current user is another owner, so the answer to that question follows the list */
function getGlobalOwnersParams(owners: GlobalOwnerDraft[]): GlobalOwnersParams {
    return {
        anyIndividualOwn25PercentOrMore: owners.some((owner) => owner.id !== SBO_CONST.NON_USD.CURRENT_USER_KEY),
        beneficialOwners: JSON.stringify(owners.map((owner) => ({uid: owner.id, fullName: getOwnerFullName(owner), ownershipPercentage: owner.ownershipPercentage}))),
    };
}

export {getGlobalOwnersParams, getUSDOwnersParams};
export type {GlobalOwnersParams, USDOwnersParams};
