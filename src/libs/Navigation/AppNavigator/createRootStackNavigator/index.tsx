import {BottomTabView} from '@react-navigation/bottom-tabs';
import type {DefaultNavigatorOptions, NavigationProp, ParamListBase, StackActionHelpers, StackNavigationState, StackRouterOptions} from '@react-navigation/native';
import {createNavigatorFactory, useNavigationBuilder} from '@react-navigation/native';
import type {StackNavigationEventMap, StackNavigationOptions} from '@react-navigation/stack';
import React, {useMemo} from 'react';
import RootStackRouter from './RootStackRouter';

type RootStackNavigatorID = string | undefined;

type RootStackNavigationList = {
    [RouteName in keyof ParamListBase]: NavigationProp<ParamListBase, RouteName, RootStackNavigatorID>;
};

type Props = DefaultNavigatorOptions<ParamListBase, RootStackNavigatorID, StackNavigationState<ParamListBase>, StackNavigationOptions, StackNavigationEventMap, RootStackNavigationList> &
    StackRouterOptions;

function transformStateForBottomTab(state: StackNavigationState<ParamListBase>) {
    const lastRoute = state.routes.at(-1);

    if (!lastRoute) {
        return state;
    }

    return {
        routes: [lastRoute],
        routeNames: state.routeNames,
        preloadedRouteKeys: state.preloadedRoutes ?? [],
        routes: lastRoute ? [lastRoute] : state.routes,
        index: 0,
        type: 'tab',
    };
}

function StackNavigator({id, initialRouteName, children, screenListeners, screenOptions}: Props) {
    const {state, descriptors, navigation, NavigationContent} = useNavigationBuilder<
        StackNavigationState<ParamListBase>,
        StackRouterOptions,
        StackActionHelpers<ParamListBase>,
        StackNavigationOptions,
        StackNavigationEventMap
    >(RootStackRouter, {
        id,
        initialRouteName,
        children,
        screenListeners,
        screenOptions,
    });

    const transformedState = useMemo(() => transformStateForBottomTab(state), [state]);
    return (
        <NavigationContent>
            <BottomTabView
                state={transformedState}
                descriptors={descriptors}
                navigation={navigation}
            />
            {/* <RootNavigatorExtraContent state={transformedState} /> */}
        </NavigationContent>
    );
}

export default createNavigatorFactory<StackNavigationState<ParamListBase>, StackNavigationOptions, StackNavigationEventMap, typeof StackNavigator>(StackNavigator);
