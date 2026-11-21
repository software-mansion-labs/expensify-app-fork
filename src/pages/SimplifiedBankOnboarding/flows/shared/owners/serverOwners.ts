/**
 * Builds the draft owner lists from what the server saved. The answers use them when the draft has no list of its own,
 * which is the case after the user left the flow and came back.
 */
import type {GlobalOwnerDraft, USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {ACHData, CorpayData} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import {splitFullName} from '@pages/SimplifiedBankOnboarding/contract/ownerNames';

/** The USD server keeps the owner IDs in a list next to the owners. An owner without an ID gets one from its position. */
function getUSDOwnersFromServer(achData: ACHData | undefined): USDOwnerDraft[] {
    const ownerKeys = achData?.beneficialOwnerKeys ?? [];
    return (achData?.beneficialOwners ?? []).map((owner, index) => ({
        id: ownerKeys.at(index) ?? `owner-${index}`,
        firstName: owner.firstName,
        lastName: owner.lastName,
        dob: owner.dob,
    }));
}

function getGlobalOwnersFromServer(corpay: CorpayData | undefined): GlobalOwnerDraft[] {
    return (corpay?.beneficialOwners ?? []).map((owner) => ({
        id: owner.uid,
        ...splitFullName(owner.fullName),
        ownershipPercentage: owner.ownershipPercentage,
    }));
}

export {getGlobalOwnersFromServer, getUSDOwnersFromServer};
