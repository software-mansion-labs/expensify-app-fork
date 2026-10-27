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

function RadioField({field, shouldHideLabel, values, isLoneField, inputProps}: DynamicFieldProps<'radio'>) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const label = getInputLabel(field, translate);
    const choices = getFieldChoices(field, values, translate);

    if (field.presentation === 'tabs') {
        return (
            <ChoiceTabs
                field={field}
                shouldHideLabel={shouldHideLabel}
                isLoneField={isLoneField}
                label={label}
                choices={choices}
                inputProps={inputProps}
            />
        );
    }

    return (
        <FieldRow
            field={field}
            shouldHideLabel={shouldHideLabel}
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
