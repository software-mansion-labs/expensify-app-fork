import {getGlobalOwnersFromServer, getUSDOwnersFromServer, splitFullName} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/serverOwners';

describe('serverOwners', () => {
    it('splits a full name at the first word', () => {
        // Given full names with one, two and three words, and extra spaces
        // When they are split
        // Then the first word is the first name and the rest is the last name
        expect(splitFullName('Ada')).toEqual({firstName: 'Ada', lastName: ''});
        expect(splitFullName('Ada Lovelace')).toEqual({firstName: 'Ada', lastName: 'Lovelace'});
        expect(splitFullName('  Ada  King   Lovelace ')).toEqual({firstName: 'Ada', lastName: 'King Lovelace'});
    });

    it('gives a USD owner without a saved key an ID from its position', () => {
        // Given two saved owners and a key for the first one only
        const owners = getUSDOwnersFromServer({
            beneficialOwners: [
                {firstName: 'Grace', lastName: 'Hopper', dob: '1906-12-09'},
                {firstName: 'Alan', lastName: 'Turing', dob: '1912-06-23'},
            ],
            beneficialOwnerKeys: ['owner-a'],
        });

        // When the list is read
        // Then each owner has an ID that stays the same for the same data, so a render does not change it
        expect(owners.map((owner) => owner.id)).toEqual(['owner-a', 'owner-1']);
    });

    it('reads no global owners without server data', () => {
        // Given no corpay data
        // When the list is read
        // Then the list is empty
        expect(getGlobalOwnersFromServer(undefined)).toEqual([]);
    });
});
