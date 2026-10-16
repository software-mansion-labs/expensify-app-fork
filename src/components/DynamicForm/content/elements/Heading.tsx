import {getLocalizedText, hasText} from '@components/DynamicForm/shared';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';
import type {DynamicFormHeadingElement, DynamicFormSchemaElement} from '@src/types/onyx';

import React from 'react';
import {View} from 'react-native';

import type {StaticElementDefinition} from './types';

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

type HeadingProps = {
    element: DynamicFormHeadingElement;

    /** The heading opens the page, so it needs no space above it */
    isFirst: boolean;
};

/** A title between the inputs, with an optional description under it */
function Heading({element, isFirst}: HeadingProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const title = getLocalizedText(translate, element.titleKey, element.title);
    const description = getLocalizedText(translate, element.descriptionKey, element.description);

    return (
        <View style={[styles.mb2, !isFirst && styles.mt3]}>
            {!!title && (
                <Text
                    style={styles.textStrong}
                    accessibilityRole={CONST.ROLE.HEADER}
                >
                    {title}
                </Text>
            )}
            {!!description && <Text style={[styles.textSupporting, !!title && styles.mt1]}>{description}</Text>}
        </View>
    );
}

export default Heading;
export {headingDefinition};
