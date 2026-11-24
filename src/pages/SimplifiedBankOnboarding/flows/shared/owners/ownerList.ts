/**
 * Changes of an owner list that return a new list. Owners are matched by ID, so committing an owner that the list already
 * holds replaces it in place and keeps the order that the user sees.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';

import {Str} from 'expensify-common';

type Owner = {id: string};

/** The NonUSD server saves the user as an owner under this ID, and the signer step looks the user up by it */
const CURRENT_USER_OWNER_ID = SBO_CONST.NON_USD.CURRENT_USER_KEY;

/** Every owner other than the NonUSD user gets an ID made on the client */
function createOwnerID(): string {
    return Str.guid();
}

function findOwner<TOwner extends Owner>(owners: TOwner[], id: string | undefined): TOwner | undefined {
    if (!id) {
        return undefined;
    }
    return owners.find((owner) => owner.id === id);
}

function commitOwner<TOwner extends Owner>(owners: TOwner[], committedOwner: TOwner): TOwner[] {
    if (!findOwner(owners, committedOwner.id)) {
        return [...owners, committedOwner];
    }
    return owners.map((owner) => (owner.id === committedOwner.id ? committedOwner : owner));
}

function removeOwner<TOwner extends Owner>(owners: TOwner[], id: string): TOwner[] {
    return owners.filter((owner) => owner.id !== id);
}

export {commitOwner, createOwnerID, CURRENT_USER_OWNER_ID, findOwner, removeOwner};
export type {Owner};
