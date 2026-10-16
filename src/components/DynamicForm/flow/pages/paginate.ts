import {getContentElements, getContentFields, getInputCondition, isInputElement} from '@components/DynamicForm/content/parseContent';

import CONST from '@src/CONST';
import type {DynamicFormElement, DynamicFormField, DynamicFormInputElement, DynamicFormPage, DynamicFormSchema, DynamicFormSchemaElement} from '@src/types/onyx';

const OWN_PAGE_TYPES = new Set<DynamicFormField['type']>(['address', 'file', 'multiselect', 'countryMultiselect', 'list']);

function fieldNeedsOwnPage(field: DynamicFormField): boolean {
    if (OWN_PAGE_TYPES.has(field.type)) {
        return true;
    }
    if (field.type !== 'select') {
        return false;
    }
    return !!field.dependsOn || (field.values?.length ?? 0) > CONST.DYNAMIC_FORM.LARGE_SELECT_MIN_OPTIONS;
}

/** Wise's plain inputs always share a page */
function needsOwnPage(input: DynamicFormInputElement): boolean {
    switch (input.elementType) {
        case 'HTMLInput':
            return false;
        case 'ExpensifyInput':
            return fieldNeedsOwnPage(input);
        default: {
            const exhaustiveCheck: never = input;
            return exhaustiveCheck;
        }
    }
}

function toSlug(key: string): string {
    return key
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, '-')
        .replaceAll(/^-+|-+$/g, '');
}

/**
 * Groups a flat list of elements into pages. Fields that need room (addresses, files, multi-selects, lists, dependent or large selects) get a page of their own,
 * and the other inputs share a page up to `MAX_FIELDS_PER_PAGE` in a row. A field with `showWhen` joins the page of its controller and does not count toward that limit.
 * Headings, banners and descriptions join the page of the input after them. The pages have no title and no key, `getPages` names them.
 */
function paginate(elements: DynamicFormSchemaElement[]): DynamicFormPage[] {
    const pages: DynamicFormPage[] = [];
    const pageOfKey = new Map<string, DynamicFormPage>();
    let sharedPage: DynamicFormPage | undefined;
    let sharedQuestionCount = 0;
    let pendingElements: DynamicFormElement[] = [];

    const getPageFor = (input: DynamicFormInputElement): DynamicFormPage => {
        const condition = getInputCondition(input);
        const controllerPage = condition ? pageOfKey.get(condition.key) : undefined;
        if (controllerPage) {
            return controllerPage;
        }
        if (needsOwnPage(input)) {
            const ownPage: DynamicFormPage = {key: '', content: []};
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

    for (const element of getContentElements(elements)) {
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

/** Every page's key becomes a URL-safe route segment that is unique and never the confirmation page's. Pages with no usable key get `page-N`. */
function withRouteKeys(pages: DynamicFormPage[]): DynamicFormPage[] {
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

/** The pages of a schema, as the server grouped them or as `paginate` builds them */
function getPages(schema: DynamicFormSchema): DynamicFormPage[] {
    return withRouteKeys('pages' in schema ? schema.pages : paginate(schema.elements));
}

/** Every App-format field of every page, which is where a `showWhen` finds its controller */
function getAllFields(pages: DynamicFormPage[]): DynamicFormField[] {
    return pages.flatMap((page) => getContentFields(page.content));
}

export default paginate;
export {getAllFields, getPages};
