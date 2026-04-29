import type {BottomTabNavigationEventMap, BottomTabNavigationOptions, BottomTabNavigationProp, BottomTabNavigatorProps} from '@react-navigation/bottom-tabs';
import {BottomTabView} from '@react-navigation/bottom-tabs';
import type {NavigatorTypeBagBase, ParamListBase, RouteProp, StaticConfig, TabActionHelpers, TabNavigationState, TypedNavigator} from '@react-navigation/native';
import {createNavigatorFactory, useNavigationBuilder} from '@react-navigation/native';
import React from 'react';
import TabNavigatorRouter from './TabNavigatorRouter';
import type TabNavigatorRouterOptions from './types';

type TabNavigatorProps = BottomTabNavigatorProps & {parentRoute: RouteProp<ParamListBase>};

function TabNavigatorComponent({
    id,
    initialRouteName,
    backBehavior,
    UNSTABLE_routeNamesChangeBehavior,
    children,
    layout,
    screenListeners,
    screenOptions,
    screenLayout,
    parentRoute,
    tabBar,
    safeAreaInsets,
    detachInactiveScreens,
}: TabNavigatorProps) {
    const {state, descriptors, navigation, NavigationContent} = useNavigationBuilder<
        TabNavigationState<ParamListBase>,
        TabNavigatorRouterOptions,
        TabActionHelpers<ParamListBase>,
        BottomTabNavigationOptions,
        BottomTabNavigationEventMap
    >(TabNavigatorRouter, {
        id,
        initialRouteName,
        backBehavior,
        UNSTABLE_routeNamesChangeBehavior,
        children,
        layout,
        screenListeners,
        screenOptions,
        screenLayout,
        parentRoute,
    });

    return (
        <NavigationContent>
            <BottomTabView
                tabBar={tabBar}
                safeAreaInsets={safeAreaInsets}
                detachInactiveScreens={detachInactiveScreens}
                state={state}
                navigation={navigation}
                descriptors={descriptors}
            />
        </NavigationContent>
    );
}

function createTabNavigator<
    const ParamList extends ParamListBase,
    const NavigatorID extends string | undefined = string | undefined,
    const TypeBag extends NavigatorTypeBagBase = {
        ParamList: ParamList;
        NavigatorID: NavigatorID;
        State: TabNavigationState<ParamList>;
        ScreenOptions: BottomTabNavigationOptions;
        EventMap: BottomTabNavigationEventMap;
        NavigationList: {
            [RouteName in keyof ParamList]: BottomTabNavigationProp<ParamList, RouteName, NavigatorID>;
        };
        Navigator: typeof TabNavigatorComponent;
    },
    const Config extends StaticConfig<TypeBag> = StaticConfig<TypeBag>,
>(config?: Config): TypedNavigator<TypeBag, Config> {
    // In React Navigation 7 createNavigatorFactory returns any
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return createNavigatorFactory(TabNavigatorComponent)(config);
}

export default createTabNavigator;
