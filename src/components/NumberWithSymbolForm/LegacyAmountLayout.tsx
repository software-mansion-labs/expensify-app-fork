import {useNumericInputActions} from '@components/NumericInput';
import ScrollView from '@components/ScrollView';

import useIsInLandscapeMode from '@hooks/useIsInLandscapeMode';
import useThemeStyles from '@hooks/useThemeStyles';

import {canUseTouchScreen as canUseTouchScreenUtil} from '@libs/DeviceCapabilities';
import isHTMLElement from '@libs/isHTMLElement';

import type {MouseEvent} from 'react';

import React from 'react';
import {View} from 'react-native';

import type {LegacyAmountLayoutProps} from './types';

const canUseTouchScreen = canUseTouchScreenUtil();

/** Empty area around the pad (and, in portrait, the footer). The layout is the only owner of this id. */
const containerId = 'numPadContainerView';

/** Empty area around the footer in landscape, where the footer sits apart from the pad column. */
const footerId = 'numPadFooterView';

/**
 * Full-screen layout of the legacy number form, private to the NumberWithSymbolForm adapter. It handles 4 layout variants
 * (portrait/landscape x touch/non-touch), with two columns in landscape and a single ScrollView in portrait, and keeps the
 * legacy spacing, element ids and opt-in scroll view refocus that the adapter's callers rely on.
 * New screens compose `FullScreenAmountLayout` instead. This layout is removed together with the adapter.
 */
function LegacyAmountLayout({children, actions, pad, footer, error, scrollViewStyle, shouldRefocusOnScrollViewClick = false}: LegacyAmountLayoutProps) {
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
            style={[styles.w100, styles.justifyContentEnd, styles.pageWrapper, styles.pt0]}
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
                <ScrollView
                    contentContainerStyle={[styles.flexGrow1, styles.flexRow]}
                    style={[styles.flex1, styles.ph5, shouldRefocusOnScrollViewClick && styles.cursorAuto]}
                    onMouseDown={shouldRefocusOnScrollViewClick ? handleScrollViewMouseDown : undefined}
                >
                    {/* Centred in the row at its content height, so the growing amount container keeps the actions and error under it */}
                    <View style={[styles.alignSelfCenter, styles.justifyContentCenter, styles.alignItemsCenter, styles.numberWithSymbolFormInputContainerLandscape]}>
                        {children}
                        {actions}
                        {error}
                    </View>
                    {padColumn}
                </ScrollView>
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
            style={[styles.w100, styles.justifyContentEnd, styles.pageWrapper, styles.pt0, isPadRendered && styles.mt2]}
        >
            {pad}
            {footer}
        </View>
    ) : null;

    return (
        <ScrollView
            contentContainerStyle={[styles.flexGrow1, scrollViewStyle]}
            style={[styles.flex1, shouldRefocusOnScrollViewClick && styles.cursorAuto]}
            onMouseDown={shouldRefocusOnScrollViewClick ? handleScrollViewMouseDown : undefined}
        >
            {children}
            {actions}
            {error}
            {padAndFooterNode}
        </ScrollView>
    );
}

export default LegacyAmountLayout;
