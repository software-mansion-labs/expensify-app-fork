import type {NumericInputActionsProps} from '@components/NumericInput/types';

import useThemeStyles from '@hooks/useThemeStyles';

import {View} from 'react-native';

/**
 * Row of action buttons (e.g. `NumericInput.CurrencyButton`, `NumericInput.FlipButton`). It renders what it receives:
 * `NumericInput.ResponsiveLayout` decides which actions a device shows and skips the row when none does.
 * It carries no outer spacing, so the pad sits in the same place whether or not a screen shows any action.
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
