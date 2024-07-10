import React from 'react';
import {Animated, StyleProp, StyleSheet, ViewStyle} from 'react-native';
import PressableWithFeedback from '@components/Pressable/PressableWithFeedback';
import useThemeStyles from '@hooks/useThemeStyles';
import type IconAsset from '@src/types/utils/IconAsset';
import TabIcon from './TabIcon';
import TabLabel from './TabLabel';

type TabSelectorItemProps = {
    /** Function to call when onPress */
    onPress?: () => void;

    /** Icon to display on tab */
    icon?: IconAsset;

    /** Title of the tab */
    title?: string;

    /** Animated background color value for the tab button */
    backgroundColor?: string | Animated.AnimatedInterpolation<string>;

    /** Animated opacity value while the tab is in inactive state */
    inactiveOpacity?: number | Animated.AnimatedInterpolation<number>;

    /** Animated opacity value while the tab is in active state */
    activeOpacity?: number | Animated.AnimatedInterpolation<number>;

    /** Whether this tab is active */
    isActive?: boolean;

    wrapperStyle?: StyleProp<ViewStyle>;

    positionStyle?: StyleProp<ViewStyle>;
};

function TabSelectorItem({
    icon,
    title = '',
    onPress = () => {},
    backgroundColor = '',
    activeOpacity = 0,
    inactiveOpacity = 1,
    isActive = false,
    positionStyle = StyleSheet.absoluteFill,
    wrapperStyle,
}: TabSelectorItemProps) {
    const styles = useThemeStyles();
    return (
        <PressableWithFeedback
            accessibilityLabel={title}
            style={[styles.tabSelectorButton]}
            wrapperStyle={wrapperStyle ?? styles.flex1}
            onPress={onPress}
        >
            {({hovered}) => (
                <Animated.View style={[styles.tabSelectorButton, positionStyle, styles.tabBackground(hovered, isActive, backgroundColor)]}>
                    <TabIcon
                        icon={icon}
                        activeOpacity={styles.tabOpacity(hovered, isActive, activeOpacity, inactiveOpacity).opacity}
                        inactiveOpacity={styles.tabOpacity(hovered, isActive, inactiveOpacity, activeOpacity).opacity}
                    />
                    <TabLabel
                        title={title}
                        activeOpacity={styles.tabOpacity(hovered, isActive, activeOpacity, inactiveOpacity).opacity}
                        inactiveOpacity={styles.tabOpacity(hovered, isActive, inactiveOpacity, activeOpacity).opacity}
                    />
                </Animated.View>
            )}
        </PressableWithFeedback>
    );
}

TabSelectorItem.displayName = 'TabSelectorItem';

export default TabSelectorItem;
