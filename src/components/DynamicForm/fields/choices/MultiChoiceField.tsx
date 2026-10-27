import {useDynamicFieldContext} from '@components/DynamicForm/fields/DynamicFieldContext';
import FieldRow from '@components/DynamicForm/fields/FieldRow';
import type {DynamicFieldProps} from '@components/DynamicForm/fields/types';
import {getFieldChoices} from '@components/DynamicForm/utils/getFieldOptions';
import {getFieldLabel, getInputLabel} from '@components/DynamicForm/utils/getLocalizedText';
import InputWrapper from '@components/Form/InputWrapper';
import PushRowWithModal from '@components/PushRowWithModal';

import useLocalize from '@hooks/useLocalize';

import CONST from '@src/CONST';

import React from 'react';

import getChoiceOptionsList from './getChoiceOptionsList';
import InlineChoice from './InlineChoice';

/** Any number of options, or of countries, picked in place on a page of their own, or in a modal otherwise */
function MultiChoiceField({field, inputProps}: DynamicFieldProps<'multiselect' | 'countryMultiselect'>) {
    const {translate} = useLocalize();
    const {values, isLoneField} = useDynamicFieldContext();
    const title = getFieldLabel(field, translate);
    const choices = getFieldChoices(field, values, translate);

    if (isLoneField) {
        return (
            <InlineChoice
                label={title}
                choices={choices}
                inputProps={inputProps}
                canSelectMultiple
                isSearchable={choices.length > CONST.DYNAMIC_FORM.LARGE_SELECT_MIN_OPTIONS}
            />
        );
    }

    return (
        <FieldRow isMenuRow>
            <InputWrapper
                InputComponent={PushRowWithModal}
                {...inputProps}
                valueType="stringList"
                canSelectMultiple
                optionsList={getChoiceOptionsList(choices)}
                description={getInputLabel(field, translate)}
                modalHeaderTitle={title}
                searchInputTitle={title}
            />
        </FieldRow>
    );
}

export default MultiChoiceField;
