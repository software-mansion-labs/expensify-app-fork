import {useNumericInputActions} from '@components/NumericInput/context';
import useRefocusOnEmptyAreaPress from '@components/NumericInput/hooks/useRefocusOnEmptyAreaPress';
import NumericError from '@components/NumericInput/primitives/NumericError';
import type {NumericInputResponsiveLayoutProps} from '@components/NumericInput/types';
import ScrollView from '@components/ScrollView';

import useIsInLandscapeMode from '@hooks/useIsInLandscapeMode';
import useThemeStyles from '@hooks/useThemeStyles';

import {canUseTouchScreen as canUseTouchScreenUtil} from '@libs/DeviceCapabilities';

import type {MouseEvent} from 'react';

import React from 'react';
import {View} from 'react-native';

import NumericInputActions from './NumericInputActions';
import NumericInputContainer from './NumericInputContainer';
import NumericInputFooter from './NumericInputFooter';

const canUseTouchScreen = canUseTouchScreenUtil();

/**
 * Responsive layout of a full-screen numeric form, and the only owner of its device policy: the touch capability,
 * the orientation, where the amount, the error, the actions, the pad and the footer sit, scrolling, and refocusing
 * the input after a press on an empty area. The slots take an element or `null` and are placed as received,
 * except that the pad and the flip button are left out on devices without a touch screen.
 * In portrait everything stacks in one scroll view; in landscape the amount and its actions sit in the left column
 * and the pad in the right one.
 */
function NumericInputResponsiveLayout({
    children,
    currencyButton,
    flipButton,
    pad,
    footer,
    amountTestID,
    style,
    scrollViewStyle,
    footerStyle,
    testID,
    disableScrollView = false,
    shouldRefocusOnScrollViewClick = false,
}: NumericInputResponsiveLayoutProps) {
    const styles = useThemeStyles();
    const isInLandscapeMode = useIsInLandscapeMode();
    const {clearSelection, focusInput} = useNumericInputActions();
    const {id: padColumnId, onMouseDown: handlePadColumnMouseDown} = useRefocusOnEmptyAreaPress();

    const padNode = canUseTouchScreen ? pad : null;
    const flipButtonNode = canUseTouchScreen ? flipButton : null;
    const isPadShown = !!padNode;

    // The web content container of a scroll view is not the view that receives the handler, so any press on it refocuses.
    const handleScrollViewMouseDown = (event: MouseEvent<Element>) => {
        event.preventDefault();
        clearSelection();
        focusInput();
    };

    // Without a touch screen there is no actions row, so the currency button sits under the amount instead.
    const actionsNode =
        canUseTouchScreen && (!!currencyButton || !!flipButtonNode) ? (
            <NumericInputActions>
                {currencyButton}
                {flipButtonNode}
            </NumericInputActions>
        ) : null;

    const amountNode = (
        <NumericInputContainer
            isInLandscapeMode={isInLandscapeMode}
            testID={amountTestID}
            action={canUseTouchScreen ? null : currencyButton}
            // In portrait the error floats over the bottom of the amount area, so it never moves the amount or the pad
            error={isInLandscapeMode ? null : <NumericError style={[styles.pAbsolute, styles.b0, isPadShown ? styles.mb5 : styles.mb3, styles.ph5, styles.w100]} />}
        >
            {children}
        </NumericInputContainer>
    );

    if (isInLandscapeMode) {
        const landscapeContent = (
            <>
                <View style={[styles.justifyContentCenter, styles.alignItemsCenter, styles.numberWithSymbolFormInputContainerLandscape]}>
                    {amountNode}
                    {actionsNode}
                    <NumericError style={[styles.ph5, styles.w100]} />
                </View>
                {isPadShown && (
                    <View
                        id={padColumnId}
                        onMouseDown={handlePadColumnMouseDown}
                        style={[styles.flex1, styles.justifyContentCenter]}
                    >
                        {padNode}
                    </View>
                )}
            </>
        );

        return (
            <>
                {disableScrollView ? (
                    <View
                        testID={testID}
                        style={[styles.flex1, styles.ph5, styles.flexRow, style]}
                    >
                        {landscapeContent}
                    </View>
                ) : (
                    <ScrollView
                        testID={testID}
                        contentContainerStyle={[styles.flexGrow1, styles.flexRow]}
                        style={[styles.flex1, styles.ph5, shouldRefocusOnScrollViewClick && styles.cursorAuto, style]}
                        onMouseDown={shouldRefocusOnScrollViewClick ? handleScrollViewMouseDown : undefined}
                    >
                        {landscapeContent}
                    </ScrollView>
                )}
                {!!footer && <NumericInputFooter style={footerStyle}>{footer}</NumericInputFooter>}
            </>
        );
    }

    const portraitContent = (
        <>
            {amountNode}
            {actionsNode}
            {(isPadShown || !!footer) && (
                // The pad keeps a fixed gap below the amount and its actions, so the centered amount does not move between screens
                <NumericInputFooter style={[isPadShown && styles.mt2, footerStyle]}>
                    {padNode}
                    {footer}
                </NumericInputFooter>
            )}
        </>
    );

    if (disableScrollView) {
        return (
            <View
                testID={testID}
                style={[styles.flex1, style]}
            >
                {portraitContent}
            </View>
        );
    }

    return (
        <ScrollView
            testID={testID}
            contentContainerStyle={[styles.flexGrow1, scrollViewStyle]}
            style={[styles.flex1, shouldRefocusOnScrollViewClick && styles.cursorAuto, style]}
            onMouseDown={shouldRefocusOnScrollViewClick ? handleScrollViewMouseDown : undefined}
        >
            {portraitContent}
        </ScrollView>
    );
}

export default NumericInputResponsiveLayout;
