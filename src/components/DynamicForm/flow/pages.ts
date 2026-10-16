import {
    getContentErrors,
    getContentFields,
    getLoneInputHeadline,
    getVisibleInputs,
    hasContentAnswer,
    paginateContent,
    parseContent,
    parsePages,
} from '@components/DynamicForm/content/content';
import {getLocalizedText, isShown} from '@components/DynamicForm/shared';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import CONST from '@src/CONST';
import type {DynamicFormField, DynamicFormSchema} from '@src/types/onyx';

import type {DynamicFormFlowPage} from './types';

type StartPageOptions = {
    pages: DynamicFormFlowPage[];

    /** Only the draft decides, since a visit opened without a page in the URL drops the sensitive answers of earlier visits */
    draftValues: DynamicFormValues;

    isDraftLoading: boolean;
    firstShownPageIndex: number;
    lastShownPageIndex: number;
    translate: LocalizedTranslate;
};

function toSlug(key: string): string {
    return key
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, '-')
        .replaceAll(/^-+|-+$/g, '');
}

/** Every page's key becomes a URL-safe route segment that is unique and never the confirmation page's. Pages with no usable key get `page-N`. */
function withRouteKeys(pages: DynamicFormFlowPage[]): DynamicFormFlowPage[] {
    const takenKeys = new Set<string>([CONST.DYNAMIC_FORM.CONFIRMATION_PAGE_KEY]);
    return pages.map((page, index) => {
        const baseKey = toSlug(page.key) || `page-${index + 1}`;
        let key = baseKey;
        for (let suffix = 2; takenKeys.has(key); suffix++) {
            key = `${baseKey}-${suffix}`;
        }
        takenKeys.add(key);
        return {...page, key};
    });
}

/** The pages of a schema, as the server grouped them or as the App paginates a flat list. Their content is parsed here, once for the whole flow. */
function getPages(schema: DynamicFormSchema): DynamicFormFlowPage[] {
    const pages = 'pages' in schema ? parsePages(schema.pages) : paginateContent(parseContent(schema.elements)).map((content) => ({key: '', content}));
    return withRouteKeys(pages);
}

/** Every App-format field of every page, which is where the flow finds a list by its key */
function getAllFields(pages: DynamicFormFlowPage[]): DynamicFormField[] {
    return pages.flatMap((page) => getContentFields(page.content));
}

/** A page is shown when its own `showWhen` matches and it has an input to show. A page that is not shown is skipped, and its fields are not asked or submitted. */
function isPageShown(page: DynamicFormFlowPage, values: DynamicFormValues): boolean {
    return isShown(page.showWhen, values, page.content.fields) && getVisibleInputs(page.content, values).length > 0;
}

/** The page's own title, else the wording of its lone question. A label never names a section, since the label is already on the question's row. */
function getPageSectionName(page: DynamicFormFlowPage, values: DynamicFormValues, translate: LocalizedTranslate): string {
    const ownTitle = getLocalizedText(translate, page.titleKey, page.title);
    if (ownTitle) {
        return ownTitle;
    }
    return getLoneInputHeadline(page.content, values, translate)?.question ?? '';
}

/** The page's section name, else the label of its lone question. An untitled page with several questions has no headline, since no one of them names the page. */
function getPageTitle(page: DynamicFormFlowPage, values: DynamicFormValues, translate: LocalizedTranslate): string {
    const sectionName = getPageSectionName(page, values, translate);
    if (sectionName) {
        return sectionName;
    }
    return getLoneInputHeadline(page.content, values, translate)?.label ?? '';
}

/** The first page with an error, or -1 when every page is complete. Pages the answers hide are never asked, so they cannot be the first gap. */
function getFirstIncompletePageIndex(pages: DynamicFormFlowPage[], answers: DynamicFormValues, translate: LocalizedTranslate): number {
    return pages.findIndex((page) => isPageShown(page, answers) && Object.keys(getContentErrors(page.content, answers, translate)).length > 0);
}

/** Where a visit opened without a page in the URL starts: the first page of a new form, else the first gap in the draft, else the last page. -1 while the draft loads. */
function getStartPageIndex({pages, draftValues, isDraftLoading, firstShownPageIndex, lastShownPageIndex, translate}: StartPageOptions): number {
    if (isDraftLoading) {
        return -1;
    }
    if (!pages.some((page) => hasContentAnswer(page.content, draftValues))) {
        return firstShownPageIndex;
    }
    const firstIncompleteIndex = getFirstIncompletePageIndex(pages, draftValues, translate);
    return firstIncompleteIndex === -1 ? lastShownPageIndex : firstIncompleteIndex;
}

export {getAllFields, getFirstIncompletePageIndex, getPageSectionName, getPages, getPageTitle, getStartPageIndex, isPageShown};
