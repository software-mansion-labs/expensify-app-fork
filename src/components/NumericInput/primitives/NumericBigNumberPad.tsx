import BigNumberPad from '@components/BigNumberPad';
import {useNumericInputActions, useNumericInputState} from '@components/NumericInput/context';
import type {NumericBigNumberPadProps} from '@components/NumericInput/types';

import useThemeStyles from '@hooks/useThemeStyles';

import {canUseTouchScreen as canUseTouchScreenUtil} from '@libs/DeviceCapabilities';
import isHTMLElement from '@libs/isHTMLElement';

import type {MouseEvent} from 'react';

import {View} from 'react-native';

const canUseTouchScreen = canUseTouchScreenUtil();

/**
 * Renders the touch number pad wired to NumericInput actions, state, and selection.
 * It carries no page spacing or container id: `NumericInput.ResponsiveLayout` (or the screen composing it) owns both.
 * It always fills the width of its container, because the layout's `pageWrapper` centers its children and would otherwise
 * shrink the pad to its content, collapsing the three key columns onto each other.
 */
function NumericBigNumberPad({longPressHandlerStateChanged, numberPressed, style, testID}: NumericBigNumberPadProps) {
    const styles = useThemeStyles();
    const {formattedNumber, isNegative, selection} = useNumericInputState();
    const {clearSelection, clearSign, focusInput, setNumber, setShouldUpdateSelection} = useNumericInputActions();
    const numPadViewId = 'numPadView';

    if (!canUseTouchScreen) {
        return null;
    }

    const handleNumberPressed = (key: string) => {
        focusInput();
        numberPressed?.(key);

        const isCollapsed = selection.start === selection.end;

        if (key === '<') {
            if (isCollapsed && selection.start === 0) {
                if (isNegative) {
                    clearSign();
                }
                return;
            }

            const deleteStart = isCollapsed ? selection.start - 1 : selection.start;
            const newMagnitude = `${formattedNumber.slice(0, deleteStart)}${formattedNumber.slice(selection.end)}`;
            setNumber(newMagnitude);
            return;
        }

        const newMagnitude = `${formattedNumber.slice(0, selection.start)}${key}${formattedNumber.slice(selection.end)}`;
        setNumber(newMagnitude);
    };

    const handleLongPressHandlerStateChanged = (isUserLongPressingBackspace: boolean) => {
        setShouldUpdateSelection?.(!isUserLongPressingBackspace);
        if (!isUserLongPressingBackspace) {
            focusInput();
        }
        longPressHandlerStateChanged?.(isUserLongPressingBackspace);
    };

    const handleMouseDown = (event: MouseEvent<Element>) => {
        // Only the keypad's own gap area refocuses the input. Presses bubbling up from its buttons keep their selection.
        const targetId = isHTMLElement(event.nativeEvent?.target) ? event.nativeEvent.target.id : undefined;
        if (targetId !== numPadViewId) {
            return;
        }

        event.preventDefault();
        clearSelection();
        focusInput();
    };

    return (
        <View
            onMouseDown={handleMouseDown}
            style={[styles.w100, style]}
            testID={testID}
        >
            <BigNumberPad
                id={numPadViewId}
                numberPressed={handleNumberPressed}
                longPressHandlerStateChanged={handleLongPressHandlerStateChanged}
            />
        </View>
    );
}

export default NumericBigNumberPad;
