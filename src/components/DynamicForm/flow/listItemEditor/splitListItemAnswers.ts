import getSubmittedAnswers from '@components/DynamicForm/content/elements/ExpensifyInput/getSubmittedAnswers';
import {getListItemSensitiveAnswerKeys, getListItemSensitiveKey} from '@components/DynamicForm/content/elements/ExpensifyInput/model/listItems';
import type {DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormListField, DynamicFormListItem} from '@src/types/onyx';

type ListItemAnswers = {
    /** The entry as the list keeps it, without its sensitive answers */
    item: DynamicFormListItem;

    /** The entry's sensitive answers under their memory keys */
    sensitiveAnswers: DynamicFormValues;
};

/** Splits the answers of a list entry's editor into the entry and the sensitive answers kept in memory under it */
function splitListItemAnswers(field: DynamicFormListField, itemID: string, itemValues: DynamicFormValues): ListItemAnswers {
    const sensitiveKeys = new Set(getListItemSensitiveAnswerKeys(field.itemFields));
    const listItemAnswers: ListItemAnswers = {item: {id: itemID}, sensitiveAnswers: {}};

    for (const [key, answer] of Object.entries(getSubmittedAnswers(field.itemFields, itemValues))) {
        if (sensitiveKeys.has(key)) {
            listItemAnswers.sensitiveAnswers[getListItemSensitiveKey(field.key, itemID, key)] = answer;
        } else {
            listItemAnswers.item[key] = answer;
        }
    }
    return listItemAnswers;
}

export default splitListItemAnswers;
