import ActivityIndicator from '@components/ActivityIndicator';

import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import React from 'react';
import {View} from 'react-native';

/**
 * The trailing indicator of a `MenuItem.Row` whose action is running. It takes the place of the chevron, so the row
 * keeps its width while the user waits.
 */
function MenuItemLoadingIndicator() {
    const theme = useTheme();
    const styles = useThemeStyles();

    return (
        <View
            style={styles.menuItemTrailingIcon}
            testID="menu-item-loading-indicator"
        >
            <ActivityIndicator color={theme.textSupporting} />
        </View>
    );
}

export default MenuItemLoadingIndicator;
