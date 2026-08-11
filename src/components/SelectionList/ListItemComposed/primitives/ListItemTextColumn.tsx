import useThemeStyles from '@hooks/useThemeStyles';

import type {StyleProp, ViewStyle} from 'react-native';

import React from 'react';
import {View} from 'react-native';

type ListItemTextColumnProps = {
    /** Title, subtitle, and other text content */
    children: React.ReactNode;

    /** Additional styles merged onto the column container (overrides the stretch-aligned optionRow defaults) */
    style?: StyleProp<ViewStyle>;
};

function ListItemTextColumn({children, style}: ListItemTextColumnProps) {
    const styles = useThemeStyles();

    return <View style={[styles.flex1, styles.flexColumn, styles.justifyContentCenter, styles.alignItemsStretch, styles.optionRow, style]}>{children}</View>;
}

export default ListItemTextColumn;
