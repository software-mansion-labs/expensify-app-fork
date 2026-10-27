import CheckboxWithLabel from '@components/CheckboxWithLabel';
import YesNoAdapter from '@components/DynamicForm/adapters/YesNoAdapter';
import {useDynamicFieldContext} from '@components/DynamicForm/fields/DynamicFieldContext';
import FieldRow from '@components/DynamicForm/fields/FieldRow';
import type {DynamicFieldProps} from '@components/DynamicForm/fields/types';
import {getFieldLabel, getInputLabel} from '@components/DynamicForm/utils/getLocalizedText';
import InputWrapper from '@components/Form/InputWrapper';

import useLocalize from '@hooks/useLocalize';

import React from 'react';

function BooleanField({field, inputProps}: DynamicFieldProps<'boolean'>) {
    const {translate} = useLocalize();
    const {isLoneField} = useDynamicFieldContext();
    const label = getFieldLabel(field, translate);

    if (field.presentation === 'checkbox') {
        return (
            <FieldRow>
                <InputWrapper
                    InputComponent={CheckboxWithLabel}
                    {...inputProps}
                    valueType="boolean"
                    label={label}
                    accessibilityLabel={label}
                />
            </FieldRow>
        );
    }

    return (
        <FieldRow
            isMenuRow
            labelAbove={isLoneField ? 'heading' : 'prompt'}
        >
            <InputWrapper
                InputComponent={YesNoAdapter}
                {...inputProps}
                accessibilityLabel={getInputLabel(field, translate)}
            />
        </FieldRow>
    );
}

export default BooleanField;
