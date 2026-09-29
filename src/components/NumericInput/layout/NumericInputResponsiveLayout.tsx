import {useNumericInputActions} from '@components/NumericInput/context';
import type {NumericInputResponsiveLayoutProps} from '@components/NumericInput/types';
import ScrollView from '@components/ScrollView';

import useIsInLandscapeMode from '@hooks/useIsInLandscapeMode';
import useThemeStyles from '@hooks/useThemeStyles';

import {canUseTouchScreen as canUseTouchScreenUtil} from '@libs/DeviceCapabilities';
import isHTMLElement from '@libs/isHTMLElement';

import type {MouseEvent} from 'react';

import React from 'react';
import {View} from 'react-native';

const canUseTouchScreen = canUseTouchScreenUtil();

/** Empty area around the pad (and, in portrait, the footer). The layout is the only owner of this id. */
const containerId = 'numPadContainerView';

/** Empty area around the footer in landscape, where the footer sits apart from the pad column. */
const footerId = 'numPadFooterView';

/**
 * Responsive layout template for NumericInput handling 4 layout variants
 * (portrait/landscape x touch/non-touch), with two columns in landscape and a single ScrollView in portrait.
 */
function NumericInputResponsiveLayout({
    children,
    actions,
    pad,
    footer,
    error,
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

    const handlePadAndFooterMouseDown = (event: MouseEvent<Element>) => {
        const targetId = isHTMLElement(event.nativeEvent?.target) ? event.nativeEvent.target.id : undefined;
        if (targetId !== containerId && targetId !== footerId) {
            return;
        }

        event.preventDefault();
        clearSelection();
        focusInput();
    };

    const handleScrollViewMouseDown = (event: MouseEvent<Element>) => {
        if (!shouldRefocusOnScrollViewClick) {
            return;
        }

        event.preventDefault();
        clearSelection();
        focusInput();
    };

    const footerNode = footer ? (
        <View
            id={footerId}
            onMouseDown={handlePadAndFooterMouseDown}
            style={[styles.w100, styles.justifyContentEnd, styles.pageWrapper, styles.pt0, footerStyle]}
        >
            {footer}
        </View>
    ) : null;

    if (isInLandscapeMode) {
        const padColumn = pad ? (
            <View
                id={containerId}
                onMouseDown={handlePadAndFooterMouseDown}
                style={[styles.flex1, styles.justifyContentCenter]}
            >
                {pad}
            </View>
        ) : null;

        return (
            <>
                {disableScrollView ? (
                    <View
                        testID={testID}
                        style={[styles.flex1, styles.ph5, styles.flexRow, style]}
                    >
                        <View style={[styles.justifyContentCenter, styles.alignItemsCenter, styles.numberWithSymbolFormInputContainerLandscape]}>
                            {children}
                            {actions}
                            {error}
                        </View>
                        {padColumn}
                    </View>
                ) : (
                    <ScrollView
                        testID={testID}
                        contentContainerStyle={[styles.flexGrow1, styles.flexRow]}
                        style={[styles.flex1, styles.ph5, shouldRefocusOnScrollViewClick && styles.cursorAuto, style]}
                        onMouseDown={shouldRefocusOnScrollViewClick ? handleScrollViewMouseDown : undefined}
                    >
                        <View style={[styles.justifyContentCenter, styles.alignItemsCenter, styles.numberWithSymbolFormInputContainerLandscape]}>
                            {children}
                            {actions}
                            {error}
                        </View>
                        {padColumn}
                    </ScrollView>
                )}
                {footerNode}
            </>
        );
    }

    const shouldShowPadOrFooter = !!(pad ?? footer);

    // The number pad renders only on touch screens. When it does, it keeps a fixed gap below the amount and its actions,
    // with or without action buttons, so the centred amount does not move between screens.
    const isPadRendered = !!pad && canUseTouchScreen;

    const padAndFooterNode = shouldShowPadOrFooter ? (
        <View
            id={containerId}
            onMouseDown={handlePadAndFooterMouseDown}
            style={[styles.w100, styles.justifyContentEnd, styles.pageWrapper, styles.pt0, isPadRendered && styles.mt2, footerStyle]}
        >
            {pad}
            {footer}
        </View>
    ) : null;

    const portraitContent = (
        <>
            {children}
            {actions}
            {error}
            {padAndFooterNode}
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
