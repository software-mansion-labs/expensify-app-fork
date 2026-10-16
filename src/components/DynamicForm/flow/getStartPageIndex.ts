import {isInputElement} from '@components/DynamicForm/content/elements/registry';
import {isAnswered} from '@components/DynamicForm/shared';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {DynamicFormField} from '@src/types/onyx';

import type {FlowPages} from './getFlowPages';
import type {DynamicFormFlowPage} from './types';

import getFirstIncompletePageIndex from './getFirstIncompletePageIndex';

type StartPageOptions = Pick<FlowPages, 'firstShownPageIndex' | 'lastShownPageIndex'> & {
    pages: DynamicFormFlowPage[];
    allFields: DynamicFormField[];

    /** Only the draft decides, since a visit opened without a page in the URL drops the sensitive answers of earlier visits */
    draftValues: DynamicFormValues;

    isDraftLoading: boolean;
    translate: LocalizedTranslate;
};

/** Where a visit opened without a page in the URL starts: the first page of a new form, else the first gap in the draft, else the last page. -1 while the draft loads. */
function getStartPageIndex({pages, allFields, draftValues, isDraftLoading, firstShownPageIndex, lastShownPageIndex, translate}: StartPageOptions): number {
    if (isDraftLoading) {
        return -1;
    }
    // A No answers a question, so it counts as progress too
    const hasDraftAnswer = pages.some((page) => page.content.filter(isInputElement).some((input) => isAnswered(draftValues[input.key], true)));
    if (!hasDraftAnswer) {
        return firstShownPageIndex;
    }
    const firstIncompleteIndex = getFirstIncompletePageIndex(pages, allFields, draftValues, translate);
    return firstIncompleteIndex === -1 ? lastShownPageIndex : firstIncompleteIndex;
}

export default getStartPageIndex;
