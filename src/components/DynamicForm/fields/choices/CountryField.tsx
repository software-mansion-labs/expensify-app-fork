import CountryPicker from '@components/CountryPicker';
import {useDynamicFieldContext} from '@components/DynamicForm/fields/DynamicFieldContext';
import FieldRow from '@components/DynamicForm/fields/FieldRow';
import type {DynamicFieldProps} from '@components/DynamicForm/fields/types';
import {getFieldChoices} from '@components/DynamicForm/utils/getFieldOptions';
import {getInputLabel} from '@components/DynamicForm/utils/getLocalizedText';
import InputWrapper from '@components/Form/InputWrapper';

import useLocalize from '@hooks/useLocalize';

import React from 'react';

import InlineChoice from './InlineChoice';

function CountryField({field, inputProps}: DynamicFieldProps<'country'>) {
    const {translate} = useLocalize();
    const {values, isLoneField} = useDynamicFieldContext();

    if (isLoneField) {
        return (
            <InlineChoice
                label={translate('common.country')}
                choices={getFieldChoices(field, values, translate)}
                inputProps={inputProps}
                canSelectMultiple={false}
                isSearchable
            />
        );
    }

    return (
        <FieldRow isMenuRow>
            <InputWrapper
                InputComponent={CountryPicker}
                {...inputProps}
                label={getInputLabel(field, translate)}
            />
        </FieldRow>
    );
}

export default CountryField;
