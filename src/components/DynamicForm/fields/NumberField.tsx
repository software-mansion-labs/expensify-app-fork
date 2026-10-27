import CONST from '@src/CONST';

import React from 'react';

import type {DynamicFieldProps} from './types';

import TextInputField from './TextInputField';

function NumberField({field, inputProps}: DynamicFieldProps<'number'>) {
    return (
        <TextInputField
            field={field}
            inputProps={inputProps}
            inputMode={CONST.INPUT_MODE.NUMERIC}
        />
    );
}

export default NumberField;
