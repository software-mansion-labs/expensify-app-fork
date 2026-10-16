import {getAddressInputKeys, getAnswerKeys} from '@components/DynamicForm/content/elements/ExpensifyInput/field';
import {summarizeListItem, getSubmittedAnswers, getListItemSensitiveKey} from '@components/DynamicForm/content/elements/ExpensifyInput/list';

import type {DynamicFormField} from '@src/types/onyx';

import {translateLocal} from '../../../../../../utils/TestHelper';

describe('summarizeListItem', () => {
    it('names an entry by its leading text answers and describes it with up to two short ones', () => {
        // Given an owner with a name, an SSN, a date of birth and three short answers
        const itemFields: DynamicFormField[] = [
            {key: 'firstName', type: 'text', required: true},
            {key: 'lastName', type: 'text', required: true},
            {key: 'ssn', type: 'text', required: true, sensitive: true},
            {key: 'dateOfBirth', type: 'date', required: true},
            {key: 'ownership', type: 'percent', required: true},
            {key: 'role', type: 'select', required: true, values: [{key: 'CEO', label: 'Chief executive'}]},
            {key: 'title', type: 'text', required: false},
        ];
        const owner = {id: 'jane', firstName: 'Jane', lastName: 'Doe', ssn: '123456789', dateOfBirth: '1980-04-19', ownership: '40', role: 'CEO', title: 'Founder'};

        // When the entry is summarized
        const summary = summarizeListItem(owner, itemFields, translateLocal, 'Owner');

        // Then the name is the title, and the description holds the first two short answers, leaving out the SSN and the long date
        expect(summary).toEqual({title: 'Jane Doe', description: '40%, Chief executive'});
    });

    it('names an entry without text answers by its first answer', () => {
        // Given an entry holding only a choice
        const itemFields: DynamicFormField[] = [{key: 'role', type: 'select', required: true, values: [{key: 'CEO', label: 'Chief executive'}]}];

        // When it is summarized
        const summary = summarizeListItem({id: 'one', role: 'CEO'}, itemFields, translateLocal, 'Owner');

        // Then the choice names the row, so it is never left without a title
        expect(summary).toEqual({title: 'Chief executive', description: ''});
    });

    it('names an entry whose shown answers are all sensitive by the fallback title', () => {
        // Given an entry whose only answer is sensitive
        const itemFields: DynamicFormField[] = [{key: 'ssn', type: 'text', required: true, sensitive: true}];

        // When it is summarized
        const summary = summarizeListItem({id: 'one', ssn: '123456789'}, itemFields, translateLocal, 'Owner');

        // Then the fallback names the row, so its row and its Edit and Remove labels are never blank
        expect(summary).toEqual({title: 'Owner', description: ''});
    });

    it('leaves out answers the entry now hides', () => {
        // Given a company entry still holding the name it had while it was an individual
        const itemFields: DynamicFormField[] = [
            {
                key: 'ownerType',
                type: 'select',
                required: true,
                values: [
                    {key: 'INDIVIDUAL', label: 'Individual'},
                    {key: 'COMPANY', label: 'Company'},
                ],
            },
            {key: 'firstName', type: 'text', required: true, showWhen: {key: 'ownerType', equals: ['INDIVIDUAL']}},
            {key: 'companyName', type: 'text', required: true, showWhen: {key: 'ownerType', equals: ['COMPANY']}},
        ];

        // When it is summarized
        const summary = summarizeListItem({id: 'acme', ownerType: 'COMPANY', firstName: 'Jane', companyName: 'Acme'}, itemFields, translateLocal, 'Owner');

        // Then the hidden name is ignored, as validation and submission ignore it
        expect(summary).toEqual({title: 'Acme', description: 'Company'});
    });
});

const cityKey = getAddressInputKeys('home').city;

describe('getSubmittedAnswers', () => {
    it('leaves out the answer of a field hidden by its controller', () => {
        // Given a text field shown only for business, with an answer left over from an earlier choice
        const fields: DynamicFormField[] = [
            {key: 'type', type: 'text', required: true},
            {key: 'ein', type: 'text', required: true, showWhen: {key: 'type', equals: ['BUSINESS']}},
        ];

        // When the answers are collected for a private recipient
        const answers = getSubmittedAnswers(fields, {type: 'PRIVATE', ein: '123'});

        // Then the stale answer is not submitted
        expect(answers).toEqual({type: 'PRIVATE'});
    });

    it('uses the whole form to find a controller on another page', () => {
        // Given a field whose controller sits on another page
        const controller: DynamicFormField = {key: 'type', type: 'text', required: true};
        const dependent: DynamicFormField = {key: 'ein', type: 'text', required: true, showWhen: {key: 'type', equals: ['BUSINESS']}};

        // When one page is collected with the whole form
        const answers = getSubmittedAnswers([dependent], {type: 'BUSINESS', ein: '123'}, [controller, dependent]);

        // Then the field counts as visible
        expect(answers).toEqual({ein: '123'});
    });

    it('submits the address parts and the chosen currency along with the field', () => {
        // Given an address and an amount that lets the user pick a currency
        const fields: DynamicFormField[] = [
            {key: 'home', type: 'address', required: true},
            {key: 'fee', type: 'amount', required: true, currencyKey: 'feeCurrency'},
        ];

        // When the answers are collected
        const answers = getSubmittedAnswers(fields, {home: '1 Main St', [cityKey]: 'Austin', fee: '100', feeCurrency: 'EUR'});

        // Then the currency is part of the answer, since the amount means nothing without it
        expect(answers).toMatchObject({home: '1 Main St', [cityKey]: 'Austin', fee: '100', feeCurrency: 'EUR'});
    });

    it('lists every answer key of a compound field', () => {
        // Given an address field, whose answer is spread over several keys
        const field: DynamicFormField = {key: 'home', type: 'address', required: true, sensitive: true};

        // When the answer keys are listed
        const keys = getAnswerKeys(field);

        // Then the address parts are included, so marking the field sensitive covers all of them
        expect(keys).toContain('home');
        expect(keys).toContain(cityKey);
    });

    it('submits each list entry with its sensitive answers kept in memory', () => {
        // Given a list of directors whose SSN is sensitive, so it is kept in memory under the entry instead of in the drafted entry
        const directors: DynamicFormField = {
            key: 'directors',
            type: 'list',
            required: true,
            itemFields: [
                {key: 'firstName', type: 'text', required: true},
                {key: 'ssn', type: 'text', required: true, sensitive: true},
            ],
        };
        const values = {directors: [{id: 'jane', firstName: 'Jane'}], [getListItemSensitiveKey('directors', 'jane', 'ssn')]: '123456789'};

        // When the answers are collected
        const answers = getSubmittedAnswers([directors], values);

        // Then the entry is sent whole, SSN included, without the memory key it was kept under
        expect(answers).toEqual({directors: [{id: 'jane', firstName: 'Jane', ssn: '123456789'}]});
    });
});
