import {getContentAnswers, getContentErrors, getLoneField, getVisibleFields, parseContent} from '@components/DynamicForm/content/content';
import {fieldDefinition, parseFields} from '@components/DynamicForm/content/definitions';
import {isAnswered} from '@components/DynamicForm/content/getFieldErrors';
import type {DynamicFormFlowPage, DynamicFormValues, ParsedContent} from '@components/DynamicForm/types';
import getLocalizedText from '@components/DynamicForm/utils/getLocalizedText';
import isShown from '@components/DynamicForm/utils/isShown';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import CONST from '@src/CONST';
import type {DynamicFormField, DynamicFormPage, DynamicFormSchema} from '@src/types/onyx';

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
 * Groups a flat list of fields into pages. Fields that need room (addresses, files, multi-selects, lists, dependent or large selects) get a page of their own,
 * and the rest share a page up to `MAX_FIELDS_PER_PAGE` in a row. A field with `showWhen` joins the page of its controller and does not count toward that limit.
 */
function paginate(fields: DynamicFormField[]): ParsedContent[] {
    const pages: ParsedContent[] = [];
    const pageOfKey = new Map<string, ParsedContent>();
    let sharedPage: ParsedContent | undefined;
    let sharedQuestionCount = 0;

    const addField = (page: ParsedContent, field: DynamicFormField) => {
        page.items.push(field);
        page.fields.push(field);
        pageOfKey.set(field.key, page);
    };

    for (const field of fields) {
        const controllerPage = field.showWhen ? pageOfKey.get(field.showWhen.key) : undefined;
        if (controllerPage) {
            addField(controllerPage, field);
            continue;
        }

        if (fieldDefinition.needsOwnPage(field)) {
            const ownPage: ParsedContent = {items: [], fields: []};
            pages.push(ownPage);
            addField(ownPage, field);
            sharedPage = undefined;
            continue;
        }

        if (!sharedPage || sharedQuestionCount >= CONST.DYNAMIC_FORM.MAX_FIELDS_PER_PAGE) {
            sharedPage = {items: [], fields: []};
            sharedQuestionCount = 0;
            pages.push(sharedPage);
        }
        addField(sharedPage, field);
        sharedQuestionCount++;
    }
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
    const pages =
        'pages' in schema ? schema.pages.map((page) => ({...page, content: parseContent(page.content)})) : paginate(parseFields(schema.fields)).map((content) => ({key: '', content}));
    return withRouteKeys(pages);
}

/** The page in the schema's shape, for the screen */
function toSchemaPage(page: DynamicFormFlowPage): DynamicFormPage {
    return {...page, content: page.content.items};
}

/** Every field of every page, which is where a `showWhen` finds its controller */
function getAllFields(pages: DynamicFormFlowPage[]): DynamicFormField[] {
    return pages.flatMap((page) => page.content.fields);
}

/** A page is shown when its own `showWhen` matches and it has a field to show. A page that is not shown is skipped, and its fields are not asked or submitted. */
function isPageShown(page: DynamicFormFlowPage, values: DynamicFormValues, allFields: DynamicFormField[]): boolean {
    return isShown(page.showWhen, values, allFields) && getVisibleFields(page.content, values, allFields).length > 0;
}

function getLoneFieldHeadline(page: DynamicFormFlowPage, values: DynamicFormValues, translate: LocalizedTranslate, allFields?: DynamicFormField[]) {
    const loneField = getLoneField(getVisibleFields(page.content, values, allFields));
    return loneField && fieldDefinition.getHeadline(loneField, translate);
}

/** The page's own title, else the schema's wording of its lone question. A label never names a section, since the label is already on the question's row. */
function getPageSectionName(page: DynamicFormFlowPage, values: DynamicFormValues, translate: LocalizedTranslate, allFields?: DynamicFormField[]): string {
    const ownTitle = getLocalizedText(translate, page.titleKey, page.title);
    if (ownTitle) {
        return ownTitle;
    }
    return getLoneFieldHeadline(page, values, translate, allFields)?.question ?? '';
}

/** The page's section name, else the label of its lone question. An untitled page with several questions has no headline, since no one of them names the page. */
function getPageTitle(page: DynamicFormFlowPage, values: DynamicFormValues, translate: LocalizedTranslate, allFields?: DynamicFormField[]): string {
    const sectionName = getPageSectionName(page, values, translate, allFields);
    if (sectionName) {
        return sectionName;
    }
    return getLoneFieldHeadline(page, values, translate, allFields)?.label ?? '';
}

/** The first page with an error, or -1 when every page is complete. Pages the answers hide are never asked, so they cannot be the first gap. */
function getFirstIncompletePageIndex(pages: DynamicFormFlowPage[], answers: DynamicFormValues, translate: LocalizedTranslate, allFields: DynamicFormField[]): number {
    return pages.findIndex((page) => isPageShown(page, answers, allFields) && Object.keys(getContentErrors(page.content, answers, translate, allFields)).length > 0);
}

/** The answers to the visible fields of the shown pages, which is what the form submits */
function getFormAnswers(pages: DynamicFormFlowPage[], answers: DynamicFormValues, allFields: DynamicFormField[]): DynamicFormValues {
    return Object.fromEntries(pages.filter((page) => isPageShown(page, answers, allFields)).flatMap((page) => Object.entries(getContentAnswers(page.content, answers, allFields))));
}

/**
 * Where a visit opened without a page in the URL starts: the first page while the draft holds no answer, else the first gap in the draft, else the last page. -1 while the draft loads.
 * A No answers a Yes/No question, so it counts as an answer, and text of only spaces does not.
 */
function getStartPageIndex({pages, allFields, draftValues, isDraftLoading, firstShownPageIndex, lastShownPageIndex, translate}: StartPageOptions): number {
    if (isDraftLoading) {
        return -1;
    }
    if (!allFields.some((field) => isAnswered(draftValues[field.key], true))) {
        return firstShownPageIndex;
    }
    const firstIncompleteIndex = getFirstIncompletePageIndex(pages, draftValues, translate, allFields);
    return firstIncompleteIndex === -1 ? lastShownPageIndex : firstIncompleteIndex;
}

export {getAllFields, getFirstIncompletePageIndex, getFormAnswers, getPages, getPageSectionName, getPageTitle, getStartPageIndex, isPageShown, paginate, toSchemaPage};
