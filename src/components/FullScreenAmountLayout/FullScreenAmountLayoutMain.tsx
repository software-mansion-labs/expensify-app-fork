import useThemeStyles from '@hooks/useThemeStyles';

import React from 'react';
import {View} from 'react-native';

import type {FullScreenAmountLayoutMainProps} from './types';

import {useFullScreenAmountLayout} from './context';

/**
 * Column holding the amount. A fixed-width left column in two columns; otherwise it fills the space above the number pad.
 * In two columns it is centred in the row at its content height (`alignSelfCenter`) instead of being stretched to the row's
 * height, so the amount, its actions and error stay together in the middle even though `NumericInput.Container` grows.
 * In a single column it only grows (`flexGrow1`, not `flex1`), so it never shrinks below the amount's height when the pad
 * takes most of a short screen: the body then overflows and the layout's scroll view scrolls.
 */
function FullScreenAmountLayoutMain({children, style, testID}: FullScreenAmountLayoutMainProps) {
    const styles = useThemeStyles();
    const {isTwoColumn} = useFullScreenAmountLayout();

    return (
        <View
            testID={testID}
            style={[
                isTwoColumn ? [styles.alignSelfCenter, styles.justifyContentCenter, styles.alignItemsCenter, styles.numberWithSymbolFormInputContainerLandscape] : styles.flexGrow1,
                style,
            ]}
        >
            {children}
        </View>
    );
}

export default FullScreenAmountLayoutMain;
