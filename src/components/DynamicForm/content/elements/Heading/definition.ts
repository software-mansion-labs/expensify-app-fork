import type {StaticElementDefinition} from '@components/DynamicForm/content/elements/types';
import {hasText} from '@components/DynamicForm/shared';

import type {DynamicFormHeadingElement, DynamicFormSchemaElement} from '@src/types/onyx';

/** A heading with neither a title nor a description has nothing to draw */
function isHeadingElement(element: DynamicFormSchemaElement): element is DynamicFormHeadingElement {
    return (
        element.elementType === 'Heading' &&
        (('title' in element && hasText(element.title)) ||
            ('titleKey' in element && hasText(element.titleKey)) ||
            ('description' in element && hasText(element.description)) ||
            ('descriptionKey' in element && hasText(element.descriptionKey)))
    );
}

const headingDefinition: StaticElementDefinition<'Heading'> = {
    parse: (element) => (isHeadingElement(element) ? element : undefined),
    getCondition: (heading) => heading.showWhen,
    introducesInputs: true,
};

export default headingDefinition;
