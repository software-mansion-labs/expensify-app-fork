import {BottomTabView} from '@react-navigation/bottom-tabs';
import type {DefaultNavigatorOptions, ParamListBase, StackActionHelpers, StackNavigationState, StackRouterOptions} from '@react-navigation/native';
import {createNavigatorFactory, useNavigationBuilder} from '@react-navigation/native';
import type {StackNavigationEventMap, StackNavigationOptions} from '@react-navigation/stack';
import {StackView} from '@react-navigation/stack';
import type {StackNavigationConfig} from '@react-navigation/stack/lib/typescript/src/types';
import React from 'react';
import RootNavigatorExtraContent from '@components/Navigation/RootNavigatorExtraContent';
import RootStackRouter from './RootStackRouter';

type Props = DefaultNavigatorOptions<ParamListBase, StackNavigationState<ParamListBase>, StackNavigationOptions, StackNavigationEventMap> & StackRouterOptions & StackNavigationConfig;

function StackNavigator({id, initialRouteName, children, screenListeners, screenOptions, ...rest}: Props) {
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
        defaultScreenOptions: {headerShown: false},
    });

    return (
        <NavigationContent>
            <BottomTabView
                {...rest}
                state={state}
                descriptors={descriptors}
                navigation={navigation}
            />
            {/* <StackView
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...rest}
                state={state}
                descriptors={descriptors}
                navigation={navigation}
            /> */}
            <RootNavigatorExtraContent state={state} />
        </NavigationContent>
    );
}

export default createNavigatorFactory<StackNavigationState<ParamListBase>, StackNavigationOptions, StackNavigationEventMap, typeof StackNavigator>(StackNavigator);
