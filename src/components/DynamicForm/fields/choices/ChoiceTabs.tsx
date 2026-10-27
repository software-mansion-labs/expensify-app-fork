import TabsAdapter from '@components/DynamicForm/adapters/TabsAdapter';
import FieldRow from '@components/DynamicForm/fields/FieldRow';
import type {DynamicFieldInputProps} from '@components/DynamicForm/fields/types';
import InputWrapper from '@components/Form/InputWrapper';
import type {Choice} from '@components/RadioButtons';

import type {DynamicFormField} from '@src/types/onyx';

import React from 'react';

type ChoiceTabsProps = {
    field: DynamicFormField;
    shouldHideLabel: boolean;
    isLoneField: boolean;
    label: string;
    choices: Choice[];
    inputProps: DynamicFieldInputProps<string>;
};

/** The options as a segmented tab row, for the few-option switch that decides which fields follow */
function ChoiceTabs({field, shouldHideLabel, isLoneField, label, choices, inputProps}: ChoiceTabsProps) {
    return (
        <FieldRow
            field={field}
            shouldHideLabel={shouldHideLabel}
            labelAbove={isLoneField ? 'heading' : 'prompt'}
        >
            <InputWrapper
                InputComponent={TabsAdapter}
                {...inputProps}
                items={choices}
                accessibilityLabel={label}
            />
        </FieldRow>
    );
}

export default ChoiceTabs;
