import InputWrapper from '@components/Form/InputWrapper';
import TextInput from '@components/TextInput';

import type {TextFieldConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';

import CONST from '@src/CONST';

import React from 'react';

type TextFieldProps = {
    field: TextFieldConfig;
};

function TextField({field}: TextFieldProps) {
    return (
        <InputWrapper
            InputComponent={TextInput}
            inputID={field.id}
            label={field.label}
            aria-label={field.label}
            role={CONST.ROLE.PRESENTATION}
            defaultValue={field.defaultValue}
            inputMode={field.inputMode}
            maxLength={field.maxLength}
            placeholder={field.placeholder}
            hint={field.hint}
            shouldUseDefaultValue={field.isLocked}
            disabled={field.isLocked}
            sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.EDIT_INPUT}
        />
    );
}

export default TextField;
