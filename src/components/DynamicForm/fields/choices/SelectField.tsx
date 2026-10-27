import {useDynamicFieldContext} from '@components/DynamicForm/fields/DynamicFieldContext';
import FieldRow from '@components/DynamicForm/fields/FieldRow';
import type {DynamicFieldProps} from '@components/DynamicForm/fields/types';
import {getFieldChoices} from '@components/DynamicForm/utils/getFieldOptions';
import {getFieldLabel, getInputLabel} from '@components/DynamicForm/utils/getLocalizedText';
import InputWrapper from '@components/Form/InputWrapper';
import ValuePicker from '@components/ValuePicker';

import useLocalize from '@hooks/useLocalize';

import CONST from '@src/CONST';

import React from 'react';

import ChoiceTabs from './ChoiceTabs';
import InlineChoice from './InlineChoice';
import ModalChoiceRow from './ModalChoiceRow';

function SelectField({field, inputProps}: DynamicFieldProps<'select'>) {
    const {translate} = useLocalize();
    const {values, isLoneField} = useDynamicFieldContext();
    const title = getFieldLabel(field, translate);
    const label = getInputLabel(field, translate);
    const choices = getFieldChoices(field, values, translate);
    const isLong = choices.length > CONST.DYNAMIC_FORM.LARGE_SELECT_MIN_OPTIONS;

    if (field.presentation === 'tabs') {
        return (
            <ChoiceTabs
                label={label}
                choices={choices}
                inputProps={inputProps}
            />
        );
    }

    if (isLoneField) {
        return (
            <InlineChoice
                label={title}
                choices={choices}
                inputProps={inputProps}
                canSelectMultiple={false}
                isSearchable={isLong}
            />
        );
    }

    if (isLong) {
        return (
            <ModalChoiceRow
                title={title}
                label={label}
                choices={choices}
                inputProps={inputProps}
            />
        );
    }

    return (
        <FieldRow isMenuRow>
            <InputWrapper
                InputComponent={ValuePicker}
                {...inputProps}
                label={label}
                modalHeaderTitle={title}
                items={choices}
                shouldReadErrorWithLabel
            />
        </FieldRow>
    );
}

export default SelectField;
