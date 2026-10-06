import {useNumericInputActions} from '@components/NumericInput';
import ScrollView from '@components/ScrollView';

import useIsInLandscapeMode from '@hooks/useIsInLandscapeMode';
import useThemeStyles from '@hooks/useThemeStyles';

import {canUseTouchScreen as canUseTouchScreenUtil} from '@libs/DeviceCapabilities';
import isHTMLElement from '@libs/isHTMLElement';

import type {MouseEvent} from 'react';

import React from 'react';
import {View} from 'react-native';

import type {FullScreenAmountLayoutContextValue, FullScreenAmountLayoutProps} from './types';

import {FullScreenAmountLayoutContext} from './context';

const canUseTouchScreen = canUseTouchScreenUtil();

/** Elements that keep their default mouse down behavior, so pressing them never steals or forces the input focus. */
const INTERACTIVE_ELEMENT_SELECTOR = 'input, textarea, button, a, [role="button"], [role="link"], [contenteditable="true"]';

/**
 * Full-screen amount page template. Must be rendered inside a `<NumericInput>` root.
 * Phones in landscape get two columns (amount on the left, number pad on the right) with the footer pinned below them.
 * Everything else (portrait, tablets, desktop) gets a single scrollable column.
 * On web, pressing any non-interactive area keeps the numeric input focused instead of letting the browser blur it.
 */
function FullScreenAmountLayoutRoot({children, style, testID}: FullScreenAmountLayoutProps) {
    const styles = useThemeStyles();
    const isTwoColumn = useIsInLandscapeMode();
    const {clearSelection, focusInput} = useNumericInputActions();

    const handleMouseDown = (event: MouseEvent<Element>) => {
        const target = event.nativeEvent?.target;

        // Primitives that already refocused the input (Container, BigNumberPad) prevented the default themselves
        if (event.isDefaultPrevented() || !isHTMLElement(target) || target.closest(INTERACTIVE_ELEMENT_SELECTOR)) {
            return;
        }

        event.preventDefault();
        clearSelection();
        focusInput();
    };

    // Because of the React Compiler we don't need to memoize it manually
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    const contextValue: FullScreenAmountLayoutContextValue = {isTwoColumn};

    return (
        <FullScreenAmountLayoutContext.Provider value={contextValue}>
            {isTwoColumn ? (
                // The body scrolls on its own, so the footer stays visible below the two columns
                <View
                    testID={testID}
                    onMouseDown={handleMouseDown}
                    style={[styles.flex1, style]}
                >
                    {children}
                </View>
            ) : (
                <ScrollView
                    testID={testID}
                    onMouseDown={handleMouseDown}
                    // On touch screens the pad ends the body, so the bottom spacing belongs to the screen edge rather than to the pad or the
                    // footer, and stays the same whether a footer follows the pad or not. Without a touch screen the footer owns it.
                    contentContainerStyle={[styles.flexGrow1, canUseTouchScreen && styles.pb5]}
                    style={[styles.flex1, styles.cursorAuto, style]}
                    addBottomSafeAreaPadding
                >
                    {children}
                </ScrollView>
            )}
        </FullScreenAmountLayoutContext.Provider>
    );
}

export default FullScreenAmountLayoutRoot;
