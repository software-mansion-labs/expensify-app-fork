import CurrencyPicker from '@components/CurrencyPicker';
import CurrencyInlineListAdapter from '@components/DynamicForm/adapters/CurrencyInlineListAdapter';
import FieldRow from '@components/DynamicForm/fields/FieldRow';
import type {DynamicFieldProps} from '@components/DynamicForm/fields/types';
import {getFieldLabel, getInputLabel} from '@components/DynamicForm/utils/getLocalizedText';
import InputWrapper from '@components/Form/InputWrapper';

import useLocalize from '@hooks/useLocalize';

import React from 'react';

function CurrencyField({field, shouldHideLabel, isLoneField, inputProps}: DynamicFieldProps<'currency'>) {
    const {translate} = useLocalize();

    if (isLoneField) {
        return (
            <FieldRow
                field={field}
                shouldHideLabel={shouldHideLabel}
                isMenuRow
                labelAbove="heading"
            >
                <InputWrapper
                    InputComponent={CurrencyInlineListAdapter}
                    {...inputProps}
                />
            </FieldRow>
        );
    }

    return (
        <FieldRow
            field={field}
            isMenuRow
        >
            <InputWrapper
                InputComponent={CurrencyPicker}
                {...inputProps}
                label={getInputLabel(field, translate)}
                modalHeaderTitle={getFieldLabel(field, translate)}
                shouldReadErrorWithLabel
            />
        </FieldRow>
    );
}

export default CurrencyField;
