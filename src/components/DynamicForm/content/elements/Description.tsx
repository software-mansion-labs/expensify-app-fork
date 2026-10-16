import {hasText} from '@components/DynamicForm/shared';
import Text from '@components/Text';

import useThemeStyles from '@hooks/useThemeStyles';

import type {DynamicFormDescriptionElement, DynamicFormSchemaElement} from '@src/types/onyx';

import React from 'react';

import type {StaticElementDefinition} from './types';

function isDescriptionElement(element: DynamicFormSchemaElement): element is DynamicFormDescriptionElement {
    return element.elementType === 'Description' && 'text' in element && hasText(element.text);
}

const descriptionDefinition: StaticElementDefinition<'Description'> = {
    parse: (element) => (isDescriptionElement(element) ? element : undefined),
    getCondition: () => undefined,
    introducesInputs: false,
};

type DescriptionProps = {
    element: DynamicFormDescriptionElement;
};

/** Supporting text between the inputs */
function Description({element}: DescriptionProps) {
    const styles = useThemeStyles();

    return <Text style={[styles.textSupporting, styles.mv2]}>{element.text}</Text>;
}

export default Description;
export {descriptionDefinition};
