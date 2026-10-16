import {getAllFields} from '@components/DynamicForm/flow/pages';
import {getConfirmationItems} from '@components/DynamicForm/flow/subPages/DynamicFormConfirmationPage';
import type {DynamicFormFlowPage} from '@components/DynamicForm/flow/types';

import {translateLocal} from '../../../../../utils/TestHelper';

const pages: DynamicFormFlowPage[] = [
    {
        key: 'identity',
        title: 'Identity',
        content: [
            {elementType: 'ExpensifyInput', key: 'name', type: 'text', required: true, label: 'Name'},
            {elementType: 'ExpensifyInput', key: 'ssn', type: 'text', required: true, label: 'SSN', sensitive: true},
            {elementType: 'ExpensifyInput', key: 'country', type: 'text', required: false, label: 'Country', readonly: true},
        ],
    },
    {key: 'business', title: 'Business', showWhen: {key: 'type', equals: ['BUSINESS']}, content: [{elementType: 'ExpensifyInput', key: 'ein', type: 'text', required: true, label: 'EIN'}]},
];

describe('getConfirmationItems', () => {
    it('masks sensitive answers and opens the page of an editable row', () => {
        // Given answers with an SSN
        const onEditPage = jest.fn();
        const [group] = getConfirmationItems(pages, getAllFields(pages), {name: 'Ada', ssn: '123451234', country: 'US'}, translateLocal, onEditPage, jest.fn());

        // When the user taps the SSN row
        const ssnRow = group.rows.find((row) => row.id === 'ssn');
        ssnRow?.onPress();

        // Then the SSN is masked to its last four digits and the page is opened
        expect(ssnRow?.title).toBe('•••-••-1234');
        expect(onEditPage).toHaveBeenCalledWith(0);
    });

    it('shows a readonly row with no chevron and no action', () => {
        // Given a readonly field
        const onEditPage = jest.fn();
        const [group] = getConfirmationItems(pages, getAllFields(pages), {name: 'Ada', ssn: '123451234', country: 'US'}, translateLocal, onEditPage, jest.fn());

        // When its row is tapped
        const row = group.rows.find((candidate) => candidate.id === 'country');
        row?.onPress();

        // Then it is not editable
        expect(row).toMatchObject({shouldShowRightIcon: false});
        expect(onEditPage).not.toHaveBeenCalled();
    });

    it('has no group for a page that is not shown', () => {
        // Given a private recipient, so the business page is skipped
        const values = {type: 'PRIVATE', name: 'Ada', ein: '1'};

        // When the confirmation page lists the answers
        const groups = getConfirmationItems(pages, getAllFields(pages), values, translateLocal, jest.fn(), jest.fn());

        // Then only the identity page is summarized
        expect(groups.map((group) => group.id)).toEqual(['identity']);
    });

    it('leaves the section of an untitled page with several questions unnamed', () => {
        // Given a page the form built from a flat list, so it has no title, asking an account number and a currency
        const untitledPages: DynamicFormFlowPage[] = [
            {
                key: 'page-1',
                content: [
                    {elementType: 'ExpensifyInput', key: 'accountNumber', type: 'text', required: true, label: 'Account number'},
                    {elementType: 'ExpensifyInput', key: 'currency', type: 'currency', required: true, label: 'Settlement currency'},
                ],
            },
        ];

        // When the confirmation sections are built
        const [group] = getConfirmationItems(untitledPages, getAllFields(untitledPages), {accountNumber: '12345678', currency: 'GBP'}, translateLocal, jest.fn(), jest.fn());

        // Then the section has no name, since naming it after its first answer would mislabel the others
        expect(group.name).toBe('');
        expect(group.rows.map((row) => row.id)).toEqual(['accountNumber', 'currency']);
    });

    it('shows each list entry as its own row that opens the entry', () => {
        // Given a page with a list of directors holding one entry
        const directorsPages: DynamicFormFlowPage[] = [
            {
                key: 'directors',
                content: [
                    {
                        elementType: 'ExpensifyInput',
                        key: 'directors',
                        type: 'list',
                        required: true,
                        itemFields: [
                            {key: 'firstName', type: 'text', required: true},
                            {key: 'lastName', type: 'text', required: true},
                        ],
                    },
                ],
            },
        ];
        const values = {directors: [{id: 'jane', firstName: 'Jane', lastName: 'Doe'}]};
        const onEditListItem = jest.fn();

        // When the confirmation sections are built and the entry row is tapped
        const row = getConfirmationItems(directorsPages, getAllFields(directorsPages), values, translateLocal, jest.fn(), onEditListItem).at(0)?.rows.at(0);
        row?.onPress();

        // Then the entry is an avatar row named by its leading text answers, and tapping it opens that entry rather than the page
        expect(row).toMatchObject({kind: 'avatar', title: 'Jane Doe'});
        expect(onEditListItem).toHaveBeenCalledWith('directors', 'jane');
    });

    it('shows an empty list as a row that opens its page', () => {
        // Given a page with an optional list of directors that holds no entry
        const directorsPages: DynamicFormFlowPage[] = [
            {
                key: 'directors',
                content: [
                    {elementType: 'ExpensifyInput', key: 'directors', label: 'Directors', type: 'list', required: false, itemFields: [{key: 'firstName', type: 'text', required: true}]},
                ],
            },
        ];
        const onEditPage = jest.fn();
        const onEditListItem = jest.fn();

        // When the confirmation sections are built and the list row is tapped
        const row = getConfirmationItems(directorsPages, getAllFields(directorsPages), {directors: []}, translateLocal, onEditPage, onEditListItem).at(0)?.rows.at(0);
        row?.onPress();

        // Then the list still has a row, so the user can go back and add a director from the confirmation page
        expect(row).toMatchObject({description: 'Directors', title: ''});
        expect(onEditPage).toHaveBeenCalledWith(0);
        expect(onEditListItem).not.toHaveBeenCalled();
    });

    it('shows a Wise input as a row with its name and the name of the chosen value', () => {
        // Given a page mixing a Wise select, a Wise text input and a description
        const wisePages: DynamicFormFlowPage[] = [
            {
                key: 'recipient',
                title: 'Recipient',
                content: [
                    {elementType: 'Description', key: 'intro', text: 'Who are you paying?'},
                    {
                        elementType: 'HTMLInput',
                        key: 'legalType',
                        name: 'Recipient type',
                        type: 'select',
                        required: true,
                        valuesAllowed: [
                            {key: 'PRIVATE', name: 'Person'},
                            {key: 'BUSINESS', name: 'Business'},
                        ],
                    },
                    {elementType: 'HTMLInput', key: 'sortCode', name: 'UK sort code', type: 'text', required: true},
                ],
            },
        ];
        const onEditPage = jest.fn();

        // When the confirmation sections are built and the first row is tapped
        const [group] = getConfirmationItems(wisePages, getAllFields(wisePages), {legalType: 'BUSINESS', sortCode: '040075'}, translateLocal, onEditPage, jest.fn());
        group.rows.at(0)?.onPress();

        // Then only the inputs have rows, the select shows the value's name instead of its key, and a row opens its page
        expect(group.rows).toMatchObject([
            {id: 'legalType', description: 'Recipient type', title: 'Business'},
            {id: 'sortCode', description: 'UK sort code', title: '040075'},
        ]);
        expect(onEditPage).toHaveBeenCalledWith(0);
    });
});
