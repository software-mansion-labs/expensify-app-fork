import type {ParamListBase, StackActionHelpers, StackNavigationState} from '@react-navigation/native';
import {createNavigatorFactory, useNavigationBuilder} from '@react-navigation/native';
import type {StackNavigationEventMap, StackNavigationOptions} from '@react-navigation/stack';
import {StackView} from '@react-navigation/stack';
import React, {useEffect, useMemo} from 'react';
import useWindowDimensions from '@hooks/useWindowDimensions';
import navigationRef from '@libs/Navigation/navigationRef';
import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';
import CustomRouter from './CustomRouter';
import type {ResponsiveStackNavigatorProps, ResponsiveStackNavigatorRouterOptions} from './types';

type Routes = StackNavigationState<ParamListBase>['routes'];

// We want to reduce how much central pane screens are rendered to improve performance
function reduceAndRecycleRoutes(routes: Routes): Routes {
    const result: Routes = [];

    // Counters for central pane screens.
    let reportCount = 0;
    let nonReportCentralPaneCount = 0;
    const reverseRoutes = [...routes].reverse();

    // We have separete batch of central pane screens for reports and non-reports.
    // This way switching between tabs should be faster because we always have some screens mounted.
    reverseRoutes.forEach((route) => {
        if (route.name === NAVIGATORS.CENTRAL_PANE_NAVIGATOR && route.params && 'screen' in route.params && 'params' in route.params && route.params.screen === SCREENS.REPORT) {
            if (reportCount < 3) {
                const oldestSameParamsRoute = routes.find(
                    (r) =>
                        r.name === NAVIGATORS.CENTRAL_PANE_NAVIGATOR &&
                        r.params &&
                        'screen' in r.params &&
                        r.params.screen === SCREENS.REPORT &&
                        'params' in r.params &&
                        r.params.params &&
                        r.params.params.reportID === route.params.params.reportID,
                );

                if (oldestSameParamsRoute && !result.includes(oldestSameParamsRoute)) {
                    reportCount++;
                    result.push(oldestSameParamsRoute);
                } else if (!oldestSameParamsRoute) {
                    reportCount++;
                    result.push(route);
                }
            }
        } else if (route.name === NAVIGATORS.CENTRAL_PANE_NAVIGATOR && route.params && 'screen' in route.params && 'params' in route.params && route.params.screen !== SCREENS.REPORT) {
            if (nonReportCentralPaneCount < 3) {
                nonReportCentralPaneCount++;
                result.push(route);
            }
        } else {
            result.push(route);
        }
    });

    return result.reverse();
}

function ResponsiveStackNavigator(props: ResponsiveStackNavigatorProps) {
    const {isSmallScreenWidth} = useWindowDimensions();

    const {navigation, state, descriptors, NavigationContent} = useNavigationBuilder<
        StackNavigationState<ParamListBase>,
        ResponsiveStackNavigatorRouterOptions,
        StackActionHelpers<ParamListBase>,
        StackNavigationOptions,
        StackNavigationEventMap
    >(CustomRouter, {
        children: props.children,
        screenOptions: props.screenOptions,
        initialRouteName: props.initialRouteName,
    });

    useEffect(() => {
        if (!navigationRef.isReady()) {
            return;
        }
        navigationRef.resetRoot(navigationRef.getRootState());
    }, [isSmallScreenWidth]);

    const stateToRender = useMemo(() => {
        const routesToRender = reduceAndRecycleRoutes(state.routes);

        console.log(routesToRender);

        return {
            ...state,
            index: routesToRender.length - 1,
            routes: [...routesToRender],
        };
    }, [state]);

    return (
        <NavigationContent>
            <StackView
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...props}
                state={stateToRender}
                descriptors={descriptors}
                navigation={navigation}
            />
        </NavigationContent>
    );
}

ResponsiveStackNavigator.displayName = 'ResponsiveStackNavigator';

export default createNavigatorFactory<StackNavigationState<ParamListBase>, StackNavigationOptions, StackNavigationEventMap, typeof ResponsiveStackNavigator>(ResponsiveStackNavigator);
