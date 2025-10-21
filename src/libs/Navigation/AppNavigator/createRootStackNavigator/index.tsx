import {BottomTabView} from '@react-navigation/bottom-tabs';
import type {DefaultNavigatorOptions, ParamListBase, StackActionHelpers, StackNavigationState, StackRouterOptions} from '@react-navigation/native';
import {createNavigatorFactory, useNavigationBuilder} from '@react-navigation/native';
import type {StackNavigationEventMap, StackNavigationOptions} from '@react-navigation/stack';
import type {StackNavigationConfig} from '@react-navigation/stack/lib/typescript/src/types';
import React, {useMemo} from 'react';
import RootNavigatorExtraContent from '@components/Navigation/RootNavigatorExtraContent';
import RootStackRouter from './RootStackRouter';

type Props = DefaultNavigatorOptions<ParamListBase, StackNavigationState<ParamListBase>, StackNavigationOptions, StackNavigationEventMap> & StackRouterOptions & StackNavigationConfig;

function transformStateForBottomTab(state: StackNavigationState<ParamListBase>) {
    const lastRoute = state.routes.at(-1);

    if (!lastRoute) {
        return state;
    }

    return {
        ...state,
        routes: [lastRoute],
        index: 0,
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
            <RootNavigatorExtraContent state={transformedState} />
        </NavigationContent>
    );
}

export default createNavigatorFactory<StackNavigationState<ParamListBase>, StackNavigationOptions, StackNavigationEventMap, typeof StackNavigator>(StackNavigator);
