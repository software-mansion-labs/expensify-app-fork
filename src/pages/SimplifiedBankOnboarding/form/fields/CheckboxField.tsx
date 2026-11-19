import CheckboxWithLabel from '@components/CheckboxWithLabel';
import InputWrapper from '@components/Form/InputWrapper';

import type {CheckboxFieldConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';

import React from 'react';

type CheckboxFieldProps = {
    field: CheckboxFieldConfig;
    shouldSaveDraft: boolean;
};

function CheckboxField({field, shouldSaveDraft}: CheckboxFieldProps) {
    return (
        <InputWrapper
            InputComponent={CheckboxWithLabel}
            inputID={field.id}
            label={field.label}
            accessibilityLabel={field.label}
            defaultValue={field.defaultValue}
            shouldSaveDraft={shouldSaveDraft}
        />
    );
}

export default CheckboxField;
