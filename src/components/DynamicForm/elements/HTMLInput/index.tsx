import React from 'react';

import type HTMLInputProps from './types';

import HTMLDateInput from './inputs/HTMLDateInput';
import HTMLRadioInput from './inputs/HTMLRadioInput';
import HTMLSelectInput from './inputs/HTMLSelectInput';
import HTMLTextInput from './inputs/HTMLTextInput';

/** A field in Wise's format, drawn by the plain input its `type` names */
function HTMLInput(props: HTMLInputProps) {
    switch (props.element.type) {
        case 'text':
            return <HTMLTextInput {...props} />;
        case 'select':
            return <HTMLSelectInput {...props} />;
        case 'radio':
            return <HTMLRadioInput {...props} />;
        case 'date':
            return <HTMLDateInput {...props} />;
        default:
            return null;
    }
}

export default HTMLInput;
