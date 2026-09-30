import {useNumericEditingController} from '@components/NumericEditingController';
import type {NumericEditingSelection} from '@components/NumericEditingController';
import isTextInputFocused from '@components/TextInput/BaseTextInput/isTextInputFocused';
import type {BaseTextInputRef} from '@components/TextInput/BaseTextInput/types';

import React, {useImperativeHandle, useRef} from 'react';

import type {NumericInputActionsContextValue, NumericInputStateContextValue} from './context/types';
import type {NumericInputProps} from './types';

import {NumericInputActionsContext, NumericInputStateContext} from './context';
import useCallerSignChangeEffect from './hooks/useCallerSignChangeEffect';

const stripSign = (value: string) => (value.startsWith('-') ? value.slice(1) : value);

/** The composed input displays the magnitude because the sign is rendered separately. */
const getMagnitude = (canonicalValue: string, allowNegative: boolean) => (allowNegative && canonicalValue.startsWith('-') ? canonicalValue.slice(1) : canonicalValue);

/**
 * Because the sign is rendered outside the input, this function restores it in the canonical value. Typing a minus
 * toggles the current sign, while a pasted minus sets it. A minus typed inside the magnitude is rejected as an invalid
 * edit. Replacing the whole number with a positive or empty value clears the sign.
 */
const getSignedValue = (displayText: string, wasNegative: boolean, wasSignTyped: boolean, wasNumberReplaced: boolean) => {
    if (displayText.startsWith('-')) {
        const magnitude = displayText.slice(1);
        return wasSignTyped && wasNegative && !wasNumberReplaced ? magnitude : `-${magnitude}`;
    }

    return wasNegative && !wasNumberReplaced ? `-${displayText}` : displayText;
};

/** An edit that replaced a selection spanning the whole magnitude replaced the number rather than amending it. */
const getWasNumberReplaced = (previousDisplayText: string, previousSelection: NumericEditingSelection) =>
    !!previousDisplayText && previousSelection.start === 0 && previousSelection.end === previousDisplayText.length;

const getWasSignTyped = (displayText: string, previousDisplayText: string, previousSelection: NumericEditingSelection) =>
    displayText === `${previousDisplayText.slice(0, previousSelection.start)}-${previousDisplayText.slice(previousSelection.end)}`;

function NumericInput({value = '', onInputChange, allowNegative = false, decimals = 0, maxLength, errorText, isNegative, onSignChange, ref, children}: NumericInputProps) {
    const inputRef = useRef<BaseTextInputRef | null>(null);

    // A caller that owns the sign exchanges magnitudes with the root, which joins them with the sign it is given
    const isSignControlled = onSignChange !== undefined;
    const isCallerNegative = allowNegative && !!isNegative;
    const joinCallerSign = (magnitude: string) => (isCallerNegative && !magnitude.startsWith('-') ? `-${magnitude}` : magnitude);

    const toDisplayText = (canonicalValue: string) => getMagnitude(canonicalValue, allowNegative);

    const toCanonicalValue = (displayText: string, previousCanonicalValue: string, previousSelection: NumericEditingSelection) => {
        if (!allowNegative) {
            return displayText;
        }

        const previousDisplayText = toDisplayText(previousCanonicalValue);

        return getSignedValue(
            displayText,
            previousCanonicalValue.startsWith('-'),
            getWasSignTyped(displayText, previousDisplayText, previousSelection),
            getWasNumberReplaced(previousDisplayText, previousSelection),
        );
    };

    // The magnitude is reported first, so a caller that reports its signed amount when the sign changes has the final word
    const reportChange = (nextValue: string) => {
        if (!isSignControlled) {
            onInputChange?.(nextValue);
            return;
        }

        onInputChange?.(stripSign(nextValue));

        const isNextNegative = nextValue.startsWith('-');
        if (isNextNegative !== isCallerNegative) {
            onSignChange(isNextNegative);
        }
    };

    const controller = useNumericEditingController({
        value: isSignControlled ? joinCallerSign(value) : value,
        onInputChange: reportChange,
        allowNegative,
        decimals,
        maxLength,
        toDisplayText,
        toCanonicalValue,
    });

    // The controller only adopts an external value when it is cleared, so a sign the caller changes on its own is applied here
    useCallerSignChangeEffect(isSignControlled ? isCallerNegative : undefined, (nextIsNegative) => {
        const currentValue = controller.getNumber();
        if (currentValue.startsWith('-') === nextIsNegative) {
            return;
        }

        const magnitude = stripSign(currentValue);
        controller.setCanonicalValue(nextIsNegative ? `-${magnitude}` : magnitude, {notify: false});
    });

    const updateNumber = (newNumber: string) => {
        if (!isSignControlled || !allowNegative) {
            controller.updateNumber(newNumber);
            return;
        }

        // A signed number makes the value negative, while a magnitude keeps the sign the caller holds
        if (!newNumber.startsWith('-')) {
            controller.updateNumber(joinCallerSign(newNumber));
            return;
        }

        const wasNegative = controller.getNumber().startsWith('-');
        controller.updateNumber(newNumber);
        if (!wasNegative) {
            onSignChange(true);
        }
    };

    useImperativeHandle(ref, () => ({
        clearSelection: controller.clearSelection,
        getNumber: () => (isSignControlled && allowNegative ? stripSign(controller.getNumber()) : controller.getNumber()),
        updateNumber,
    }));

    const toggleSign = () => {
        if (!allowNegative) {
            return;
        }

        const currentValue = controller.getNumber();
        const flippedValue = currentValue.startsWith('-') ? currentValue.slice(1) : `-${currentValue}`;
        if (!isSignControlled) {
            controller.setCanonicalValue(flippedValue);
            return;
        }

        // A flip keeps the magnitude the caller holds, so only the sign is reported
        controller.setCanonicalValue(flippedValue, {notify: false});
        onSignChange(!currentValue.startsWith('-'));
    };

    const focusInput = () => {
        if (isTextInputFocused(inputRef)) {
            return;
        }

        inputRef.current?.focus();
    };

    const stateContextValue: NumericInputStateContextValue = {
        value: controller.value,
        formattedNumber: controller.formattedNumber,
        isNegative: allowNegative && controller.value.startsWith('-'),
        selection: controller.selection,
        allowNegative,
        errorText,
        inputRef,
    };

    const actionsContextValue: NumericInputActionsContextValue = {
        setNumber: controller.setNumber,
        insertAtCaret: controller.insertAtCaret,
        deleteBackward: controller.deleteBackward,
        setDeleteBackwardHeld: controller.setDeleteBackwardHeld,
        clearSelection: controller.clearSelection,
        toggleSign,
        handleSelectionChange: controller.handleSelectionChange,
        handleKeyPress: controller.handleKeyPress,
        focusInput,
    };

    return (
        <NumericInputStateContext.Provider value={stateContextValue}>
            <NumericInputActionsContext.Provider value={actionsContextValue}>{children}</NumericInputActionsContext.Provider>
        </NumericInputStateContext.Provider>
    );
}

export default NumericInput;
