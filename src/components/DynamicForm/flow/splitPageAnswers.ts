import getAnswerKeys from '@components/DynamicForm/content/elements/ExpensifyInput/model/getAnswerKeys';
import isSensitiveField from '@components/DynamicForm/content/elements/ExpensifyInput/model/isSensitiveField';
import {getListFields, getListItems, getRemovedListItemSensitiveKeys} from '@components/DynamicForm/content/elements/ExpensifyInput/model/listItems';
import getContentAnswers from '@components/DynamicForm/content/getContentAnswers';
import {getContentFields} from '@components/DynamicForm/content/parseContent';
import type {DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormField, DynamicFormPage} from '@src/types/onyx';

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

/** Sorts the answers of a page the user leaves with Next by where they are kept. `values` holds the page's answers merged into the form's. */
function splitPageAnswers(page: DynamicFormPage, values: DynamicFormValues, allFields: DynamicFormField[]): PageAnswers {
    const pageFields = getContentFields(page.content);
    const pageListFields = getListFields(pageFields);
    const sensitiveKeys = new Set(pageFields.filter(isSensitiveField).flatMap(getAnswerKeys));
    const listKeys = new Set(pageListFields.map((field) => field.key));
    const pageAnswers: PageAnswers = {
        draftAnswers: {},
        listAnswers: {},
        sensitiveAnswers: {},
        removedSensitiveKeys: pageListFields.flatMap((field) => getRemovedListItemSensitiveKeys(field, values)),
    };

    for (const [key, answer] of Object.entries(getContentAnswers(page.content, values, allFields))) {
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

export default splitPageAnswers;
export type {PageAnswers};
