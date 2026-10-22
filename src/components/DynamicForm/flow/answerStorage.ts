/** Where the flow keeps each answer: the form draft for most, memory for sensitive ones, and both for a list entry whose sensitive answers are kept apart from it */
import {getContentAnswers, getContentSensitiveKeys, getFieldsContent} from '@components/DynamicForm/content/content';
import type {DynamicFormFlowPage, DynamicFormValues} from '@components/DynamicForm/types';
import isSensitiveField from '@components/DynamicForm/utils/isSensitiveField';
import {getListItems, getListItemSensitiveAnswerKeys, getListItemSensitiveKey, getRemovedListItemSensitiveKeys} from '@components/DynamicForm/utils/listItems';

import {clearSensitiveAnswers, forgetSensitiveAnswers, saveDraftAnswers, saveSensitiveAnswers} from '@userActions/DynamicForm';

import type {OnyxFormKey} from '@src/ONYXKEYS';
import type {DynamicFormField, DynamicFormListField, DynamicFormListItem} from '@src/types/onyx';

import {useEffect, useRef, useState} from 'react';

type SensitiveAnswersCleanupOptions = {
    formID: OnyxFormKey;

    /** useSubPage is sending a visit opened without a page in the URL to its start page */
    isRedirecting: boolean;

    isSubmitting: boolean | undefined;

    submitError: string | undefined;

    /** Memory holds sensitive answers of this form */
    hasSensitiveAnswers: boolean;
};

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
 * Saves the answers of a page the user leaves with Next and returns the ones the screen may get. `values` holds the page's answers merged into the form's.
 * Typed answers are drafted as FormProvider cleaned them and inputs left untouched are drafted with their defaults, so the draft matches what the page validated.
 * Sensitive answers go to memory only. Lists are drafted as they change, so the screen gets their drafted entries, which hold no sensitive answers.
 */
function savePageAnswers(formID: OnyxFormKey, page: DynamicFormFlowPage, values: DynamicFormValues, allFields: DynamicFormField[]): DynamicFormValues {
    const pageListFields = page.content.fields.filter((field): field is DynamicFormListField => field.type === 'list');
    const sensitiveKeys = new Set(getContentSensitiveKeys(page.content));
    const listKeys = new Set(pageListFields.map((field) => field.key));
    const draftAnswers: DynamicFormValues = {};
    const listAnswers: DynamicFormValues = {};
    const sensitiveAnswers: DynamicFormValues = {};
    for (const [key, answer] of Object.entries(getContentAnswers(page.content, values, allFields))) {
        if (sensitiveKeys.has(key)) {
            sensitiveAnswers[key] = answer;
        } else if (listKeys.has(key)) {
            listAnswers[key] = getListItems(values[key]);
        } else {
            draftAnswers[key] = answer;
        }
    }
    saveDraftAnswers(formID, draftAnswers);
    saveSensitiveAnswersIfAny(formID, sensitiveAnswers);
    forgetSensitiveAnswersIfAny(
        formID,
        pageListFields.flatMap((field) => getRemovedListItemSensitiveKeys(field, values)),
    );
    return {...draftAnswers, ...listAnswers};
}

/** Saves an entry from its editor and returns the list's entries. The entry is drafted with the form, except its sensitive answers, which are kept in memory under it. A sensitive list is kept in memory whole. */
function saveListItemAnswers(
    formID: OnyxFormKey,
    field: DynamicFormListField,
    itemID: string,
    isNewItem: boolean,
    itemValues: DynamicFormValues,
    values: DynamicFormValues,
): DynamicFormListItem[] {
    const sensitiveKeys = new Set(getListItemSensitiveAnswerKeys(field.itemFields));
    const item: DynamicFormListItem = {id: itemID};
    const sensitiveAnswers: DynamicFormValues = {};
    for (const [key, answer] of Object.entries(getContentAnswers(getFieldsContent(field.itemFields), itemValues))) {
        if (sensitiveKeys.has(key)) {
            sensitiveAnswers[getListItemSensitiveKey(field.key, itemID, key)] = answer;
        } else {
            item[key] = answer;
        }
    }
    const items = getListItems(values[field.key]);
    const savedItems = isNewItem ? [...items, item] : items.map((existing) => (existing.id === itemID ? item : existing));
    const saveListAnswer = isSensitiveField(field) ? saveSensitiveAnswers : saveDraftAnswers;
    saveListAnswer(formID, {[field.key]: savedItems});
    saveSensitiveAnswersIfAny(formID, sensitiveAnswers);
    return savedItems;
}

/** A sensitive list is kept in memory, so removing an entry is saved right away for the next entry added to build on. A drafted list is saved by its input as it changes. */
function saveSensitiveListItems(formID: OnyxFormKey, field: DynamicFormListField, items: DynamicFormListItem[], values: DynamicFormValues) {
    if (!isSensitiveField(field)) {
        return;
    }
    saveSensitiveAnswers(formID, {[field.key]: items});
    forgetSensitiveAnswersIfAny(formID, getRemovedListItemSensitiveKeys(field, {...values, [field.key]: items}));
}

/**
 * Drops the sensitive answers kept in memory when a new visit starts, and when a submission finishes without an error.
 * Returns whether a new visit is still waiting for the earlier visit's answers to be gone, so the flow shows a spinner until then.
 */
function useSensitiveAnswersCleanup({formID, isRedirecting, isSubmitting, submitError, hasSensitiveAnswers}: SensitiveAnswersCleanupOptions): boolean {
    useEffect(() => {
        if (!isRedirecting) {
            return;
        }
        clearSensitiveAnswers(formID);
    }, [isRedirecting, formID]);

    // No input may start from an earlier visit's answers. The flow can be left without its own Back, such as by a swipe back, which leaves them in memory.
    const [isClearingEarlierVisit, setIsClearingEarlierVisit] = useState(isRedirecting);
    if (isClearingEarlierVisit && !hasSensitiveAnswers) {
        setIsClearingEarlierVisit(false);
    }

    const wasSubmittingRef = useRef(false);
    useEffect(() => {
        if (isSubmitting) {
            wasSubmittingRef.current = true;
            return;
        }
        if (!wasSubmittingRef.current || submitError) {
            return;
        }
        wasSubmittingRef.current = false;
        clearSensitiveAnswers(formID);
    }, [isSubmitting, submitError, formID]);

    return isClearingEarlierVisit;
}

export {saveListItemAnswers, savePageAnswers, saveSensitiveListItems, useSensitiveAnswersCleanup};
