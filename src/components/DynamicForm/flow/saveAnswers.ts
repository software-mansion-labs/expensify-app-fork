import isSensitiveField from '@components/DynamicForm/content/elements/ExpensifyInput/model/isSensitiveField';
import {getListItems, getRemovedListItemSensitiveKeys} from '@components/DynamicForm/content/elements/ExpensifyInput/model/listItems';
import type {DynamicFormValues} from '@components/DynamicForm/types';

import {forgetSensitiveAnswers, saveDraftAnswers, saveSensitiveAnswers} from '@userActions/DynamicForm';

import type {OnyxFormKey} from '@src/ONYXKEYS';
import type {DynamicFormField, DynamicFormListField, DynamicFormListItem, DynamicFormPage} from '@src/types/onyx';

import splitListItemAnswers from './listItemEditor/splitListItemAnswers';
import splitPageAnswers from './splitPageAnswers';

function saveSensitiveAnswersIfAny(formID: OnyxFormKey, answers: DynamicFormValues) {
    if (Object.keys(answers).length === 0) {
        return;
    }
    saveSensitiveAnswers(formID, answers);
}

function forgetSensitiveAnswersIfAny(formID: OnyxFormKey, keys: string[]) {
    if (keys.length === 0) {
        return;
    }
    forgetSensitiveAnswers(formID, keys);
}

/**
 * Saves the answers of a page the user leaves with Next and returns the ones the screen may get. Typed answers are drafted as FormProvider cleaned them, and inputs left untouched
 * are drafted with their defaults, so the draft matches what the page validated. Sensitive answers go to memory only. Lists are drafted as they change, so the screen gets their entries,
 * which hold no sensitive answers.
 */
function savePageAnswers(formID: OnyxFormKey, page: DynamicFormPage, values: DynamicFormValues, allFields: DynamicFormField[]): DynamicFormValues {
    const {draftAnswers, listAnswers, sensitiveAnswers, removedSensitiveKeys} = splitPageAnswers(page, values, allFields);
    saveDraftAnswers(formID, draftAnswers);
    saveSensitiveAnswersIfAny(formID, sensitiveAnswers);
    forgetSensitiveAnswersIfAny(formID, removedSensitiveKeys);
    return {...draftAnswers, ...listAnswers};
}

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

export {saveListItemAnswers, savePageAnswers, saveSensitiveListItems};
