import getLocalizedText from '@components/DynamicForm/shared/getLocalizedText';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';
import type {DynamicFormHeadingElement} from '@src/types/onyx';

import React from 'react';
import {View} from 'react-native';

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
