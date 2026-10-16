import getContentAnswers from '@components/DynamicForm/content/getContentAnswers';

import type {DynamicFormSchemaElement} from '@src/types/onyx';

describe('getContentAnswers', () => {
    it('submits Wise answers next to the visible App answers and nothing for display elements', () => {
        // Given a page with a Wise input, a banner, and an App field shown only for business recipients
        const content: DynamicFormSchemaElement[] = [
            {elementType: 'HTMLInput', key: 'accountNumber', name: 'Account number', type: 'text', required: true},
            {elementType: 'Banner', key: 'warning', text: 'Check the number.'},
            {elementType: 'ExpensifyInput', key: 'companyName', type: 'text', required: true, showWhen: {key: 'legalType', equals: ['BUSINESS']}},
        ];

        // When the answers of a private recipient, with a stale company name, are collected
        const answers = getContentAnswers(content, {accountNumber: '37778842', companyName: 'Acme', legalType: 'PRIVATE', warning: 'x'}, []);

        // Then the Wise answer is kept under its key and the hidden App field and the banner add nothing
        expect(answers).toEqual({accountNumber: '37778842'});
    });

    it('leaves out a Wise input the user never answered', () => {
        // Given a page with an optional Wise input
        const content: DynamicFormSchemaElement[] = [{elementType: 'HTMLInput', key: 'email', name: 'E-mail', type: 'text', required: false}];

        // When nothing was answered
        const answers = getContentAnswers(content, {}, []);

        // Then the submission has no key for it, so the backend does not get an empty value
        expect(answers).toEqual({});
    });
});
