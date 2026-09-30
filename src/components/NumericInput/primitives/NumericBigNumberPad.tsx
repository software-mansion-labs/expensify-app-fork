import BigNumberPad from '@components/BigNumberPad';
import {useNumericInputActions} from '@components/NumericInput/context';
import useRefocusOnEmptyAreaPress from '@components/NumericInput/hooks/useRefocusOnEmptyAreaPress';
import type {NumericBigNumberPadProps} from '@components/NumericInput/types';

import useThemeStyles from '@hooks/useThemeStyles';

import {View} from 'react-native';

/**
 * Renders the number pad, translating its key presses into NumericInput edits.
 * It carries no page spacing and never checks the device: `NumericInput.ResponsiveLayout` decides where, and whether, it renders.
 * It always fills the width of its container, because the layout's `pageWrapper` centers its children and would otherwise
 * shrink the pad to its content, collapsing the three key columns onto each other.
 */
function NumericBigNumberPad({style, testID}: NumericBigNumberPadProps) {
    const styles = useThemeStyles();
    const {beginRepeatedDelete, deleteBackward, endRepeatedDelete, focusInput, insertAtCaret} = useNumericInputActions();
    const {id: padViewId, onMouseDown} = useRefocusOnEmptyAreaPress();

    const handleNumberPressed = (key: string) => {
        focusInput();

        if (key === '<') {
            deleteBackward();
            return;
        }

        insertAtCaret(key);
    };

    const handleLongPressHandlerStateChanged = (isUserLongPressingBackspace: boolean) => {
        if (isUserLongPressingBackspace) {
            beginRepeatedDelete();
            return;
        }

        endRepeatedDelete();
        focusInput();
    };

    return (
        <View
            onMouseDown={onMouseDown}
            style={[styles.w100, style]}
            testID={testID}
        >
            <BigNumberPad
                id={padViewId}
                numberPressed={handleNumberPressed}
                longPressHandlerStateChanged={handleLongPressHandlerStateChanged}
            />
        </View>
    );
}

export default NumericBigNumberPad;
