import type {GlobalOwnerDraft, OnboardingDraft, USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import {EMPTY_OWNER_BUFFER, GLOBAL_OWNER_BUFFER, readOwnerBuffer, USD_OWNER_BUFFER} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/ownerBuffer';
import {canAddMoreGlobalOwners, canAddMoreUSDOwners, getOwnershipSum, isValidGlobalOwnerShare} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/ownerLimits';
import {CURRENT_USER_OWNER_ID} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/ownerList';
import getOwnerLoop, {getGlobalOwnerLoopRules, getUSDOwnerLoopRules} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/ownerLoop';
import {getGlobalOwnersParams, getUSDOwnersParams} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/ownerParams';
import {getGlobalOwnersFromServer, getOwnerFullName, getUSDOwnersFromServer, splitFullName} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/serverOwners';

/** A new owner gets a random ID, so the tests only check that there is one */
const ANY_NEW_OWNER_ID: unknown = expect.any(String);

const ADA: USDOwnerDraft = {
    id: 'ada',
    firstName: 'Ada',
    lastName: 'Lovelace',
    dob: '1990-01-01',
};
const ALAN: USDOwnerDraft = {
    id: 'alan',
    firstName: 'Alan',
    lastName: 'Turing',
    dob: '1991-02-02',
};
const GRACE: USDOwnerDraft = {
    id: 'grace',
    firstName: 'Grace',
    lastName: 'Hopper',
    dob: '1992-03-03',
};

function createGlobalOwner(id: string, ownershipPercentage: string): GlobalOwnerDraft {
    return {
        id,
        firstName: `First ${id}`,
        lastName: `Last ${id}`,
        ownershipPercentage,
    };
}

function buildUSDLoop(owners: USDOwnerDraft[], isUserOwner: boolean, draft: OnboardingDraft = {}) {
    return getOwnerLoop(getUSDOwnerLoopRules(owners, isUserOwner), draft);
}

function buildGlobalLoop(owners: GlobalOwnerDraft[], draft: OnboardingDraft = {}) {
    return getOwnerLoop(getGlobalOwnerLoopRules(owners), draft);
}

describe('owner limits', () => {
    it('lets three USD owners in, or two next to a user who owns 25%', () => {
        // Given lists of two and three other owners
        // When the limit is checked with and without the user as an owner
        // Then the user takes one of the three places
        expect(canAddMoreUSDOwners([ADA, ALAN], false)).toBe(true);
        expect(canAddMoreUSDOwners([ADA, ALAN, GRACE], false)).toBe(false);
        expect(canAddMoreUSDOwners([ADA], true)).toBe(true);
        expect(canAddMoreUSDOwners([ADA, ALAN], true)).toBe(false);
    });

    it('lets another global owner in while the listed shares add up to 75% at most', () => {
        // Given lists whose shares add up to 75% and to 76%
        // When the limit is checked
        // Then a holder of 25% still fits only next to 75%
        expect(canAddMoreGlobalOwners([createGlobalOwner('a', '50'), createGlobalOwner('b', '25')])).toBe(true);
        expect(canAddMoreGlobalOwners([createGlobalOwner('a', '50'), createGlobalOwner('b', '26')])).toBe(false);
    });

    it('sums the shares and counts a share that is not a number as 0', () => {
        // Given a list with an empty share
        const owners = [createGlobalOwner('a', '40'), createGlobalOwner('b', ''), createGlobalOwner('c', '30')];

        // When the sum is taken
        // Then the empty share adds nothing, because the user has not typed it yet
        expect(getOwnershipSum(owners)).toBe(70);
    });

    it('accepts a share from 25 to 100 that keeps the total at 100 or below', () => {
        // Given an owner list with 60% held by another owner, and the owner being edited at 30%
        const owners = [createGlobalOwner('a', '60'), createGlobalOwner('b', '30')];

        // When shares for the edited owner are checked
        // Then its old share does not count, and the total of the others plus the new share stays at 100
        expect(isValidGlobalOwnerShare('40', owners, 'b')).toBe(true);
        expect(isValidGlobalOwnerShare('41', owners, 'b')).toBe(false);
        expect(isValidGlobalOwnerShare('24', owners, 'b')).toBe(false);
    });
});

describe('owner buffer', () => {
    it('reads the buffer inputs of the draft with empty values for the missing ones', () => {
        // Given a draft with only the first name of the owner being edited
        // When the buffer is read
        // Then the other inputs are empty, so the pages always get strings as default values
        expect(readOwnerBuffer({ownerFirstName: 'Ada'})).toEqual({
            ...EMPTY_OWNER_BUFFER,
            ownerFirstName: 'Ada',
        });
        expect(readOwnerBuffer(undefined)).toEqual(EMPTY_OWNER_BUFFER);
    });

    it('turns a USD owner into the buffer and back', () => {
        // Given a USD owner
        // When it fills the buffer and the buffer becomes an owner again
        const buffer = USD_OWNER_BUFFER.getBuffer(ADA);

        // Then nothing is lost
        expect(USD_OWNER_BUFFER.getOwner(ADA.id, buffer)).toEqual(ADA);
        expect(USD_OWNER_BUFFER.getListUpdate([ADA])).toEqual({usdOwners: [ADA]});
    });

    it('turns a global owner into the buffer and back', () => {
        // Given a global owner
        const owner = createGlobalOwner('a', '50');

        // When it fills the buffer and the buffer becomes an owner again
        const buffer = GLOBAL_OWNER_BUFFER.getBuffer(owner);

        // Then nothing is lost, and an owner the list does not hold gets an empty buffer
        expect(GLOBAL_OWNER_BUFFER.getOwner(owner.id, buffer)).toEqual(owner);
        expect(GLOBAL_OWNER_BUFFER.getBuffer(undefined)).toEqual(EMPTY_OWNER_BUFFER);
        expect(GLOBAL_OWNER_BUFFER.getListUpdate([owner])).toEqual({
            globalOwners: [owner],
        });
    });
});

describe('update builders', () => {
    it('starts a new owner with a new ID and an empty buffer', () => {
        // Given a loop whose buffer still holds the last owner
        const loop = buildUSDLoop([ADA], false, {
            ownerBeingModifiedID: ADA.id,
            ...USD_OWNER_BUFFER.getBuffer(ADA),
        });

        // When a new owner starts
        const update = loop.getStartUpdate();

        // Then the buffer is empty under an ID that no listed owner has, and the list is untouched
        expect(update).toEqual({
            ...EMPTY_OWNER_BUFFER,
            ownerBeingModifiedID: ANY_NEW_OWNER_ID,
        });
        expect(update.ownerBeingModifiedID).not.toBe(ADA.id);
        expect(update.usdOwners).toBeUndefined();
    });

    it('fills the buffer with a listed owner', () => {
        // Given a list of two owners
        const loop = buildUSDLoop([ADA, ALAN], false);

        // When the second one is opened from the list
        // Then the buffer holds that owner
        expect(loop.getEditUpdate(ALAN.id)).toEqual({
            ownerBeingModifiedID: ALAN.id,
            ...USD_OWNER_BUFFER.getBuffer(ALAN),
        });
    });

    it('commits a new owner at the end and keeps the buffer', () => {
        // Given a new owner in the buffer next to one listed owner
        const loop = buildUSDLoop([ADA], false, {
            ownerBeingModifiedID: ALAN.id,
            ...USD_OWNER_BUFFER.getBuffer(ALAN),
        });

        // When the owner is committed
        // Then the owner joins the end of the list, and the update leaves the buffer as it is
        expect(loop.ownersAfterCommit).toEqual([ADA, ALAN]);
        expect(loop.getCommitUpdate()).toEqual({usdOwners: [ADA, ALAN]});
        expect(loop.isEditingListedOwner).toBe(false);
    });

    it('commits an edited owner in place', () => {
        // Given the first of two owners, edited from the list
        const loop = buildUSDLoop([ADA, ALAN], false, {
            ownerBeingModifiedID: ADA.id,
            ...USD_OWNER_BUFFER.getBuffer(ADA),
            ownerLastName: 'Byron',
        });

        // When the owner is committed
        // Then the owner keeps its place in the list, the order the user sees
        expect(loop.isEditingListedOwner).toBe(true);
        expect(loop.getCommitUpdate()).toEqual({
            usdOwners: [{...ADA, lastName: 'Byron'}, ALAN],
        });
    });

    it('does not commit a new USD owner when the list is full', () => {
        // Given two listed owners next to a user who owns 25%, and a new owner in the buffer
        const loop = buildUSDLoop([ADA, ALAN], true, {
            ownerBeingModifiedID: GRACE.id,
            ...USD_OWNER_BUFFER.getBuffer(GRACE),
        });

        // When the owner is committed
        // Then the list stays as it is, because the server takes three owners at most
        expect(loop.ownersAfterCommit).toEqual([ADA, ALAN]);
    });

    it('commits a new global owner even when the shares leave no room any more', () => {
        // Given listed shares of 80% and a new owner in the buffer, as when the user started before the shares changed
        const owners = [createGlobalOwner('a', '80')];
        const newOwner = createGlobalOwner('b', '20');
        const loop = buildGlobalLoop(owners, {
            ownerBeingModifiedID: newOwner.id,
            ...GLOBAL_OWNER_BUFFER.getBuffer(newOwner),
        });

        // When the owner is committed
        // Then the owner joins the list, because the NonUSD limit only holds back the start of a new owner
        expect(loop.ownersAfterCommit).toEqual([...owners, newOwner]);
    });

    it('commits nothing while no owner was started', () => {
        // Given a loop without an owner in the buffer
        const loop = buildUSDLoop([ADA], false);

        // When the owner is committed
        // Then the list does not change
        expect(loop.getCommitUpdate()).toEqual({usdOwners: [ADA]});
    });

    it('removes one owner', () => {
        // Given the user and another owner in the global list
        const owners = [createGlobalOwner(CURRENT_USER_OWNER_ID, '50'), createGlobalOwner('a', '30')];

        // When the user is removed
        // Then only the other owner stays
        expect(buildGlobalLoop(owners).getRemoveUpdate(CURRENT_USER_OWNER_ID)).toEqual({globalOwners: [owners[1]]});
    });

    it('drops the last USD owner that no longer fits once the user owns 25%', () => {
        // Given three other owners
        const loop = buildUSDLoop([ADA, ALAN, GRACE], false);

        // When the user says they own 25%
        // Then the last owner leaves, because the user takes one of the three places
        expect(loop.getMakeRoomForUserUpdate()).toEqual({usdOwners: [ADA, ALAN]});
    });

    it('starts the global user without the owners that no longer fit and outside the list', () => {
        // Given four other owners and the user in the list
        const user = createGlobalOwner(CURRENT_USER_OWNER_ID, '25');
        const others = ['a', 'b', 'c', 'd'].map((id) => createGlobalOwner(id, '25'));
        const loop = buildGlobalLoop([user, ...others]);

        // When the user says they own 25%
        const update = loop.getStartUserUpdate();

        // Then three others stay, the user leaves the list until the confirmation, and the buffer holds the user
        expect(update).toEqual({
            globalOwners: others.slice(0, 3),
            ownerBeingModifiedID: CURRENT_USER_OWNER_ID,
            ...GLOBAL_OWNER_BUFFER.getBuffer(user),
        });
    });

    it('keeps what the global user typed when the user answers again before confirming', () => {
        // Given the user in the buffer with a typed name, not listed yet
        const typedBuffer = {...EMPTY_OWNER_BUFFER, ownerFirstName: 'Typed'};
        const loop = buildGlobalLoop([], {
            ownerBeingModifiedID: CURRENT_USER_OWNER_ID,
            ...typedBuffer,
        });

        // When the user goes back and says again that they own 25%
        // Then the typed name stays in the buffer
        expect(loop.getStartUserUpdate()).toEqual({
            globalOwners: [],
            ownerBeingModifiedID: CURRENT_USER_OWNER_ID,
            ...typedBuffer,
        });
    });

    it('keeps only the user when nobody else owns 25%', () => {
        // Given the user and another owner in the global list
        const user = createGlobalOwner(CURRENT_USER_OWNER_ID, '50');
        const owners = [createGlobalOwner('a', '30'), user];

        // When the user says nobody else owns 25%, with and without the user listed
        // Then only the user stays, or nobody
        expect(buildGlobalLoop(owners).getRemoveOtherOwnersUpdate()).toEqual({
            globalOwners: [user],
        });
        expect(buildGlobalLoop([owners[0]]).getRemoveOtherOwnersUpdate()).toEqual({
            globalOwners: [],
        });
    });
});

describe('server owners', () => {
    it('splits a full name at the first space', () => {
        // Given full names with one, two and three words, and extra spaces
        // When they are split
        // Then the first word is the first name and a middle name stays in the last name (BC-09)
        expect(splitFullName('Ada')).toEqual({firstName: 'Ada', lastName: ''});
        expect(splitFullName(' Ada  Lovelace ')).toEqual({
            firstName: 'Ada',
            lastName: 'Lovelace',
        });
        expect(splitFullName('  Ada  King   Lovelace ')).toEqual({
            firstName: 'Ada',
            lastName: 'King Lovelace',
        });
        expect(getOwnerFullName({firstName: 'Ada', lastName: ''})).toBe('Ada');
    });

    it('reads the USD owners with the server IDs, or with IDs from their position', () => {
        // Given two saved owners and an ID for the first one only
        const achData = {
            beneficialOwners: [
                {firstName: 'Ada', lastName: 'Lovelace', dob: '1990-01-01'},
                {firstName: 'Alan', lastName: 'Turing', dob: '1991-02-02'},
            ],
            beneficialOwnerKeys: ['ada'],
        };

        // When they are read
        // Then the second owner gets an ID from its position, so the same data always gives the same ID
        expect(getUSDOwnersFromServer(achData)).toEqual([ADA, {...ALAN, id: 'owner-1'}]);
        expect(getUSDOwnersFromServer(undefined)).toEqual([]);
    });

    it('reads the global owners with a split name', () => {
        // Given a saved global owner, and no corpay data at all
        const corpay = {
            beneficialOwners: [
                {
                    uid: CURRENT_USER_OWNER_ID,
                    fullName: 'Ada King Lovelace',
                    ownershipPercentage: '50',
                },
            ],
        };

        // When it is read
        // Then the full name is split and the server ID stays, and no data gives an empty list
        expect(getGlobalOwnersFromServer(corpay)).toEqual([
            {
                id: CURRENT_USER_OWNER_ID,
                firstName: 'Ada',
                lastName: 'King Lovelace',
                ownershipPercentage: '50',
            },
        ]);
        expect(getGlobalOwnersFromServer(undefined)).toEqual([]);
    });
});

describe('owner params', () => {
    it('sends the USD owners as a JSON string with their keys', () => {
        // Given two owners
        // When the params are built
        // Then the IDs travel next to the owners in the same order
        expect(getUSDOwnersParams([ADA, ALAN])).toEqual({
            beneficialOwners: JSON.stringify([
                {firstName: 'Ada', lastName: 'Lovelace', dob: '1990-01-01'},
                {firstName: 'Alan', lastName: 'Turing', dob: '1991-02-02'},
            ]),
            beneficialOwnerKeys: ['ada', 'alan'],
        });
    });

    it('answers "anyone else" from the sent global owners', () => {
        // Given the user alone, and the user with another owner
        const user = createGlobalOwner(CURRENT_USER_OWNER_ID, '50');
        const other = createGlobalOwner('a', '30');

        // When the params are built
        // Then the answer about the other owners follows the sent list
        expect(getGlobalOwnersParams([user]).anyIndividualOwn25PercentOrMore).toBe(false);
        expect(getGlobalOwnersParams([user, other])).toEqual({
            anyIndividualOwn25PercentOrMore: true,
            beneficialOwners: JSON.stringify([
                {
                    uid: CURRENT_USER_OWNER_ID,
                    fullName: `First ${CURRENT_USER_OWNER_ID} Last ${CURRENT_USER_OWNER_ID}`,
                    ownershipPercentage: '50',
                },
                {uid: 'a', fullName: 'First a Last a', ownershipPercentage: '30'},
            ]),
        });
    });
});
