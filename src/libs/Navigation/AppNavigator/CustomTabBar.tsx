import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import React, {useEffect, useRef} from 'react';
import {View} from 'react-native';
import PressableWithFeedback from '@components/Pressable/PressableWithFeedback';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import CONST from '@src/CONST';
import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';

function CustomTabBar({state, navigation}: BottomTabBarProps) {
    const styles = useThemeStyles();
    const timerRef = useRef<number | null>(null);
    const previousIndexRef = useRef<number>(state.index);

    useEffect(() => {
        // If the index has changed, end the timer
        if (previousIndexRef.current !== state.index && timerRef.current) {
            // eslint-disable-next-line no-console
            console.timeEnd('tab-switch');
            timerRef.current = null;
        }
        previousIndexRef.current = state.index;
    }, [state.index]);

    const handleTabPress = (routeName: string, isFocused: boolean) => {
        if (!isFocused) {
            // eslint-disable-next-line no-console
            console.time('tab-switch');
            timerRef.current = Date.now();
        }
        navigation.navigate(routeName);
    };

    const getShortName = (name: string) => {
        switch (name) {
            case NAVIGATORS.REPORTS_SPLIT_NAVIGATOR:
                return 'Reports';
            case NAVIGATORS.SETTINGS_SPLIT_NAVIGATOR:
                return 'Settings';
            case NAVIGATORS.SEARCH_FULLSCREEN_NAVIGATOR:
                return 'Search';
            case SCREENS.WORKSPACES_LIST:
                return 'Workspaces';
            default:
                return name; // Fallback to original name if not found
        }
    };

    return (
        <View style={[styles.navigationTabBarContainer, {justifyContent: 'space-around'}]}>
            {state.routes.map((route, index) => {
                const isFocused = state.index === index;
                const shortName = getShortName(route.name);
                // eslint-disable-next-line no-console
                console.log({routeName: route.name, shortName});
                return (
                    <PressableWithFeedback
                        key={route.key}
                        onPress={() => handleTabPress(route.name, isFocused)}
                        style={[
                            styles.navigationTabBarItem,
                            styles.flex1, // To make it spread evenly
                            {backgroundColor: styles.navigationTabBarContainer.backgroundColor}, // Background for the button
                        ]}
                        role={CONST.ROLE.BUTTON}
                        accessibilityLabel={shortName}
                    >
                        <Text
                            style={[
                                styles.textSmall,
                                styles.textAlignCenter,
                                styles.mt1Half,
                                isFocused ? {color: 'red', fontWeight: 'bold'} : styles.textSupporting,
                                styles.navigationTabBarLabel,
                                {backgroundColor: 'white', width: 80, height: 30},
                            ]}
                        >
                            {shortName}
                        </Text>
                    </PressableWithFeedback>
                );
            })}
        </View>
    );
}

export default CustomTabBar;
