import isSensitiveField from '@components/DynamicForm/content/elements/ExpensifyInput/model/isSensitiveField';
import {getListItems, getRemovedListItemSensitiveKeys} from '@components/DynamicForm/content/elements/ExpensifyInput/model/listItems';
import {forgetSensitiveAnswersIfAny, saveSensitiveAnswersIfAny} from '@components/DynamicForm/flow/shared/sensitiveAnswers';
import type {DynamicFormValues} from '@components/DynamicForm/types';

import {saveDraftAnswers, saveSensitiveAnswers} from '@userActions/DynamicForm';

import type {OnyxFormKey} from '@src/ONYXKEYS';
import type {DynamicFormListField, DynamicFormListItem} from '@src/types/onyx';

import splitListItemAnswers from './splitListItemAnswers';

/** Saves a list entry from its editor and returns the list's entries. The entry is drafted with the form, except its sensitive answers, which are kept in memory under it. A sensitive list is kept in memory whole. */
function saveListItemAnswers(
    formID: OnyxFormKey,
    field: DynamicFormListField,
    itemID: string,
    isNewItem: boolean,
    itemValues: DynamicFormValues,
    values: DynamicFormValues,
): DynamicFormListItem[] {
    const items = getListItems(values[field.key]);
    const {item, sensitiveAnswers} = splitListItemAnswers(field, itemID, itemValues);
    const savedItems = isNewItem ? [...items, item] : items.map((existing) => (existing.id === itemID ? item : existing));
    const saveListAnswer = isSensitiveField(field) ? saveSensitiveAnswers : saveDraftAnswers;
    saveListAnswer(formID, {[field.key]: savedItems});
    saveSensitiveAnswersIfAny(formID, sensitiveAnswers);
    return savedItems;
}

/** Keeps a sensitive list in memory up to date after the user removes an entry, so the next entry added builds on it. A drafted list is saved by its input as it changes. */
function saveSensitiveListItems(formID: OnyxFormKey, field: DynamicFormListField, items: DynamicFormListItem[], values: DynamicFormValues) {
    if (!isSensitiveField(field)) {
        return;
    }
    saveSensitiveAnswers(formID, {[field.key]: items});
    forgetSensitiveAnswersIfAny(formID, getRemovedListItemSensitiveKeys(field, {...values, [field.key]: items}));
}

export default saveListItemAnswers;
export {saveSensitiveListItems};
