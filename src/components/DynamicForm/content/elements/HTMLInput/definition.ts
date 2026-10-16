import type {InputElementDefinition} from '@components/DynamicForm/content/elements/types';

import type {DynamicFormHTMLInputElement, DynamicFormSchemaElement, DynamicFormWiseField} from '@src/types/onyx';

import formatHTMLInputValue from './formatHTMLInputValue';
import getHTMLInputErrors from './getHTMLInputErrors';

const HTML_INPUT_TYPES: Record<DynamicFormWiseField['type'], true> = {
    text: true,
    select: true,
    radio: true,
    date: true,
};

function isHTMLInputElement(element: DynamicFormSchemaElement): element is DynamicFormHTMLInputElement {
    return (
        element.elementType === 'HTMLInput' &&
        'type' in element &&
        typeof element.type === 'string' &&
        Object.hasOwn(HTML_INPUT_TYPES, element.type) &&
        'name' in element &&
        typeof element.name === 'string'
    );
}

/** A Wise field, which Wise checks again when the answers arrive, so none of its answers is held back from the draft */
const htmlInputDefinition: InputElementDefinition<'HTMLInput'> = {
    parse: (element) => (isHTMLInputElement(element) ? element : undefined),
    getCondition: () => undefined,
    getErrors: getHTMLInputErrors,
    getAnswers: (input, values) => (values[input.key] === undefined ? {} : {[input.key]: values[input.key]}),
    getSensitiveKeys: () => [],
    getConfirmationRows: (input, values, translate, {onEdit}) => [
        {id: input.key, description: input.name, title: formatHTMLInputValue(input, values), shouldShowRightIcon: true, onPress: onEdit},
    ],
    needsOwnPage: () => false,
    getHeadline: () => undefined,
};

export default htmlInputDefinition;
