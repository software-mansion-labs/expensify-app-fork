import logSchemaProblem from '@components/DynamicForm/shared/logSchemaProblem';

import type {DynamicFormElement, DynamicFormSchemaElement} from '@src/types/onyx';

import {parseElement} from './elements/registry';

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

/** The content as this App version can draw it. Parse the schema once, so everything after it reads elements it can trust. */
function parseContent(content: DynamicFormSchemaElement[]): DynamicFormElement[] {
    return content.flatMap(parseSchemaElement);
}

export default parseContent;
