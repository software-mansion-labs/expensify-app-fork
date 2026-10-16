import type {DynamicFormElement, DynamicFormInputElement, DynamicFormSchemaElement} from '@src/types/onyx';

import type {DynamicFormElementType, ElementDefinition, ElementOfType, InputElementDefinition, InputElementType, StaticElementDefinition, StaticElementType} from './types';

import {bannerDefinition} from './Banner';
import {descriptionDefinition} from './Description';
import expensifyInputDefinition from './ExpensifyInput/definition';
import {headingDefinition} from './Heading';
import htmlInputDefinition from './HTMLInput/definition';

const INPUT_DEFINITIONS: {[TType in InputElementType]: InputElementDefinition<TType>} = {
    HTMLInput: htmlInputDefinition,
    ExpensifyInput: expensifyInputDefinition,
};

const STATIC_DEFINITIONS: {[TType in StaticElementType]: StaticElementDefinition<TType>} = {
    Heading: headingDefinition,
    Banner: bannerDefinition,
    Description: descriptionDefinition,
};

const ELEMENT_DEFINITIONS: {[TType in DynamicFormElementType]: ElementDefinition<TType>} = {...INPUT_DEFINITIONS, ...STATIC_DEFINITIONS};

function isElementType(elementType: string): elementType is DynamicFormElementType {
    return Object.hasOwn(ELEMENT_DEFINITIONS, elementType);
}

function isInputElement(element: DynamicFormElement): element is DynamicFormInputElement {
    return Object.hasOwn(INPUT_DEFINITIONS, element.elementType);
}

function getElementDefinition<TType extends DynamicFormElementType>(element: ElementOfType<TType>): ElementDefinition<TType> {
    const definition: ElementDefinition<TType> = ELEMENT_DEFINITIONS[element.elementType];
    return definition;
}

function getInputDefinition<TType extends InputElementType>(input: ElementOfType<TType>): InputElementDefinition<TType> {
    const definition: InputElementDefinition<TType> = INPUT_DEFINITIONS[input.elementType];
    return definition;
}

function getStaticDefinition<TType extends StaticElementType>(element: ElementOfType<TType>): StaticElementDefinition<TType> {
    const definition: StaticElementDefinition<TType> = STATIC_DEFINITIONS[element.elementType];
    return definition;
}

/** The element as this App version can draw it, or undefined for an element type it does not know or an element the schema sent malformed */
function parseElement(element: DynamicFormSchemaElement): DynamicFormElement | undefined {
    if (!isElementType(element.elementType)) {
        return undefined;
    }
    return ELEMENT_DEFINITIONS[element.elementType].parse(element);
}

export {getElementDefinition, getInputDefinition, getStaticDefinition, isInputElement, parseElement};
