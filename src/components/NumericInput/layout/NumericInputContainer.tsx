import useRefocusOnEmptyAreaPress from '@components/NumericInput/hooks/useRefocusOnEmptyAreaPress';
import type {NumericInputContainerProps} from '@components/NumericInput/types';

import useThemeStyles from '@hooks/useThemeStyles';

import {View} from 'react-native';

/**
 * Centers the amount row, with the action and error the layout places under it. Internal to `NumericInput.ResponsiveLayout`,
 * which passes the orientation. In portrait, pressing its empty web area keeps the numeric input focused.
 */
function NumericInputContainer({action, children, error, isInLandscapeMode, testID}: NumericInputContainerProps) {
    const styles = useThemeStyles();
    const {id, onMouseDown} = useRefocusOnEmptyAreaPress();

    const containerStyle = isInLandscapeMode ? [styles.justifyContentCenter, styles.alignItemsCenter] : [styles.flex1, styles.justifyContentCenter, styles.alignItemsCenter];

    const innerViewStyle = isInLandscapeMode
        ? [styles.w100, styles.alignItemsCenter, styles.justifyContentCenter]
        : [styles.flex1, styles.w100, styles.alignItemsCenter, styles.justifyContentCenter];

    return (
        <View style={containerStyle}>
            <View
                id={isInLandscapeMode ? undefined : id}
                onMouseDown={isInLandscapeMode ? undefined : onMouseDown}
                style={innerViewStyle}
                testID={testID}
            >
                <View style={[styles.flexRow, !isInLandscapeMode && styles.moneyRequestAmountContainer, styles.alignItemsCenter, styles.justifyContentCenter]}>{children}</View>
                {action}
                {error}
            </View>
        </View>
    );
}

export default NumericInputContainer;
