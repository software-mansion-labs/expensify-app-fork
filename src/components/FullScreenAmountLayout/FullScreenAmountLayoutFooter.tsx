import useBottomSafeSafeAreaPaddingStyle from '@hooks/useBottomSafeSafeAreaPaddingStyle';
import useThemeStyles from '@hooks/useThemeStyles';

import {canUseTouchScreen as canUseTouchScreenUtil} from '@libs/DeviceCapabilities';

import React from 'react';
import {View} from 'react-native';

import type {FullScreenAmountLayoutFooterProps} from './types';

import {useFullScreenAmountLayout} from './context';

const canUseTouchScreen = canUseTouchScreenUtil();

/**
 * Full-width container for the submit CTA, below the body, centering its content.
 * In two columns it sits outside the scroll view, so it adds the bottom spacing and the bottom safe area itself. In a single
 * column on touch screens the layout's scroll view owns the bottom spacing (the pad ends the body there), so the footer adds
 * none; without a touch screen there is no pad and the footer keeps its own bottom spacing.
 */
function FullScreenAmountLayoutFooter({children, style, testID}: FullScreenAmountLayoutFooterProps) {
    const styles = useThemeStyles();
    const {isTwoColumn} = useFullScreenAmountLayout();
    const ownsBottomSpacing = isTwoColumn || !canUseTouchScreen;
    const footerStyle = useBottomSafeSafeAreaPaddingStyle({
        addBottomSafeAreaPadding: isTwoColumn,
        style: [styles.w100, styles.alignItemsCenter, styles.ph5, ownsBottomSpacing && styles.pb5, style],
    });

    return (
        <View
            testID={testID}
            style={footerStyle}
        >
            {children}
        </View>
    );
}

export default FullScreenAmountLayoutFooter;
