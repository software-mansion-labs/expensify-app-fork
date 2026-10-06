import {useNumericInputActions} from '@components/NumericInput/context';
import type {NumericInputContainerProps} from '@components/NumericInput/types';

import useThemeStyles from '@hooks/useThemeStyles';

import isHTMLElement from '@libs/isHTMLElement';

import type {MouseEvent} from 'react';

import {useId} from 'react';
import {View} from 'react-native';

/**
 * Renders the centered amount area. It grows into the space its parent gives it but keeps its content height as the basis
 * (`flexGrow1`, not `flex1`), so on a short screen the parent can scroll instead of squeezing the amount to zero height.
 * The surrounding layout decides how much space that is (and any height reserved for a floating error, through `style`),
 * so the container itself is the same in every orientation.
 * Clicking its empty web area keeps the numeric input focused instead of letting the browser blur it.
 */
function NumericInputContainer({action, children, error, style, testID}: NumericInputContainerProps) {
    const styles = useThemeStyles();
    const {clearSelection, focusInput} = useNumericInputActions();
    const numberViewId = useId();

    const handleMouseDown = (event: MouseEvent<Element>) => {
        // Only the container's own empty area refocuses the input. Presses bubbling up from children keep their caret.
        const targetId = isHTMLElement(event.nativeEvent?.target) ? event.nativeEvent.target.id : undefined;
        if (targetId !== numberViewId) {
            return;
        }

        event.preventDefault();
        clearSelection();
        focusInput();
    };

    return (
        <View style={[styles.flexGrow1, styles.justifyContentCenter, styles.alignItemsCenter, style]}>
            <View
                id={numberViewId}
                onMouseDown={handleMouseDown}
                style={[styles.flexGrow1, styles.w100, styles.alignItemsCenter, styles.justifyContentCenter]}
                testID={testID}
            >
                <View style={[styles.flexRow, styles.alignItemsCenter, styles.justifyContentCenter]}>{children}</View>
                {action}
                {error}
            </View>
        </View>
    );
}

export default NumericInputContainer;
