import hasText from '@components/DynamicForm/content/elements/shared/hasText';
import type {StaticElementDefinition} from '@components/DynamicForm/content/elements/types';

import type {DynamicFormDescriptionElement, DynamicFormSchemaElement} from '@src/types/onyx';

function isDescriptionElement(element: DynamicFormSchemaElement): element is DynamicFormDescriptionElement {
    return element.elementType === 'Description' && 'text' in element && hasText(element.text);
}

const descriptionDefinition: StaticElementDefinition<'Description'> = {
    parse: (element) => (isDescriptionElement(element) ? element : undefined),
    getCondition: () => undefined,
    introducesInputs: false,
};

export default descriptionDefinition;
