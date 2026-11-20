import type {ACHData} from '@pages/SimplifiedBankOnboarding/types/onyx';
import {getOwnerInputID, resolveOwnerKeys, resolveOwnerValues} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';
import resolveValue, {resolveBooleanValue, resolveValues} from '@pages/SimplifiedBankOnboarding/values/resolveValue';

const ACH_DATA: ACHData = {firstName: 'Saved', companyName: 'Saved Inc', ownsMoreThan25Percent: true, corpay: {companyName: 'Corpay Inc', anyIndividualOwn25PercentOrMore: true}};

describe('resolveValue', () => {
    it('takes the draft first, then the account, then the global provider', () => {
        // Given a field that the user edited, a field that only the server holds and one that only the provider holds
        // When the step resolves them
        const values = resolveValues({FIRST_NAME: 'firstName', LAST_NAME: 'lastName', COMPANY_NAME: 'companyName'}, {firstName: 'Edited'}, {...ACH_DATA, companyName: undefined});

        // Then the unsaved edit wins, a missing field is empty and the provider fills the gap of the account
        expect(values).toEqual({firstName: 'Edited', lastName: '', companyName: 'Corpay Inc'});
    });

    it('keeps an emptied draft field instead of falling back to the saved value', () => {
        // Given a user who cleared a saved field without saving the step yet
        // When the step resolves the field
        const value = resolveValue('firstName', {firstName: ''}, ACH_DATA);

        // Then the input stays empty, because the draft holds the edit of the user
        expect(value).toBe('');
    });

    it('lets a "no" in the draft win over a saved "yes"', () => {
        // Given a user who changed a saved answer to "no", the case that the owner step lost before (scenario 6)
        // When the step resolves the answers
        const changedAnswer = resolveBooleanValue('ownsMoreThan25Percent', {ownsMoreThan25Percent: false}, ACH_DATA);
        const unansweredQuestion = resolveBooleanValue('hasOtherBeneficialOwners', undefined, ACH_DATA);

        // Then the changed answer is "no", and a question that nobody answered stays undefined
        expect(changedAnswer).toBe(false);
        expect(unansweredQuestion).toBeUndefined();
    });
});

describe('resolveOwnerValues', () => {
    const savedOwners = {ownerKeys: ['a', 'b'], owners: {a: {firstName: 'Ann', lastName: 'Saved'}, b: {firstName: 'Bob', lastName: 'Saved'}}};

    it('resolves every owner field on its own', () => {
        // Given a saved owner whose last name the user changed in the draft
        // When the step resolves the owner
        const values = resolveOwnerValues({[getOwnerInputID('a', 'lastName')]: 'Edited'}, savedOwners, 'a', ['firstName', 'lastName']);

        // Then the edited field comes from the draft and the other one from the saved owner
        expect(values).toEqual({firstName: 'Ann', lastName: 'Edited'});
    });

    it('takes the owner list of the draft once the user changed it', () => {
        // Given a user who removed an owner from the saved list
        // When the step resolves the list with and without that edit
        const editedKeys = resolveOwnerKeys({beneficialOwnerKeys: ['b']}, savedOwners);
        const savedKeys = resolveOwnerKeys(undefined, savedOwners);

        // Then the edited list wins, and the saved list is used until the user edits it
        expect(editedKeys).toEqual(['b']);
        expect(savedKeys).toEqual(['a', 'b']);
    });
});
