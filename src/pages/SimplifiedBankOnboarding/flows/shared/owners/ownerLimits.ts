/**
 * The limits of the owner lists. USD counts people: the user and the listed owners together may not pass the maximum.
 * NonUSD counts ownership: another owner fits while the listed shares leave room for one more holder of 25%.
 */
import {isValidOwnershipPercentage} from '@libs/ValidationUtils';

import type {GlobalOwnerDraft, USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';

/** The USD list holds the other owners only. The user, when an owner, takes one of the places. */
const MAX_USD_OWNERS_NEXT_TO_USER = SBO_CONST.USD.MAX_NUMBER_OF_UBOS - 1;

/** Every owner holds at least 25%, so at most three others fit next to a user who owns 25% */
const MAX_GLOBAL_OWNERS_NEXT_TO_USER = 3;

function canAddMoreUSDOwners(owners: USDOwnerDraft[], isUserOwner: boolean): boolean {
    return owners.length < (isUserOwner ? MAX_USD_OWNERS_NEXT_TO_USER : SBO_CONST.USD.MAX_NUMBER_OF_UBOS);
}

/** A share that is not a number counts as 0, as an empty share does while the user has not typed it */
function getOwnershipPercentage(owner: GlobalOwnerDraft): number {
    return Number(owner.ownershipPercentage) || 0;
}

/** `excludedOwnerID` is the owner being edited, whose new share replaces the one in the list */
function getOwnershipSum(owners: GlobalOwnerDraft[], excludedOwnerID?: string): number {
    return owners.filter((owner) => owner.id !== excludedOwnerID).reduce((sum, owner) => sum + getOwnershipPercentage(owner), 0);
}

function canAddMoreGlobalOwners(owners: GlobalOwnerDraft[]): boolean {
    return getOwnershipSum(owners) <= SBO_CONST.NON_USD.MAX_OWNERSHIP_SUM_TO_ADD_MORE;
}

/** A share from 25 to 100 that, with the shares of the other owners, stays at 100 or below */
function isValidGlobalOwnerShare(value: string, owners: GlobalOwnerDraft[], ownerBeingModifiedID: string): boolean {
    const sharesByOwnerID = Object.fromEntries(owners.map((owner) => [owner.id, getOwnershipPercentage(owner)]));
    return isValidOwnershipPercentage(value, sharesByOwnerID, ownerBeingModifiedID);
}

export {canAddMoreGlobalOwners, canAddMoreUSDOwners, getOwnershipSum, isValidGlobalOwnerShare, MAX_GLOBAL_OWNERS_NEXT_TO_USER, MAX_USD_OWNERS_NEXT_TO_USER};
