import FieldRow from '@components/DynamicForm/fields/FieldRow';
import type {DynamicFieldProps} from '@components/DynamicForm/fields/types';
import {getFieldChoices} from '@components/DynamicForm/utils/getFieldOptions';
import {getFieldLabel, getInputLabel} from '@components/DynamicForm/utils/getLocalizedText';
import InputWrapper from '@components/Form/InputWrapper';
import PushRowWithModal from '@components/PushRowWithModal';
import ValuePicker from '@components/ValuePicker';

import useLocalize from '@hooks/useLocalize';

import CONST from '@src/CONST';

import React from 'react';

import ChoiceTabs from './ChoiceTabs';
import getChoiceOptionsList from './getChoiceOptionsList';
import InlineChoice from './InlineChoice';

function SelectField({field, shouldHideLabel, values, isLoneField, inputProps}: DynamicFieldProps<'select'>) {
    const {translate} = useLocalize();
    const title = getFieldLabel(field, translate);
    const label = getInputLabel(field, translate);
    const choices = getFieldChoices(field, values, translate);
    const isLong = choices.length > CONST.DYNAMIC_FORM.LARGE_SELECT_MIN_OPTIONS;

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

    if (isLoneField) {
        return (
            <InlineChoice
                field={field}
                shouldHideLabel={shouldHideLabel}
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
            <FieldRow
                field={field}
                isMenuRow
            >
                <InputWrapper
                    InputComponent={PushRowWithModal}
                    {...inputProps}
                    optionsList={getChoiceOptionsList(choices)}
                    description={label}
                    modalHeaderTitle={title}
                    searchInputTitle={title}
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
