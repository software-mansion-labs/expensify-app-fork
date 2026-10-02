import {useNumericInputActions} from '@components/NumericInput/context';
import type {NumericInputContainerProps} from '@components/NumericInput/types';

import useIsInLandscapeMode from '@hooks/useIsInLandscapeMode';
import useThemeStyles from '@hooks/useThemeStyles';

import isHTMLElement from '@libs/isHTMLElement';

import type {MouseEvent} from 'react';

import React, {useId} from 'react';
import {View} from 'react-native';

/**
 * Renders the centered, full-size amount layout used by the legacy number form.
 * Clicking its empty web area keeps the numeric input focused instead of letting the browser blur it.
 */
function NumericInputContainer({action, children, error, style, testID}: NumericInputContainerProps) {
    const styles = useThemeStyles();
    const isInLandscapeMode = useIsInLandscapeMode();
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

    const containerStyle = isInLandscapeMode ? [styles.justifyContentCenter, styles.alignItemsCenter, style] : [styles.flex1, styles.justifyContentCenter, styles.alignItemsCenter, style];

    const innerViewStyle = isInLandscapeMode
        ? [styles.w100, styles.alignItemsCenter, styles.justifyContentCenter]
        : [styles.flex1, styles.w100, styles.alignItemsCenter, styles.justifyContentCenter];

    return (
        <View style={containerStyle}>
            <View
                id={isInLandscapeMode ? undefined : numberViewId}
                onMouseDown={handleMouseDown}
                style={innerViewStyle}
                testID={testID}
            >
                <View style={[styles.flexRow, !isInLandscapeMode && styles.moneyRequestAmountContainer, styles.alignItemsCenter, styles.justifyContentCenter]}>{children}</View>
                {action}
                {error}
            </View>
        </View>
    );
}

export default NumericInputContainer;
