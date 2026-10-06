import useThemeStyles from '@hooks/useThemeStyles';

import {canUseTouchScreen as canUseTouchScreenUtil} from '@libs/DeviceCapabilities';

import React from 'react';
import {View} from 'react-native';

import type {FullScreenAmountLayoutPadProps} from './types';

import {useFullScreenAmountLayout} from './context';

const canUseTouchScreen = canUseTouchScreenUtil();

/**
 * Container for the touch number pad. The right column in two columns; otherwise it sits at the bottom of the body.
 * The number pad exists only on touch screens, so the container renders nothing elsewhere instead of leaving empty padding.
 * In a single column it keeps a small gap above the pad and has no bottom padding: the bottom spacing belongs to the screen edge
 * (the layout's scroll view), so it is the same whether a footer follows the pad or not.
 */
function FullScreenAmountLayoutPad({children, style, testID}: FullScreenAmountLayoutPadProps) {
    const styles = useThemeStyles();
    const {isTwoColumn} = useFullScreenAmountLayout();

    if (!canUseTouchScreen) {
        return null;
    }

    return (
        <View
            testID={testID}
            style={[isTwoColumn ? [styles.flex1, styles.justifyContentCenter] : [styles.w100, styles.alignItemsCenter, styles.justifyContentEnd, styles.ph5, styles.mt2], style]}
        >
            {children}
        </View>
    );
}

export default FullScreenAmountLayoutPad;
