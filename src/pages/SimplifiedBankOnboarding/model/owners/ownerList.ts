/**
 * Changes of an owner list that return a new list. Owners are matched by ID, so committing an owner the list already has
 * replaces it in place and keeps the order the user sees.
 */
import {Str} from 'expensify-common';

type Owner = {id: string};

/** New owners get an ID made on the client. The NonUSD current user has the fixed ID `CURRENT_USER_KEY` instead. */
function createOwnerID(): string {
    return Str.guid();
}

function findOwner<TOwner extends Owner>(owners: TOwner[], id: string | null | undefined): TOwner | undefined {
    if (!id) {
        return undefined;
    }
    return owners.find((owner) => owner.id === id);
}

function commitOwner<TOwner extends Owner>(owners: TOwner[], committedOwner: TOwner): TOwner[] {
    if (!owners.some((owner) => owner.id === committedOwner.id)) {
        return [...owners, committedOwner];
    }
    return owners.map((owner) => (owner.id === committedOwner.id ? committedOwner : owner));
}

function removeOwner<TOwner extends Owner>(owners: TOwner[], id: string): TOwner[] {
    return owners.filter((owner) => owner.id !== id);
}

export {commitOwner, createOwnerID, findOwner, removeOwner};
