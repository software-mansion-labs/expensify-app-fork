import type {ParamListBase, StackActionHelpers, StackNavigationState} from '@react-navigation/native';
import {createNavigatorFactory, useNavigationBuilder} from '@react-navigation/native';
import type {StackNavigationEventMap, StackNavigationOptions} from '@react-navigation/stack';
import {StackView} from '@react-navigation/stack';
import React from 'react';
import {View} from 'react-native';
import FocusTrapForScreens from '@components/FocusTrap/FocusTrapForScreen';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';
import useWindowDimensions from '@hooks/useWindowDimensions';
import getRootNavigatorScreenOptions from '@libs/Navigation/AppNavigator/getRootNavigatorScreenOptions';
import SplitRouter from './SplitRouter';
import type {SplitNavigatorProps, SplitNavigatorRouterOptions} from './types';

function SplitNavigator(props: SplitNavigatorProps) {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const {isSmallScreenWidth} = useWindowDimensions();
    const screenOptions = getRootNavigatorScreenOptions(isSmallScreenWidth, styles, StyleUtils);

    const {navigation, state, descriptors, NavigationContent} = useNavigationBuilder<
        StackNavigationState<ParamListBase>,
        SplitNavigatorRouterOptions<keyof ParamListBase>,
        StackActionHelpers<ParamListBase>,
        StackNavigationOptions,
        StackNavigationEventMap
    >(SplitRouter, {
        children: props.children,
        screenOptions: screenOptions.centralPaneNavigator,
        initialRouteName: props.initialRouteName,
        sidebarScreen: props.sidebarScreen,
        initialCentralPaneScreen: props.initialCentralPaneScreen,
    });

    return (
        <FocusTrapForScreens>
            <View style={styles.rootNavigatorContainerStyles(isSmallScreenWidth)}>
                <NavigationContent>
                    <StackView
                        // eslint-disable-next-line react/jsx-props-no-spreading
                        {...props}
                        state={state}
                        descriptors={descriptors}
                        navigation={navigation}
                    />
                </NavigationContent>
            </View>
        </FocusTrapForScreens>
    );
}

SplitNavigator.displayName = 'SplitNavigator';

export default createNavigatorFactory<StackNavigationState<ParamListBase>, StackNavigationOptions, StackNavigationEventMap, typeof SplitNavigator>(SplitNavigator);
