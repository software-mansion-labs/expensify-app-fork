import getRefreshHandlers from '@components/DynamicForm/content/elements/shared/getRefreshHandlers';

import CONST from '@src/CONST';

import React from 'react';

import type {HTMLInputProps, HTMLInputWrapperProps} from './types';

import HTMLDateInput from './inputs/HTMLDateInput';
import HTMLRadioInput from './inputs/HTMLRadioInput';
import HTMLSelectInput from './inputs/HTMLSelectInput';
import HTMLTextInput from './inputs/HTMLTextInput';

/** A field in Wise's format, drawn by the plain input its `type` names. Each one behaves exactly as Wise describes it, refreshing the requirements as its only side effect. */
function HTMLInput({element, values, onRefreshRequirements}: HTMLInputProps) {
    const inputProps: HTMLInputWrapperProps = {
        inputID: element.key,
        shouldSaveDraft: true,
        forwardedFSClass: CONST.FULLSTORY.CLASS.MASK,
        ...getRefreshHandlers({inputID: element.key, shouldRefresh: !!element.refreshRequirementsOnChange, isTyped: element.type === 'text', values, onRefreshRequirements}),
    };

    switch (element.type) {
        case 'text':
            return (
                <HTMLTextInput
                    element={element}
                    inputProps={inputProps}
                />
            );
        case 'select':
            return (
                <HTMLSelectInput
                    element={element}
                    inputProps={inputProps}
                />
            );
        case 'radio':
            return (
                <HTMLRadioInput
                    element={element}
                    inputProps={inputProps}
                />
            );
        case 'date':
            return (
                <HTMLDateInput
                    element={element}
                    inputProps={inputProps}
                />
            );
        default: {
            const exhaustiveCheck: never = element.type;
            return exhaustiveCheck;
        }
    }
}

export default HTMLInput;
