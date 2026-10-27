import TabsAdapter from '@components/DynamicForm/adapters/TabsAdapter';
import {useDynamicFieldContext} from '@components/DynamicForm/fields/DynamicFieldContext';
import FieldRow from '@components/DynamicForm/fields/FieldRow';
import type {DynamicFieldInputProps} from '@components/DynamicForm/fields/types';
import InputWrapper from '@components/Form/InputWrapper';
import type {Choice} from '@components/RadioButtons';

import React from 'react';

type ChoiceTabsProps = {
    label: string;
    choices: Choice[];
    inputProps: DynamicFieldInputProps<string>;
};

/** The options as a segmented tab row, for the few-option switch that decides which fields follow */
function ChoiceTabs({label, choices, inputProps}: ChoiceTabsProps) {
    const {isLoneField} = useDynamicFieldContext();

    return (
        <FieldRow labelAbove={isLoneField ? 'heading' : 'prompt'}>
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
