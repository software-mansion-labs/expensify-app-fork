import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import React from 'react';
import type {TabNavigatorParamList} from '@libs/Navigation/types';
import WorkspacesListPage from '@pages/workspace/WorkspacesListPage';
import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';
import type ReactComponentModule from '@src/types/utils/ReactComponentModule';
import CustomTabBar from './CustomTabBar';

const loadReportSplitNavigator = () => require<ReactComponentModule>('./Navigators/ReportsSplitNavigator').default;
const loadSettingsSplitNavigator = () => require<ReactComponentModule>('./Navigators/SettingsSplitNavigator').default;
const loadSearchNavigator = () => require<ReactComponentModule>('./Navigators/SearchFullscreenNavigator').default;

const Tab = createBottomTabNavigator<TabNavigatorParamList>();

const tabBarComponent = (props: BottomTabBarProps) => (
    <CustomTabBar
        state={props.state}
        navigation={props.navigation}
        descriptors={props.descriptors}
        insets={props.insets}
    />
);

function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{headerShown: false, freezeOnBlur: true}}
            backBehavior="history"
            tabBar={tabBarComponent}
        >
            <Tab.Screen
                name={NAVIGATORS.REPORTS_SPLIT_NAVIGATOR}
                getComponent={loadReportSplitNavigator}
            />
            <Tab.Screen
                name={NAVIGATORS.SETTINGS_SPLIT_NAVIGATOR}
                getComponent={loadSettingsSplitNavigator}
            />
            <Tab.Screen
                name={NAVIGATORS.SEARCH_FULLSCREEN_NAVIGATOR}
                getComponent={loadSearchNavigator}
            />
            {/* <Tab.Screen
                name={NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR}
                getComponent={loadWorkspaceSplitNavigator}
            /> */}
            <Tab.Screen
                name={SCREENS.WORKSPACES_LIST}
                component={WorkspacesListPage}
            />
        </Tab.Navigator>
    );
}

export default TabNavigator;
