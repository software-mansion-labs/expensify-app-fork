import Icon from '@components/Icon';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import type {BrickRoad} from '@libs/WorkspacesSettingsUtils';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

type ListItemRBRIndicatorProps = {
    /** Brick road indicator status on the list item */
    brickRoadIndicator?: BrickRoad | '' | null;

    /** Whether the parent row is selected */
    isSelected?: boolean;

    /** When true, the indicator remains visible even when the row is selected */
    canShowSeveralIndicators?: boolean;

    /** When false, the indicator is never rendered */
    shouldDisplay?: boolean;
};

function ListItemRBRIndicator({brickRoadIndicator, isSelected, canShowSeveralIndicators, shouldDisplay = true}: ListItemRBRIndicatorProps) {
    const icons = useMemoizedLazyExpensifyIcons(['DotIndicator']);
    const styles = useThemeStyles();
    const theme = useTheme();

    const shouldShow = shouldDisplay && (!isSelected || !!canShowSeveralIndicators) && !!brickRoadIndicator;

    if (!shouldShow) {
        return null;
    }

    return (
        <View style={[styles.alignItemsCenter, styles.justifyContentCenter, styles.ml3]}>
            <Icon
                testID={CONST.DOT_INDICATOR_TEST_ID}
                src={icons.DotIndicator}
                fill={brickRoadIndicator === CONST.BRICK_ROAD_INDICATOR_STATUS.INFO ? theme.iconSuccessFill : theme.danger}
            />
        </View>
    );
}

export default ListItemRBRIndicator;
