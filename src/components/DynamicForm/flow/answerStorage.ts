import {getContentAnswers, getContentFields, getContentSensitiveKeys} from '@components/DynamicForm/content/content';
import {
    getListFields,
    getListItems,
    getListItemSensitiveAnswerKeys,
    getListItemSensitiveKey,
    getRemovedListItemSensitiveKeys,
    getSubmittedAnswers,
} from '@components/DynamicForm/content/elements/ExpensifyInput/list';
import type {DynamicFormValues} from '@components/DynamicForm/types';

import {clearSensitiveAnswers, forgetSensitiveAnswers, saveDraftAnswers, saveSensitiveAnswers} from '@userActions/DynamicForm';

import type {OnyxFormKey} from '@src/ONYXKEYS';
import type {DynamicFormListField, DynamicFormListItem} from '@src/types/onyx';

import {useEffect, useRef} from 'react';

import type {DynamicFormFlowPage} from './types';

type PageAnswers = {
    /** Answers the form draft keeps */
    draftAnswers: DynamicFormValues;

    /** Entries of the page's lists, which are drafted as they change, so they only go to the screen */
    listAnswers: DynamicFormValues;

    /** Answers kept in memory only */
    sensitiveAnswers: DynamicFormValues;

    /** Memory keys of sensitive answers of list entries the user removed on the page */
    removedSensitiveKeys: string[];
};

type ListItemAnswers = {
    /** The entry as the list keeps it, without its sensitive answers */
    item: DynamicFormListItem;

    /** The entry's sensitive answers under their memory keys */
    sensitiveAnswers: DynamicFormValues;
};

type SensitiveAnswersCleanupOptions = {
    formID: OnyxFormKey;

    /** useSubPage is sending a visit opened without a page in the URL to its start page */
    isRedirecting: boolean;

    isSubmitting: boolean | undefined;

    submitError: string | undefined;
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

/** Sorts the answers of a page the user leaves with Next by where they are kept. `values` holds the page's answers merged into the form's. */
function splitPageAnswers(page: DynamicFormFlowPage, values: DynamicFormValues): PageAnswers {
    const pageListFields = getListFields(getContentFields(page.content));
    const sensitiveKeys = new Set(getContentSensitiveKeys(page.content));
    const listKeys = new Set(pageListFields.map((field) => field.key));
    const pageAnswers: PageAnswers = {
        draftAnswers: {},
        listAnswers: {},
        sensitiveAnswers: {},
        removedSensitiveKeys: pageListFields.flatMap((field) => getRemovedListItemSensitiveKeys(field, values)),
    };

    for (const [key, answer] of Object.entries(getContentAnswers(page.content, values))) {
        if (sensitiveKeys.has(key)) {
            pageAnswers.sensitiveAnswers[key] = answer;
        } else if (listKeys.has(key)) {
            pageAnswers.listAnswers[key] = getListItems(values[key]);
        } else {
            pageAnswers.draftAnswers[key] = answer;
        }
    }
    return pageAnswers;
}

/**
 * Saves the answers of a page the user leaves with Next and returns the ones the screen may get. Typed answers are drafted as FormProvider cleaned them, and inputs left untouched
 * are drafted with their defaults, so the draft matches what the page validated. Sensitive answers go to memory only. Lists are drafted as they change, so the screen gets their entries,
 * which hold no sensitive answers.
 */
function savePageAnswers(formID: OnyxFormKey, page: DynamicFormFlowPage, values: DynamicFormValues): DynamicFormValues {
    const {draftAnswers, listAnswers, sensitiveAnswers, removedSensitiveKeys} = splitPageAnswers(page, values);
    saveDraftAnswers(formID, draftAnswers);
    saveSensitiveAnswersIfAny(formID, sensitiveAnswers);
    forgetSensitiveAnswersIfAny(formID, removedSensitiveKeys);
    return {...draftAnswers, ...listAnswers};
}

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
    const saveListAnswer = field.sensitive ? saveSensitiveAnswers : saveDraftAnswers;
    saveListAnswer(formID, {[field.key]: savedItems});
    saveSensitiveAnswersIfAny(formID, sensitiveAnswers);
    return savedItems;
}

/** Keeps a sensitive list in memory up to date after the user removes an entry, so the next entry added builds on it. A drafted list is saved by its input as it changes. */
function saveSensitiveListItems(formID: OnyxFormKey, field: DynamicFormListField, items: DynamicFormListItem[], values: DynamicFormValues) {
    if (!field.sensitive) {
        return;
    }
    saveSensitiveAnswers(formID, {[field.key]: items});
    forgetSensitiveAnswersIfAny(formID, getRemovedListItemSensitiveKeys(field, {...values, [field.key]: items}));
}

/** Drops the sensitive answers kept in memory when a new visit starts and when a submission finishes without an error */
function useSensitiveAnswersCleanup({formID, isRedirecting, isSubmitting, submitError}: SensitiveAnswersCleanupOptions) {
    useEffect(() => {
        if (!isRedirecting) {
            return;
        }
        clearSensitiveAnswers(formID);
    }, [isRedirecting, formID]);

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
}

export {saveListItemAnswers, savePageAnswers, saveSensitiveListItems, splitListItemAnswers, splitPageAnswers, useSensitiveAnswersCleanup};
export type {PageAnswers};
