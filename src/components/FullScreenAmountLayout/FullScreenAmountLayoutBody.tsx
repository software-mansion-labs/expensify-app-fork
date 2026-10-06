import ScrollView from '@components/ScrollView';

import useThemeStyles from '@hooks/useThemeStyles';

import React from 'react';
import {View} from 'react-native';

import type {FullScreenAmountLayoutBodyProps} from './types';

import {useFullScreenAmountLayout} from './context';

/**
 * Region holding the main column and the number pad. In two columns it is the scrollable row; in a single column it fills
 * the space the layout's scroll view leaves above the footer.
 * In a single column it only grows (`flexGrow1`, not `flex1`): its basis stays its content height and it never shrinks, so
 * when the screen is shorter than the amount plus the pad, the content overflows and the layout's scroll view scrolls
 * instead of squeezing the amount under the pad.
 */
function FullScreenAmountLayoutBody({children, style, testID}: FullScreenAmountLayoutBodyProps) {
    const styles = useThemeStyles();
    const {isTwoColumn} = useFullScreenAmountLayout();

    if (isTwoColumn) {
        return (
            <ScrollView
                testID={testID}
                contentContainerStyle={[styles.flexGrow1, styles.flexRow, style]}
                style={[styles.flex1, styles.ph5]}
            >
                {children}
            </ScrollView>
        );
    }

    return (
        <View
            testID={testID}
            style={[styles.flexGrow1, style]}
        >
            {children}
        </View>
    );
}

export default FullScreenAmountLayoutBody;
