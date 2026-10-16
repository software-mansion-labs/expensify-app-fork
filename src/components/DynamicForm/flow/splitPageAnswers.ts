import getContentFields from '@components/DynamicForm/content/elements/ExpensifyInput/getContentFields';
import {getListFields, getListItems, getRemovedListItemSensitiveKeys} from '@components/DynamicForm/content/elements/ExpensifyInput/list';
import {getInputDefinition, isInputElement} from '@components/DynamicForm/content/elements/registry';
import getContentAnswers from '@components/DynamicForm/content/getContentAnswers';
import type {DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormField} from '@src/types/onyx';

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

/** Sorts the answers of a page the user leaves with Next by where they are kept. `values` holds the page's answers merged into the form's. */
function splitPageAnswers(page: DynamicFormFlowPage, values: DynamicFormValues, allFields: DynamicFormField[]): PageAnswers {
    const pageListFields = getListFields(getContentFields(page.content));
    const sensitiveKeys = new Set(page.content.filter(isInputElement).flatMap((input) => getInputDefinition(input).getSensitiveKeys(input)));
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
