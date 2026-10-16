import logSchemaProblem from '@components/DynamicForm/shared/logSchemaProblem';

import type {DynamicFormElement, DynamicFormExpensifyInputElement, DynamicFormField, DynamicFormInputElement, DynamicFormSchemaElement, DynamicFormWiseField} from '@src/types/onyx';

import {isSupportedFieldType} from './elements/ExpensifyInput/isSupportedField';

const HTML_INPUT_TYPES: Record<DynamicFormWiseField['type'], true> = {
    text: true,
    select: true,
    radio: true,
    date: true,
};

function hasText(text: unknown): boolean {
    return typeof text === 'string' && text !== '';
}

/** Whether this App version can draw the element. The schema is checked here only, so the components can trust the element they get. */
function isKnownElement(element: DynamicFormSchemaElement): boolean {
    switch (element.elementType) {
        case 'HTMLInput':
            return 'type' in element && typeof element.type === 'string' && Object.hasOwn(HTML_INPUT_TYPES, element.type) && 'name' in element && typeof element.name === 'string';
        case 'ExpensifyInput':
            return 'type' in element && typeof element.type === 'string' && isSupportedFieldType(element.type, element.key);
        case 'Heading':
            return (
                ('title' in element && hasText(element.title)) ||
                ('titleKey' in element && hasText(element.titleKey)) ||
                ('description' in element && hasText(element.description)) ||
                ('descriptionKey' in element && hasText(element.descriptionKey))
            );
        case 'Banner':
        case 'Description':
            return 'text' in element && hasText(element.text);
        default:
            return false;
    }
}

/** Elements this App version does not know, or with no key, are left out, so they neither render nor block submission */
function isSupportedElement(element: DynamicFormSchemaElement): element is DynamicFormElement {
    if (!element.key) {
        logSchemaProblem('Element without a key', {elementType: element.elementType});
        return false;
    }
    if (isKnownElement(element)) {
        return true;
    }
    logSchemaProblem('Unsupported element', {elementType: element.elementType, key: element.key});
    return false;
}

function isInputElement(element: DynamicFormElement): element is DynamicFormInputElement {
    return element.elementType === 'HTMLInput' || element.elementType === 'ExpensifyInput';
}

function getContentElements(content: DynamicFormSchemaElement[]): DynamicFormElement[] {
    return content.filter(isSupportedElement);
}

function getContentInputs(content: DynamicFormSchemaElement[]): DynamicFormInputElement[] {
    return getContentElements(content).filter(isInputElement);
}

/** The App-format fields of a page's content, for getDynamicFieldErrors and the other field checks */
function getContentFields(content: DynamicFormSchemaElement[]): DynamicFormExpensifyInputElement[] {
    return getContentElements(content).filter((element): element is DynamicFormExpensifyInputElement => element.elementType === 'ExpensifyInput');
}

/** The condition that shows an input. Wise shows or hides fields only by sending new requirements, so an HTML input has none. */
function getInputCondition(input: DynamicFormInputElement): DynamicFormField['showWhen'] {
    switch (input.elementType) {
        case 'HTMLInput':
            return undefined;
        case 'ExpensifyInput':
            return input.showWhen;
        default: {
            const exhaustiveCheck: never = input;
            return exhaustiveCheck;
        }
    }
}

/** The fields of a list entry are App-format fields, so they become content once tagged */
function toExpensifyInputElements(fields: DynamicFormField[]): DynamicFormExpensifyInputElement[] {
    return fields.map((field) => ({...field, elementType: 'ExpensifyInput'}));
}

export {getContentElements, getContentFields, getContentInputs, getInputCondition, isInputElement, isSupportedElement, toExpensifyInputElements};
