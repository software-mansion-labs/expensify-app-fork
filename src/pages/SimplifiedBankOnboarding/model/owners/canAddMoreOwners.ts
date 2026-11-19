/**
 * The limits of the owner lists. USD counts people: the user plus the listed owners may not exceed the maximum.
 * NonUSD counts ownership: the user may add another owner while the listed shares leave room for one more holder of 25%.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {GlobalOwnerDraft, USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/types/form';

/** The USD list holds the other owners only, the user is the requestor and takes one of the places when they own 25% */
function canAddMoreUSDOwners(owners: USDOwnerDraft[], isUserOwner: boolean): boolean {
    const placesForOthers = SBO_CONST.USD.MAX_NUMBER_OF_UBOS - (isUserOwner ? 1 : 0);
    return owners.length < placesForOthers;
}

function getOwnershipPercentage(owner: GlobalOwnerDraft): number {
    const percentage = Number(owner.ownershipPercentage);
    return Number.isFinite(percentage) ? percentage : 0;
}

/** The excluded owner is the one being edited, whose new share replaces the one in the list */
function getOwnershipPercentageSum(owners: GlobalOwnerDraft[], excludedOwnerID?: string | null): number {
    return owners.filter((owner) => owner.id !== excludedOwnerID).reduce((sum, owner) => sum + getOwnershipPercentage(owner), 0);
}

function canAddMoreGlobalOwners(owners: GlobalOwnerDraft[]): boolean {
    return getOwnershipPercentageSum(owners) <= SBO_CONST.NON_USD.MAX_OWNERSHIP_SUM_TO_ADD_MORE;
}

export {canAddMoreGlobalOwners, canAddMoreUSDOwners, getOwnershipPercentageSum};
