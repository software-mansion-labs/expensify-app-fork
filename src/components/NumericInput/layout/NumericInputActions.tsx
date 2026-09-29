import NumericFlipButton from '@components/NumericInput/primitives/NumericFlipButton';
import type {NumericInputActionsProps} from '@components/NumericInput/types';

import useThemeStyles from '@hooks/useThemeStyles';

import {canUseTouchScreen as canUseTouchScreenUtil} from '@libs/DeviceCapabilities';

import React from 'react';
import {View} from 'react-native';

const canUseTouchScreen = canUseTouchScreenUtil();

function isVisibleChild(child: React.ReactNode): boolean {
    if (!child) {
        return false;
    }
    if (React.isValidElement<{children?: React.ReactNode}>(child)) {
        // The flip button primitive renders nothing without a touch screen. It is matched by reference, which survives minification.
        if (!canUseTouchScreen && child.type === NumericFlipButton) {
            return false;
        }
        if (child.type === React.Fragment) {
            const fragmentChildren = React.Children.toArray(child.props.children);
            return fragmentChildren.some(isVisibleChild);
        }
    }
    return true;
}

/**
 * Layout container grouping action buttons (e.g. `NumericInput.CurrencyButton`, `NumericInput.FlipButton`).
 * It carries no outer spacing: `NumericInput.ResponsiveLayout` owns the gap above the number pad, so the pad sits in the
 * same place whether or not a screen shows any action.
 */
function NumericInputActions({children, hideOnNonTouch = false, style, testID}: NumericInputActionsProps) {
    const styles = useThemeStyles();

    if (hideOnNonTouch && !canUseTouchScreen) {
        return null;
    }

    const visibleChildren = React.Children.toArray(children).filter(isVisibleChild);
    if (visibleChildren.length === 0) {
        return null;
    }

    return (
        <View
            style={[styles.flexRow, styles.justifyContentCenter, styles.gap2, style]}
            testID={testID}
        >
            {children}
        </View>
    );
}

export default NumericInputActions;
