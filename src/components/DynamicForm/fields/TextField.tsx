import CONST from '@src/CONST';
import type {DynamicFormTextField} from '@src/types/onyx';

import type {InputModeOptions} from 'react-native';

import React from 'react';

import type {DynamicFieldProps} from './types';

import TextInputField from './TextInputField';

/** A regex of digits only, such as `^\d{6}$`, asks for a number, so it gets the numeric keyboard */
const DIGITS_ONLY_REGEX = /^\^?(?:\\d|\[0-9\])(?:\{\d+(?:,\d*)?\}|[+*])?\$?$/;

function getTextInputMode(field: DynamicFormTextField): InputModeOptions | undefined {
    if (field.keyboard) {
        return field.keyboard;
    }
    if (field.rule === 'phone') {
        return CONST.INPUT_MODE.TEL;
    }
    return field.regex && DIGITS_ONLY_REGEX.test(field.regex) ? CONST.INPUT_MODE.NUMERIC : undefined;
}

function TextField({field, inputProps}: DynamicFieldProps<'text'>) {
    return (
        <TextInputField
            field={field}
            inputProps={inputProps}
            inputMode={getTextInputMode(field)}
            isMultiline={field.multiline}
        />
    );
}

export default TextField;
