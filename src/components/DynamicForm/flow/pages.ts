import getContentFields from '@components/DynamicForm/content/elements/ExpensifyInput/getContentFields';
import {getElementDefinition, getInputDefinition, isInputElement} from '@components/DynamicForm/content/elements/registry';
import type {InputHeadline} from '@components/DynamicForm/content/elements/types';
import getContentErrors from '@components/DynamicForm/content/getContentErrors';
import getLoneInput from '@components/DynamicForm/content/getLoneInput';
import getVisibleContent, {getVisibleInputs} from '@components/DynamicForm/content/getVisibleContent';
import parseContent from '@components/DynamicForm/content/parseContent';
import {getLocalizedText, isAnswered, isShown} from '@components/DynamicForm/shared';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import CONST from '@src/CONST';
import type {DynamicFormElement, DynamicFormField, DynamicFormInputElement, DynamicFormSchema} from '@src/types/onyx';

import type {DynamicFormFlowPage} from './types';

type StartPageOptions = {
    pages: DynamicFormFlowPage[];
    allFields: DynamicFormField[];

    /** Only the draft decides, since a visit opened without a page in the URL drops the sensitive answers of earlier visits */
    draftValues: DynamicFormValues;

    isDraftLoading: boolean;
    firstShownPageIndex: number;
    lastShownPageIndex: number;
    translate: LocalizedTranslate;
};

/**
 * Groups a flat list of elements into pages. Inputs whose element type says they need room get a page of their own,
 * and the other inputs share a page up to `MAX_FIELDS_PER_PAGE` in a row. An input with a condition joins the page of its controller and does not count toward that limit.
 * Headings, banners and descriptions join the page of the input after them. The pages have no title and no key, `getPages` names them.
 */
function paginate(elements: DynamicFormElement[]): DynamicFormFlowPage[] {
    const pages: DynamicFormFlowPage[] = [];
    const pageOfKey = new Map<string, DynamicFormFlowPage>();
    let sharedPage: DynamicFormFlowPage | undefined;
    let sharedQuestionCount = 0;
    let pendingElements: DynamicFormElement[] = [];

    const getPageFor = (input: DynamicFormInputElement): DynamicFormFlowPage => {
        const condition = getElementDefinition(input).getCondition(input);
        const controllerPage = condition ? pageOfKey.get(condition.key) : undefined;
        if (controllerPage) {
            return controllerPage;
        }
        if (getInputDefinition(input).needsOwnPage(input)) {
            const ownPage: DynamicFormFlowPage = {key: '', content: []};
            pages.push(ownPage);
            sharedPage = undefined;
            return ownPage;
        }
        if (!sharedPage || sharedQuestionCount >= CONST.DYNAMIC_FORM.MAX_FIELDS_PER_PAGE) {
            sharedPage = {key: '', content: []};
            sharedQuestionCount = 0;
            pages.push(sharedPage);
        }
        sharedQuestionCount++;
        return sharedPage;
    };

    for (const element of elements) {
        if (!isInputElement(element)) {
            pendingElements.push(element);
            continue;
        }
        const page = getPageFor(element);
        page.content.push(...pendingElements, element);
        pendingElements = [];
        pageOfKey.set(element.key, page);
    }
    pages.at(-1)?.content.push(...pendingElements);
    return pages;
}

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

/** The pages of a schema, as the server grouped them or as `paginate` builds them. Their content is parsed here, once for the whole flow. */
function getPages(schema: DynamicFormSchema): DynamicFormFlowPage[] {
    const pages = 'pages' in schema ? schema.pages.map((page) => ({...page, content: parseContent(page.content)})) : paginate(parseContent(schema.elements));
    return withRouteKeys(pages);
}

/** Every App-format field of every page, which is where a `showWhen` finds its controller */
function getAllFields(pages: DynamicFormFlowPage[]): DynamicFormField[] {
    return pages.flatMap((page) => getContentFields(page.content));
}

/** A page is shown when its own `showWhen` matches and it has an input to show. A page that is not shown is skipped, and its fields are not asked or submitted. */
function isPageShown(page: DynamicFormFlowPage, values: DynamicFormValues, allFields: DynamicFormField[]): boolean {
    return isShown(page.showWhen, values, allFields) && getVisibleInputs(page.content, values, allFields).length > 0;
}

/** The wording of the page's lone question, if its element type gives the page any */
function getLoneInputHeadline(page: DynamicFormFlowPage, values: DynamicFormValues, translate: LocalizedTranslate, allFields?: DynamicFormField[]): InputHeadline | undefined {
    const loneInput = getLoneInput(getVisibleContent(page.content, values, allFields));
    return loneInput && getInputDefinition(loneInput).getHeadline(loneInput, translate);
}

/** The page's own title, else the wording of its lone question. A label never names a section, since the label is already on the question's row. */
function getPageSectionName(page: DynamicFormFlowPage, values: DynamicFormValues, translate: LocalizedTranslate, allFields?: DynamicFormField[]): string {
    const ownTitle = getLocalizedText(translate, page.titleKey, page.title);
    if (ownTitle) {
        return ownTitle;
    }
    return getLoneInputHeadline(page, values, translate, allFields)?.question ?? '';
}

/** The page's section name, else the label of its lone question. An untitled page with several questions has no headline, since no one of them names the page. */
function getPageTitle(page: DynamicFormFlowPage, values: DynamicFormValues, translate: LocalizedTranslate, allFields?: DynamicFormField[]): string {
    const sectionName = getPageSectionName(page, values, translate, allFields);
    if (sectionName) {
        return sectionName;
    }
    return getLoneInputHeadline(page, values, translate, allFields)?.label ?? '';
}

/** The first page with an error, or -1 when every page is complete. Pages the answers hide are never asked, so they cannot be the first gap. */
function getFirstIncompletePageIndex(pages: DynamicFormFlowPage[], allFields: DynamicFormField[], answers: DynamicFormValues, translate: LocalizedTranslate): number {
    return pages.findIndex((page) => isPageShown(page, answers, allFields) && Object.keys(getContentErrors(page.content, answers, translate, allFields)).length > 0);
}

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

export {getAllFields, getFirstIncompletePageIndex, getPageSectionName, getPages, getPageTitle, getStartPageIndex, isPageShown, paginate};
