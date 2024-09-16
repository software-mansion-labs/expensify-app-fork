import type {ParamListBase, StackActionHelpers, StackNavigationState} from '@react-navigation/native';
import {createNavigatorFactory, useNavigationBuilder} from '@react-navigation/native';
import type {StackNavigationEventMap, StackNavigationOptions} from '@react-navigation/stack';
import {StackView} from '@react-navigation/stack';
import React, {useMemo} from 'react';
import {View} from 'react-native';
import FocusTrapForScreens from '@components/FocusTrap/FocusTrapForScreen';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';
import getIsNarrowLayout from '@libs/getIsNarrowLayout';
import getRootNavigatorScreenOptions from '@libs/Navigation/AppNavigator/getRootNavigatorScreenOptions';
import variables from '@styles/variables';
import SplitStackRouter from './SplitStackRouter';
import type {SplitStackNavigatorProps, SplitStackNavigatorRouterOptions} from './types';
import useHandleScreenResize from './useHandleScreenResize';
import usePrepareSplitStackNavigatorChildren from './usePrepareSplitStackNavigatorChildren';

function SplitStackNavigator<ParamList extends ParamListBase>(props: SplitStackNavigatorProps<ParamList>) {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const isNarrowLayout = getIsNarrowLayout();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const screenOptions = getRootNavigatorScreenOptions(shouldUseNarrowLayout, styles, StyleUtils);

    const children = usePrepareSplitStackNavigatorChildren(props.children, props.sidebarScreen, screenOptions.homeScreen);

    const {navigation, state, descriptors, NavigationContent} = useNavigationBuilder<
        StackNavigationState<ParamListBase>,
        SplitStackNavigatorRouterOptions,
        StackActionHelpers<ParamListBase>,
        StackNavigationOptions,
        StackNavigationEventMap
    >(SplitStackRouter, {
        children,
        screenOptions: screenOptions.centralPaneNavigator,
        initialRouteName: props.initialRouteName,
        sidebarScreen: props.sidebarScreen,
        defaultCentralScreen: props.defaultCentralScreen,
    });

    const [lhn, centralPane] = useMemo(() => {
        const lhnState = {...state, routes: [state.routes.at(0)], index: 0};
        const centralPaneState = state.routes.length > 1 ? {...state, routes: state.routes.slice(1), index: state.routes.length - 2} : undefined;
        return [lhnState, centralPaneState];
    }, [state]);

    // console.log('splitStackState TEST ', JSON.stringify(splitStackState));

    useHandleScreenResize(navigation);

    const sideBarWidth = isNarrowLayout ? '100%' : variables.sideBarWidth;

    return (
        <FocusTrapForScreens>
            <View style={styles.rootNavigatorContainerStyles(shouldUseNarrowLayout)}>
                <NavigationContent>
                    {isNarrowLayout ? (
                        <StackView
                            // eslint-disable-next-line react/jsx-props-no-spreading
                            {...props}
                            state={state}
                            descriptors={descriptors}
                            navigation={navigation}
                        />
                    ) : (
                        <View style={{flexDirection: 'row', flex: 1}}>
                            <View style={{flex: 1, maxWidth: sideBarWidth}}>
                                <StackView
                                    // eslint-disable-next-line react/jsx-props-no-spreading
                                    {...props}
                                    state={lhn}
                                    descriptors={descriptors}
                                    navigation={navigation}
                                />
                            </View>
                            <View style={{flex: 1}}>
                                <StackView
                                    // eslint-disable-next-line react/jsx-props-no-spreading
                                    {...props}
                                    state={centralPane}
                                    descriptors={descriptors}
                                    navigation={navigation}
                                />
                            </View>
                        </View>
                    )}
                </NavigationContent>
            </View>
        </FocusTrapForScreens>
    );
}

SplitStackNavigator.displayName = 'SplitStackNavigator';

export default function <ParamList extends ParamListBase>() {
    return createNavigatorFactory<StackNavigationState<ParamList>, StackNavigationOptions, StackNavigationEventMap, React.ComponentType<SplitStackNavigatorProps<ParamList>>>(
        SplitStackNavigator,
    )<ParamList>();
}
