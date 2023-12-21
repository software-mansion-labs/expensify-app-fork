import {getPathFromState, RouterConfigOptions, StackNavigationState, StackRouter} from '@react-navigation/native';
import {ParamListBase} from '@react-navigation/routers';
import {partial} from 'underscore';
import getIsSmallScreenWidth from '@libs/getIsSmallScreenWidth';
import getAdaptedStateFromPath from '@libs/Navigation/getAdaptedStateFromPath';
import getTopmostBottomTabRoute from '@libs/Navigation/getTopmostBottomTabRoute';
import getTopmostCentralPaneRoute from '@libs/Navigation/getTopmostCentralPaneRoute';
import linkingConfig from '@libs/Navigation/linkingConfig';
import {NavigationPartialRoute, RootStackParamList, State} from '@libs/Navigation/types';
import NAVIGATORS from '@src/NAVIGATORS';
import type {ResponsiveStackNavigatorRouterOptions} from './types';

function insertRootRoute(state: State<RootStackParamList>, routeToInsert: NavigationPartialRoute) {
    const nonModalRoutes = state.routes.filter((route) => route.name !== NAVIGATORS.RIGHT_MODAL_NAVIGATOR && route.name !== NAVIGATORS.LEFT_MODAL_NAVIGATOR);
    const modalRoutes = state.routes.filter((route) => route.name === NAVIGATORS.RIGHT_MODAL_NAVIGATOR || route.name === NAVIGATORS.LEFT_MODAL_NAVIGATOR);

    // @ts-expect-error Updating read only property
    // noinspection JSConstantReassignment
    state.routes = [...nonModalRoutes, routeToInsert, ...modalRoutes]; // eslint-disable-line

    // @ts-expect-error Updating read only property
    // noinspection JSConstantReassignment
    state.index = state.routes.length - 1; // eslint-disable-line

    // @ts-expect-error Updating read only property
    // noinspection JSConstantReassignment
    state.stale = true; // eslint-disable-line
}

function compareAndAdaptState(state: StackNavigationState<RootStackParamList>) {
    // If the state of the last path is not defined the getPathFromState won't work correctly.
    if (!state?.routes.at(-1)?.state) {
        return;
    }

    // We need to be sure that the bottom tab state is defined.
    const topmostBottomTabRoute = getTopmostBottomTabRoute(state);
    const isSmallScreenWidth = getIsSmallScreenWidth();

    // This solutions is heurestis and will work for our cases. We may need to improve it in the future if we will have more cases to handle.
    if (topmostBottomTabRoute && !isSmallScreenWidth) {
        const fullScreenRoute = state.routes.find((route) => route.name === NAVIGATORS.FULL_SCREEN_NAVIGATOR);

        // If there is fullScreenRoute we don't need to add anything.
        if (fullScreenRoute) {
            return;
        }

        const pathFromCurrentState = getPathFromState(state, linkingConfig.config);

        console.log('pathFromCurrentState', pathFromCurrentState);

        const templateState = getAdaptedStateFromPath(pathFromCurrentState, linkingConfig.config);

        if (!templateState) {
            return;
        }

        const templateFullScreenRoute = templateState.routes.find((route) => route.name === NAVIGATORS.FULL_SCREEN_NAVIGATOR);

        // If templateFullScreenRoute is defined, and full screen route is not in the state, we need to add it.
        if (templateFullScreenRoute) {
            insertRootRoute(state, templateFullScreenRoute);
            return;
        }

        const topmostCentralPaneRoute = state.routes.filter((route) => route.name === NAVIGATORS.CENTRAL_PANE_NAVIGATOR).at(-1);
        const templateCentralPaneRoute = templateState.routes.find((route) => route.name === NAVIGATORS.CENTRAL_PANE_NAVIGATOR);

        const topmostCentralPaneRouteExtracted = getTopmostCentralPaneRoute(state);
        const templateCentralPaneRouteExtracted = getTopmostCentralPaneRoute(templateState as State<RootStackParamList>);

        // If there is no template central pane route, we don't have anything to add.
        if (!templateCentralPaneRoute) {
            return;
        }

        // If there is no cenetral pane route in state and template state has one, we need to add it.
        if (!topmostCentralPaneRoute) {
            insertRootRoute(state, templateCentralPaneRoute);
            return;
        }

        // If there is central pane route in state and template state has one, we need to check if they are the same.
        if (topmostCentralPaneRouteExtracted && templateCentralPaneRouteExtracted && topmostCentralPaneRouteExtracted.name !== templateCentralPaneRouteExtracted.name) {
            insertRootRoute(state, templateCentralPaneRoute);
        }
    }
}

function CustomRouter(options: ResponsiveStackNavigatorRouterOptions) {
    const stackRouter = StackRouter(options);

    return {
        ...stackRouter,
        getRehydratedState(partialState: StackNavigationState<RootStackParamList>, {routeNames, routeParamList, routeGetIdList}: RouterConfigOptions): StackNavigationState<ParamListBase> {
            compareAndAdaptState(partialState);
            const state = stackRouter.getRehydratedState(partialState, {routeNames, routeParamList, routeGetIdList});
            return state;
        },
    };
}

export default CustomRouter;
