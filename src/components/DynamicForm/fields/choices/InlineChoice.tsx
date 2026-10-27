import InlineSelectionListAdapter from '@components/DynamicForm/adapters/InlineSelectionListAdapter';
import FieldRow from '@components/DynamicForm/fields/FieldRow';
import type {DynamicFieldInputProps} from '@components/DynamicForm/fields/types';
import InputWrapper from '@components/Form/InputWrapper';
import type {Choice} from '@components/RadioButtons';

import type {DynamicFormField} from '@src/types/onyx';

import React from 'react';

type InlineChoiceProps = {
    field: DynamicFormField;
    shouldHideLabel: boolean;
    /** Names the search input */
    label: string;
    choices: Choice[];
    inputProps: DynamicFieldInputProps<string | string[]>;
    canSelectMultiple: boolean;
    isSearchable: boolean;
};

/** A lone choice field is the page itself: its options are listed inline under its question, which a page without its own title shows as its title instead */
function InlineChoice({field, shouldHideLabel, label, choices, inputProps, canSelectMultiple, isSearchable}: InlineChoiceProps) {
    return (
        <FieldRow
            field={field}
            shouldHideLabel={shouldHideLabel}
            isMenuRow
            labelAbove="heading"
        >
            <InputWrapper
                InputComponent={InlineSelectionListAdapter}
                {...inputProps}
                items={choices}
                isSearchable={isSearchable}
                searchInputLabel={label}
                valueType={canSelectMultiple ? 'stringList' : 'string'}
                canSelectMultiple={canSelectMultiple}
            />
        </FieldRow>
    );
}

export default InlineChoice;
