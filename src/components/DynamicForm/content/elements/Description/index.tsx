import Text from '@components/Text';

import useThemeStyles from '@hooks/useThemeStyles';

import type {DynamicFormDescriptionElement} from '@src/types/onyx';

import React from 'react';

type DescriptionProps = {
    element: DynamicFormDescriptionElement;
};

/** Supporting text between the inputs */
function Description({element}: DescriptionProps) {
    const styles = useThemeStyles();

    return <Text style={[styles.textSupporting, styles.mv2]}>{element.text}</Text>;
}

export default Description;
