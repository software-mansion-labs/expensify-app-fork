import {useDynamicFieldContext} from '@components/DynamicForm/fields/DynamicFieldContext';
import FieldRow from '@components/DynamicForm/fields/FieldRow';
import type {DynamicFieldProps} from '@components/DynamicForm/fields/types';
import {getFieldChoices} from '@components/DynamicForm/utils/getFieldOptions';
import {getInputLabel} from '@components/DynamicForm/utils/getLocalizedText';
import InputWrapper from '@components/Form/InputWrapper';
import RadioButtons from '@components/RadioButtons';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import React from 'react';

import ChoiceTabs from './ChoiceTabs';

function RadioField({field, inputProps}: DynamicFieldProps<'radio'>) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {values, isLoneField} = useDynamicFieldContext();
    const label = getInputLabel(field, translate);
    const choices = getFieldChoices(field, values, translate);

    if (field.presentation === 'tabs') {
        return (
            <ChoiceTabs
                label={label}
                choices={choices}
                inputProps={inputProps}
            />
        );
    }

    return (
        <FieldRow
            isMenuRow
            labelAbove={isLoneField ? 'heading' : 'prompt'}
        >
            <InputWrapper
                InputComponent={RadioButtons}
                {...inputProps}
                items={choices}
                accessibilityLabel={label}
                containerStyle={styles.mt0}
            />
        </FieldRow>
    );
}

export default RadioField;
