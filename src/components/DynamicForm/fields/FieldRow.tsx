import getLocalizedText, {getInputLabel} from '@components/DynamicForm/utils/getLocalizedText';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';
import type {DynamicFormField} from '@src/types/onyx';

import type {ReactNode} from 'react';

import React from 'react';
import {View} from 'react-native';

type FieldRowProps = {
    field: DynamicFormField;

    /** The page title already names the field */
    shouldHideLabel?: boolean;

    /** Spans the page edge to edge like a menu row, instead of sitting inside the page padding */
    isMenuRow?: boolean;

    /** The input has no label of its own, so the field label is drawn above it, as a question prompt or as a bold heading */
    labelAbove?: 'prompt' | 'heading';

    /** The input shows the field description itself, so the row does not draw it */
    isDescriptionInInput?: boolean;

    children: ReactNode;
};

/** The layout around one field's input: the label and description it lacks, and the page padding it sits in */
function FieldRow({field, shouldHideLabel = false, isMenuRow = false, labelAbove, isDescriptionInInput = false, children}: FieldRowProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const description = isDescriptionInInput ? undefined : getLocalizedText(translate, field.descriptionKey, field.description);

    // Some inputs, such as CountryPicker, do not pass the FullStory class on, so the whole row is masked
    return (
        <View
            style={isMenuRow ? [styles.mhn5, styles.pv1] : styles.pv2}
            fsClass={CONST.FULLSTORY.CLASS.MASK}
        >
            {!!labelAbove && !shouldHideLabel && (
                <Text
                    style={[labelAbove === 'prompt' ? styles.mt3 : [styles.textStrong, styles.mb3], isMenuRow && styles.ph5]}
                    role={labelAbove === 'heading' ? CONST.ROLE.HEADING : undefined}
                    aria-level={labelAbove === 'heading' ? 3 : undefined}
                >
                    {getInputLabel(field, translate)}
                </Text>
            )}
            {!!description && <Text style={[styles.textSupporting, styles.mb3, isMenuRow && styles.ph5]}>{description}</Text>}
            {children}
        </View>
    );
}

export default FieldRow;
