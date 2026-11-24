/**
 * Reads the owners that the server saved as the owner lists of the draft. The answers use them while the draft has no
 * list of its own, which is the case after the user left the flow and came back. It also joins and splits the full name,
 * because the global provider keeps one full name where the owner pages ask for two.
 */
import type {GlobalOwnerDraft, USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {ACHData, CorpayData} from '@pages/SimplifiedBankOnboarding/contract/onyx';

import type {OnyxEntry} from 'react-native-onyx';

type OwnerName = Pick<USDOwnerDraft, 'firstName' | 'lastName'>;

/**
 * The global provider keeps one full name, but the owner pages ask for a first and a last name. The first word is the
 * first name and the rest is the last name, so a middle name stays in the last name (BC-09).
 */
function splitFullName(fullName: string): OwnerName {
    const [firstName = '', ...otherNames] = fullName.trim().split(/\s+/);
    return {firstName, lastName: otherNames.join(' ')};
}

/** The one full name that the global provider keeps and that the owner rows and confirmations show */
function getOwnerFullName({firstName, lastName}: OwnerName): string {
    return `${firstName} ${lastName}`.trim();
}

/**
 * The USD server keeps the owner IDs in a list next to the owners, in the same order. An owner without an ID gets one
 * from its position, so the same server data always gives the same IDs.
 */
function getUSDOwnersFromServer(achData: OnyxEntry<ACHData>): USDOwnerDraft[] {
    const ownerIDs = achData?.beneficialOwnerKeys ?? [];
    return (achData?.beneficialOwners ?? []).map((owner, index) => ({
        id: ownerIDs.at(index) ?? `owner-${index}`,
        firstName: owner.firstName,
        lastName: owner.lastName,
        dob: owner.dob,
    }));
}

function getGlobalOwnersFromServer(corpay: OnyxEntry<CorpayData>): GlobalOwnerDraft[] {
    return (corpay?.beneficialOwners ?? []).map((owner) => ({
        id: owner.uid,
        ...splitFullName(owner.fullName),
        ownershipPercentage: owner.ownershipPercentage,
    }));
}

export {getGlobalOwnersFromServer, getOwnerFullName, getUSDOwnersFromServer, splitFullName};
