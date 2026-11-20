import CheckboxWithLabel from '@components/CheckboxWithLabel';
import InputWrapper from '@components/Form/InputWrapper';

import type {CheckboxFieldConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';

import React from 'react';

type CheckboxFieldProps = {
    field: CheckboxFieldConfig;
};

function CheckboxField({field}: CheckboxFieldProps) {
    return (
        <InputWrapper
            InputComponent={CheckboxWithLabel}
            inputID={field.id}
            label={field.label}
            accessibilityLabel={field.label}
            defaultValue={field.defaultValue}
        />
    );
}

export default CheckboxField;
