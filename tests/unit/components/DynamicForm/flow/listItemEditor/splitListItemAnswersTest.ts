import {getListItemSensitiveKey} from '@components/DynamicForm/content/elements/ExpensifyInput/list';
import splitListItemAnswers from '@components/DynamicForm/flow/listItemEditor/splitListItemAnswers';

import type {DynamicFormListField} from '@src/types/onyx';

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
