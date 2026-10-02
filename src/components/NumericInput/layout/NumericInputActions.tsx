import type {NumericInputActionsProps} from '@components/NumericInput/types';

import useThemeStyles from '@hooks/useThemeStyles';

import React from 'react';
import {View} from 'react-native';

/**
 * Centered row grouping action buttons (e.g. `NumericInput.CurrencyButton`, `NumericInput.FlipButton`).
 * It carries no outer spacing and makes no visibility decisions: the composition decides whether to render it at all.
 */
function NumericInputActions({children, style, testID}: NumericInputActionsProps) {
    const styles = useThemeStyles();

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
