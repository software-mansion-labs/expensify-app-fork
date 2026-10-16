import {isAnswered, isShown, logSchemaProblem, toFormErrors} from '@components/DynamicForm/shared';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';
import type {SummaryGroupRow} from '@components/SubStepForms/ConfirmationStep';

import CONST from '@src/CONST';
import type {DynamicFormElement, DynamicFormExpensifyInputElement, DynamicFormField, DynamicFormInputElement, DynamicFormPage, DynamicFormSchemaElement} from '@src/types/onyx';

import type {ConfirmationRowHandlers, InputHeadline} from './elements/types';

import {getElementDefinition, getInputDefinition, getStaticDefinition, isInputElement, parseElement} from './elements/registry';

/** Elements this App version can draw, with the fields their conditions can name */
type ParsedContent = {
    /** The elements, in order */
    elements: DynamicFormElement[];

    /** The App-format fields a `showWhen` among the elements can name, which are the whole form's when the elements are one page of it */
    fields: DynamicFormField[];
};

/** The element as this App version can draw it. Elements of an unknown type, malformed or with no key, are left out, so they neither render nor block submission. */
function parseSchemaElement(element: DynamicFormSchemaElement): DynamicFormElement[] {
    if (!element.key) {
        logSchemaProblem('Element without a key', {elementType: element.elementType});
        return [];
    }
    const parsedElement = parseElement(element);
    if (!parsedElement) {
        logSchemaProblem('Unsupported element', {elementType: element.elementType, key: element.key});
        return [];
    }
    return [parsedElement];
}

function getElementFields(elements: DynamicFormElement[]): DynamicFormExpensifyInputElement[] {
    return elements.filter((element): element is DynamicFormExpensifyInputElement => element.elementType === 'ExpensifyInput');
}

/** The content as this App version can draw it. Parse the schema once, so everything after it reads elements it can trust. */
function parseContent(schemaElements: DynamicFormSchemaElement[]): ParsedContent {
    const elements = schemaElements.flatMap(parseSchemaElement);
    return {elements, fields: getElementFields(elements)};
}

/** The pages of one form with their content parsed. Their contents share their fields, since a `showWhen` can name a field on another page. */
function parsePages(pages: DynamicFormPage[]): Array<Omit<DynamicFormPage, 'content'> & {content: ParsedContent}> {
    const parsedPages = pages.map((page) => ({page, elements: page.content.flatMap(parseSchemaElement)}));
    const fields = parsedPages.flatMap(({elements}) => getElementFields(elements));
    return parsedPages.map(({page, elements}) => ({...page, content: {elements, fields}}));
}

/** The fields of a list's entries as content, since they are App-format fields that only name each other */
function getListItemContent(itemFields: DynamicFormField[]): ParsedContent {
    return {elements: itemFields.map((field) => ({...field, elementType: 'ExpensifyInput'})), fields: itemFields};
}

/**
 * Groups the content into pages. Inputs whose element type says they need room get a page of their own,
 * and the other inputs share a page up to `MAX_FIELDS_PER_PAGE` in a row. An input with a condition joins the page of its controller and does not count toward that limit.
 * Headings, banners and descriptions join the page of the input after them.
 */
function paginateContent(content: ParsedContent): ParsedContent[] {
    const pages: ParsedContent[] = [];
    const pageOfKey = new Map<string, ParsedContent>();
    let sharedPage: ParsedContent | undefined;
    let sharedQuestionCount = 0;
    let pendingElements: DynamicFormElement[] = [];

    const addPage = (): ParsedContent => {
        const page: ParsedContent = {elements: [], fields: content.fields};
        pages.push(page);
        return page;
    };

    const getPageFor = (input: DynamicFormInputElement): ParsedContent => {
        const condition = getElementDefinition(input).getCondition(input);
        const controllerPage = condition ? pageOfKey.get(condition.key) : undefined;
        if (controllerPage) {
            return controllerPage;
        }
        if (getInputDefinition(input).needsOwnPage(input)) {
            sharedPage = undefined;
            return addPage();
        }
        if (!sharedPage || sharedQuestionCount >= CONST.DYNAMIC_FORM.MAX_FIELDS_PER_PAGE) {
            sharedPage = addPage();
            sharedQuestionCount = 0;
        }
        sharedQuestionCount++;
        return sharedPage;
    };

    for (const element of content.elements) {
        if (!isInputElement(element)) {
            pendingElements.push(element);
            continue;
        }
        const page = getPageFor(element);
        page.elements.push(...pendingElements, element);
        pendingElements = [];
        pageOfKey.set(element.key, page);
    }
    pages.at(-1)?.elements.push(...pendingElements);
    return pages;
}

/** The App-format fields among the content's own elements, which are the only ones that can be lists */
function getContentFields(content: ParsedContent): DynamicFormExpensifyInputElement[] {
    return getElementFields(content.elements);
}

/** Elements that introduce inputs, such as headings, with no visible input before the next such element, or before the end */
function getOrphanIntroductions(elements: DynamicFormElement[]): Set<DynamicFormElement> {
    const orphanIntroductions = new Set<DynamicFormElement>();
    let pendingIntroduction: DynamicFormElement | undefined;
    for (const element of elements) {
        if (isInputElement(element)) {
            pendingIntroduction = undefined;
        } else if (getStaticDefinition(element).introducesInputs) {
            if (pendingIntroduction) {
                orphanIntroductions.add(pendingIntroduction);
            }
            pendingIntroduction = element;
        }
    }
    if (pendingIntroduction) {
        orphanIntroductions.add(pendingIntroduction);
    }
    return orphanIntroductions;
}

/** The elements the user sees right now. A heading with no visible input before the next heading is left out, so a hidden or unknown field never leaves an orphan title. */
function getVisibleContent(content: ParsedContent, values: DynamicFormValues): DynamicFormElement[] {
    const shownElements = content.elements.filter((element) => isShown(getElementDefinition(element).getCondition(element), values, content.fields));
    const orphanIntroductions = getOrphanIntroductions(shownElements);
    return shownElements.filter((element) => !orphanIntroductions.has(element));
}

/** The inputs the user sees right now, which are the ones validated and submitted */
function getVisibleInputs(content: ParsedContent, values: DynamicFormValues): DynamicFormInputElement[] {
    return getVisibleContent(content, values).filter(isInputElement);
}

/** The content's only visible question. Inputs it reveals, such as an "Other" description, do not count, so the layout stays put when they appear. */
function getLoneInput(content: ParsedContent, values: DynamicFormValues): DynamicFormInputElement | undefined {
    const inputs = getVisibleInputs(content, values);
    const visibleKeys = new Set(inputs.map((input) => input.key));
    const questions = inputs.filter((input) => {
        const condition = getElementDefinition(input).getCondition(input);
        return !condition || !visibleKeys.has(condition.key);
    });
    return questions.length === 1 ? questions.at(0) : undefined;
}

/** The wording of the content's lone question, if its element type gives it any */
function getLoneInputHeadline(content: ParsedContent, values: DynamicFormValues, translate: LocalizedTranslate): InputHeadline | undefined {
    const loneInput = getLoneInput(content, values);
    return loneInput && getInputDefinition(loneInput).getHeadline(loneInput, translate);
}

/** Whether any input of the content has an answer, hidden or not. A No answers a question, so it counts too. */
function hasContentAnswer(content: ParsedContent, values: DynamicFormValues): boolean {
    return content.elements.filter(isInputElement).some((input) => isAnswered(values[input.key], true));
}

/** The answers to the inputs the user can see, so answers left on inputs hidden later are not submitted */
function getContentAnswers(content: ParsedContent, values: DynamicFormValues): DynamicFormValues {
    return Object.fromEntries(getVisibleInputs(content, values).flatMap((input) => Object.entries(getInputDefinition(input).getAnswers(input, values))));
}

/** Errors for the inputs the user can see, in the shape FormProvider's `validate` returns */
function getContentErrors(content: ParsedContent, values: DynamicFormValues, translate: LocalizedTranslate): Record<string, string> {
    return toFormErrors(getVisibleInputs(content, values).flatMap((input) => getInputDefinition(input).getErrors(input, values, translate)));
}

/** The draft keys of the content's answers that stay out of the draft */
function getContentSensitiveKeys(content: ParsedContent): string[] {
    return content.elements.filter(isInputElement).flatMap((input) => getInputDefinition(input).getSensitiveKeys(input));
}

/** The confirmation rows of the inputs the user can see, each drawn by the rules of its element type */
function getContentConfirmationRows(content: ParsedContent, values: DynamicFormValues, translate: LocalizedTranslate, handlers: ConfirmationRowHandlers): SummaryGroupRow[] {
    return getVisibleInputs(content, values).flatMap((input) => getInputDefinition(input).getConfirmationRows(input, values, translate, handlers));
}

export {
    getContentAnswers,
    getContentConfirmationRows,
    getContentErrors,
    getContentFields,
    getContentSensitiveKeys,
    getListItemContent,
    getLoneInput,
    getLoneInputHeadline,
    getVisibleContent,
    getVisibleInputs,
    hasContentAnswer,
    paginateContent,
    parseContent,
    parsePages,
};
export type {ParsedContent};
