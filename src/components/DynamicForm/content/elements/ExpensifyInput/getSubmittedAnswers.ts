import type {DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormField} from '@src/types/onyx';

import getAnswerKeys from './model/getAnswerKeys';
import getVisibleFields from './model/getVisibleFields';
import {getListItems, getListItemSensitiveAnswers} from './model/listItems';

/** The answers one field holds: its own and those of its parts. List entries get their sensitive answers back from memory. */
function getFieldAnswers(field: DynamicFormField, values: DynamicFormValues): DynamicFormValues {
    const answers: DynamicFormValues = {};
    for (const key of getAnswerKeys(field)) {
        if (values[key] !== undefined) {
            answers[key] = values[key];
        }
    }
    if (field.type === 'list' && values[field.key] !== undefined) {
        answers[field.key] = getListItems(values[field.key]).map((item) => ({
            id: item.id,
            ...getSubmittedAnswers(field.itemFields, {...item, ...getListItemSensitiveAnswers(field, item.id, values)}),
        }));
    }
    return answers;
}

/** The answers to the fields the user can see, so answers left on fields hidden later are not submitted. Pass the whole form as `allFields` when `fields` is one page of it. */
function getSubmittedAnswers(fields: DynamicFormField[], values: DynamicFormValues, allFields = fields): DynamicFormValues {
    return Object.fromEntries(getVisibleFields(fields, values, allFields).flatMap((field) => Object.entries(getFieldAnswers(field, values))));
}

export default getSubmittedAnswers;
export {getFieldAnswers};
