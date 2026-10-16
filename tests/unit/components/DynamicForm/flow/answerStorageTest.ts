import {getListItemSensitiveKey} from '@components/DynamicForm/content/elements/ExpensifyInput/list';
import {splitPageAnswers, splitListItemAnswers} from '@components/DynamicForm/flow/answerStorage';
import {getAllFields} from '@components/DynamicForm/flow/pages';
import type {DynamicFormFlowPage} from '@components/DynamicForm/flow/types';

import type {DynamicFormListField} from '@src/types/onyx';

const page: DynamicFormFlowPage = {
    key: 'details',
    content: [
        {elementType: 'Description', key: 'intro', text: 'Tell us about you.'},
        {elementType: 'ExpensifyInput', key: 'name', type: 'text', required: true},
        {elementType: 'ExpensifyInput', key: 'ssn', type: 'text', required: true, sensitive: true},
        {elementType: 'HTMLInput', key: 'sortCode', name: 'Sort code', type: 'text', required: true},
        {elementType: 'ExpensifyInput', key: 'owners', type: 'list', required: false, itemFields: [{key: 'taxID', type: 'text', required: true, sensitive: true}]},
    ],
};
const allFields = getAllFields([page]);

describe('splitPageAnswers', () => {
    it('drafts plain answers, keeps sensitive ones in memory and passes list entries to the screen only', () => {
        // Given a page answered in full
        const owners = [{id: 'a1'}];
        const values = {name: 'Ada', ssn: '123451234', sortCode: '040075', owners};

        // When the user leaves it with Next
        const {draftAnswers, sensitiveAnswers, listAnswers} = splitPageAnswers(page, values, allFields);

        // Then the SSN never reaches the draft, and the list, which is drafted as it changes, goes to the screen
        expect(draftAnswers).toEqual({name: 'Ada', sortCode: '040075'});
        expect(sensitiveAnswers).toEqual({ssn: '123451234'});
        expect(listAnswers).toEqual({owners});
    });

    it('names the sensitive answers of list entries the user removed', () => {
        // Given a memory holding the tax IDs of two entries, one of which the user removed
        const keptKey = getListItemSensitiveKey('owners', 'a1', 'taxID');
        const removedKey = getListItemSensitiveKey('owners', 'b2', 'taxID');
        const values = {name: 'Ada', ssn: '123451234', sortCode: '040075', owners: [{id: 'a1'}], [keptKey]: '1', [removedKey]: '2'};

        // When the user leaves the page with Next
        const {removedSensitiveKeys} = splitPageAnswers(page, values, allFields);

        // Then only the removed entry's tax ID is forgotten
        expect(removedSensitiveKeys).toEqual([removedKey]);
    });
});

const owners: DynamicFormListField = {
    key: 'owners',
    type: 'list',
    required: false,
    itemFields: [
        {key: 'name', type: 'text', required: true},
        {key: 'taxID', type: 'text', required: true, sensitive: true},
        {key: 'role', type: 'text', required: false, showWhen: {key: 'name', equals: ['Ada']}},
    ],
};

describe('splitListItemAnswers', () => {
    it('keeps the sensitive answers of an entry in memory under the entry', () => {
        // Given an entry with a name and a tax ID
        // When its editor saves it
        const {item, sensitiveAnswers} = splitListItemAnswers(owners, 'a1', {name: 'Ada', taxID: '123', role: 'CEO'});

        // Then the entry holds no tax ID, which memory keeps under the entry's key
        expect(item).toEqual({id: 'a1', name: 'Ada', role: 'CEO'});
        expect(sensitiveAnswers).toEqual({[getListItemSensitiveKey('owners', 'a1', 'taxID')]: '123'});
    });

    it('leaves out the answer of a field the entry hides', () => {
        // Given an entry whose name hides the role field
        // When its editor saves it with a role typed earlier
        const {item} = splitListItemAnswers(owners, 'b2', {name: 'Grace', taxID: '456', role: 'CTO'});

        // Then the stale role is not saved
        expect(item).toEqual({id: 'b2', name: 'Grace'});
    });
});
