import useRefocusOnEmptyAreaPress from '@components/NumericInput/hooks/useRefocusOnEmptyAreaPress';
import type {NumericInputFooterProps} from '@components/NumericInput/types';

import useThemeStyles from '@hooks/useThemeStyles';

import {View} from 'react-native';

/**
 * Bottom area of a numeric form, holding the submit button (and, in portrait, the number pad above it).
 * Pressing its empty web area keeps the numeric input focused.
 */
function NumericInputFooter({children, style, testID}: NumericInputFooterProps) {
    const styles = useThemeStyles();
    const {id, onMouseDown} = useRefocusOnEmptyAreaPress();

    return (
        <View
            id={id}
            onMouseDown={onMouseDown}
            style={[styles.w100, styles.justifyContentEnd, styles.pageWrapper, styles.pt0, style]}
            testID={testID}
        >
            {children}
        </View>
    );
}

export default NumericInputFooter;
