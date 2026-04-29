/**
 * Tab Navigator containing Home, Inbox (Reports), Search, Settings, and Workspaces pages.
 */
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import type {NavigationState, ParamListBase} from '@react-navigation/native';
import {findFocusedRoute, useNavigation, useNavigationState, useRoute} from '@react-navigation/native';
import React, {useEffect} from 'react';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useTheme from '@hooks/useTheme';
import usePreserveNavigatorState from '@libs/Navigation/AppNavigator/createSplitNavigator/usePreserveNavigatorState';
import createTabNavigator from '@libs/Navigation/AppNavigator/createTabNavigator';
import type {TabNavigatorParamList} from '@libs/Navigation/types';
import HomePage from '@pages/home/HomePage';
import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';
import ReportsSplitNavigator from './ReportsSplitNavigator';
import SearchFullscreenNavigator from './SearchFullscreenNavigator';
import SettingsSplitNavigator from './SettingsSplitNavigator';
import TabNavigatorBar from './TabNavigatorBar';
import WorkspaceNavigator from './WorkspaceNavigator';

const renderTabBar = ({state}: BottomTabBarProps) => <TabNavigatorBar state={state} />;

const Tab = createTabNavigator<TabNavigatorParamList>();

/**
 * Root-level tab screens where the swipe-back gesture should be disabled.
 * Swiping from these screens would pop the entire TAB_NAVIGATOR, which feels wrong.
 * WORKSPACE.INITIAL is intentionally excluded — swiping back from it returns to the workspace list.
 */
const TAB_ROOT_SCREENS_WITHOUT_GESTURE = new Set<string>([SCREENS.HOME, SCREENS.INBOX, SCREENS.SEARCH.ROOT, SCREENS.SETTINGS.ROOT]);

const TAB_SCREEN_OPTIONS_BASE = {
    headerShown: false,
    lazy: true,
    animation: 'none' as const,
    freezeOnBlur: true,
    tabBarPosition: 'bottom' as const,
} as const;

function TabNavigator() {
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const theme = useTheme();
    const navigation = useNavigation();
    const parentNavigation = navigation.getParent();
    const focusedRouteName = useNavigationState((state) => findFocusedRoute(state)?.name);
    const parentRoute = useRoute();
    const tabState = useNavigationState((parentState) => {
        const myRoute = parentState.routes.find((r) => r.key === parentRoute.key);
        const state = myRoute?.state;
        if (!state || state.stale) {
            return undefined;
        }
        return state as NavigationState<ParamListBase>;
    });
    usePreserveNavigatorState(tabState, parentRoute);

    useEffect(() => {
        if (!shouldUseNarrowLayout || !parentNavigation) {
            return;
        }
        const isRootScreen = TAB_ROOT_SCREENS_WITHOUT_GESTURE.has(focusedRouteName ?? '');
        parentNavigation.setOptions({gestureEnabled: !isRootScreen});
    }, [focusedRouteName, shouldUseNarrowLayout, parentNavigation]);

    const screenOptions = {
        ...TAB_SCREEN_OPTIONS_BASE,
        sceneStyle: {flex: 1, backgroundColor: theme.appBG},
    };

    return (
        <Tab.Navigator
            backBehavior="fullHistory"
            tabBar={renderTabBar}
            screenOptions={screenOptions}
            parentRoute={parentRoute}
        >
            <Tab.Screen
                name={SCREENS.HOME}
                component={HomePage}
            />
            <Tab.Screen
                name={NAVIGATORS.REPORTS_SPLIT_NAVIGATOR}
                component={ReportsSplitNavigator}
            />
            <Tab.Screen
                name={NAVIGATORS.SEARCH_FULLSCREEN_NAVIGATOR}
                component={SearchFullscreenNavigator}
            />
            <Tab.Screen
                name={NAVIGATORS.SETTINGS_SPLIT_NAVIGATOR}
                component={SettingsSplitNavigator}
            />
            <Tab.Screen
                name={NAVIGATORS.WORKSPACE_NAVIGATOR}
                component={WorkspaceNavigator}
            />
        </Tab.Navigator>
    );
}

export default TabNavigator;
