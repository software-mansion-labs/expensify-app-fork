import {isShown, toDynamicFormValues} from '@components/DynamicForm/shared';

import type {DynamicFormField, DynamicFormHeading} from '@src/types/onyx';

const legalType: DynamicFormField = {
    key: 'legalType',
    type: 'radio',
    required: true,
    values: [{key: 'PRIVATE'}, {key: 'BUSINESS'}],
};

const companyName: DynamicFormField = {
    key: 'companyName',
    type: 'text',
    required: true,
    showWhen: {key: 'legalType', equals: ['BUSINESS']},
};

const companyNumber: DynamicFormField = {
    key: 'companyNumber',
    type: 'text',
    required: true,
    showWhen: {key: 'companyName', equals: ['Acme']},
};

describe('isShown', () => {
    it('shows a field without showWhen', () => {
        // Given a field that does not depend on any answer
        // When its visibility is checked with no answers
        // Then it is visible, since nothing can hide it
        expect(isShown(legalType.showWhen, {}, [legalType])).toBe(true);
    });

    it('shows a field only while the controlling answer matches', () => {
        // Given a field shown only for business recipients
        const fields = [legalType, companyName];

        // When the recipient type is business, then private
        // Then the field is visible only for business
        expect(isShown(companyName.showWhen, {legalType: 'BUSINESS'}, fields)).toBe(true);
        expect(isShown(companyName.showWhen, {legalType: 'PRIVATE'}, fields)).toBe(false);
    });

    it('hides a field while its controlling field is hidden, even if the hidden field still has a matching answer', () => {
        // Given a chain where companyNumber depends on companyName, which depends on legalType
        const fields = [legalType, companyName, companyNumber];

        // When companyName keeps a matching answer from before the user switched to a private recipient
        const values = {legalType: 'PRIVATE', companyName: 'Acme'};

        // Then companyNumber stays hidden, because the question it depends on is hidden
        expect(isShown(companyNumber.showWhen, values, fields)).toBe(false);
    });

    it('hides a heading while its controlling field is hidden', () => {
        // Given a heading that depends on companyName, which is shown only for business recipients
        const companyDetails: DynamicFormHeading = {key: 'companyDetails', title: 'Company details', showWhen: {key: 'companyName', equals: ['Acme']}};
        const fields = [legalType, companyName];

        // When companyName keeps a matching answer from before the user switched to a private recipient
        const values = {legalType: 'PRIVATE', companyName: 'Acme'};

        // Then the heading follows the same rule as a field and stays hidden
        expect(isShown(companyDetails.showWhen, values, fields)).toBe(false);
    });

    it('checks the whole controller chain of a heading that shares its key with a field', () => {
        // Given an address field shown only for business recipients, a country field shown only for one address, and a heading keyed "address" that depends on the country
        const address: DynamicFormField = {key: 'address', type: 'text', required: true, showWhen: {key: 'legalType', equals: ['BUSINESS']}};
        const country: DynamicFormField = {key: 'country', type: 'country', required: true, showWhen: {key: 'address', equals: ['1 Main St']}};
        const addressHeading: DynamicFormHeading = {key: 'address', title: 'Address', showWhen: {key: 'country', equals: ['GB']}};

        // When the address keeps an answer from before the user switched to a private recipient
        const values = {legalType: 'PRIVATE', address: '1 Main St', country: 'GB'};

        // Then the heading is hidden, since the shared key must not stop the check of whether the address field is hidden
        expect(isShown(addressHeading.showWhen, values, [legalType, address, country])).toBe(false);
    });

    it('stops on a showWhen cycle instead of recursing forever', () => {
        // Given two fields that each depend on the other, which is a broken schema
        const first: DynamicFormField = {
            key: 'first',
            type: 'text',
            required: false,
            showWhen: {key: 'second', equals: ['yes']},
        };
        const second: DynamicFormField = {
            key: 'second',
            type: 'text',
            required: false,
            showWhen: {key: 'first', equals: ['yes']},
        };

        // When visibility is checked
        // Then it falls back to the controlling answer alone
        expect(isShown(first.showWhen, {first: 'yes', second: 'yes'}, [first, second])).toBe(true);
    });

    it('shows a field controlled by a multiselect when any chosen value matches', () => {
        // Given a source of wealth question shown only for high risk industries, chosen in a multiselect
        const industries: DynamicFormField = {key: 'industries', type: 'multiselect', required: true};
        const sourceOfWealth: DynamicFormField = {key: 'sourceOfWealth', type: 'text', required: true, showWhen: {key: 'industries', equals: ['GAMBLING']}};
        const fields = [industries, sourceOfWealth];

        // When the chosen industries include a high risk one, and when they do not
        const isShownWithHighRisk = isShown(sourceOfWealth.showWhen, {industries: ['RETAIL', 'GAMBLING']}, fields);
        const isShownWithoutHighRisk = isShown(sourceOfWealth.showWhen, {industries: ['RETAIL']}, fields);

        // Then the question shows only in the first case
        expect(isShownWithHighRisk).toBe(true);
        expect(isShownWithoutHighRisk).toBe(false);
    });
});

describe('toDynamicFormValues', () => {
    it('keeps answers a form input can hold and drops everything else', () => {
        // Given a draft with answers next to form bookkeeping and malformed values
        const draft = {
            name: 'Jane',
            accepted: true,
            countries: ['GB', 'US'],
            files: [{name: 'passport.pdf'}],
            directors: [{id: 'jane', firstName: 'Jane'}],
            errors: {name: 'Required'},
            errorList: [{message: 'Required'}],
            mixedList: ['GB', 1],
            count: 3,
        };

        // When it is read as dynamic form answers
        const values = toDynamicFormValues(draft);

        // Then only the answers remain
        expect(values).toEqual({name: 'Jane', accepted: true, countries: ['GB', 'US'], files: [{name: 'passport.pdf'}], directors: [{id: 'jane', firstName: 'Jane'}]});
    });

    it('returns no answers for a missing draft', () => {
        // Given no draft yet, as on a first visit
        // When it is read
        // Then there are no answers, so the form starts empty instead of failing
        expect(toDynamicFormValues(undefined)).toEqual({});
    });
});
