import type {CommonActions, ParamListBase, PartialState, RouterConfigOptions, StackActionType, StackNavigationState} from '@react-navigation/native';
import {StackRouter} from '@react-navigation/native';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import getIsSmallScreenWidth from '@libs/getIsSmallScreenWidth';
import type {SplitStackNavigatorRouterOptions} from './types';

type StackState = StackNavigationState<ParamListBase> | PartialState<StackNavigationState<ParamListBase>>;

const isAtLeastOneInState = (state: StackState, screenName: string): boolean => state.routes.some((route) => route.name === screenName);

function adaptStateIfNecessary(state: StackState, sidebarScreen: string, defaultCentralScreen: string) {
    const isSmallScreenWidth = getIsSmallScreenWidth();
    const workspaceCentralPane = state.routes.at(-1);
    // There should always be sidebarScreen screen in the state to make sure go back works properly if we deeplinkg to a subpage of settings.
    if (!isAtLeastOneInState(state, sidebarScreen)) {
        // @ts-expect-error Updating read only property
        // noinspection JSConstantReassignment
        state.stale = true; // eslint-disable-line

        // This is necessary for ts to narrow type down to PartialState.
        if (state.stale === true) {
            // Unshift the root screen to fill left pane.
            state.routes.unshift({
                name: sidebarScreen,
                params: workspaceCentralPane?.params,
            });
        }
    }

    // If the screen is wide, there should be at least two screens inside:
    // - sidebarScreen to cover left pane.
    // - defaultCentralScreen to cover central pane.
    if (!isSmallScreenWidth) {
        if (state.routes.length === 1 && state.routes[0].name === sidebarScreen) {
            // @ts-expect-error Updating read only property
            // noinspection JSConstantReassignment
            state.stale = true; // eslint-disable-line
            // Push the default settings central pane screen.
            if (state.stale === true) {
                state.routes.push({
                    name: defaultCentralScreen,
                    params: state.routes[0]?.params,
                });
            }
        }
        // eslint-disable-next-line no-param-reassign, @typescript-eslint/non-nullable-type-assertion-style
        (state.index as number) = state.routes.length - 1;
    }
}

function isPushingSidebarOnCentralPane(state: StackState, action: CommonActions.Action | StackActionType, options: SplitStackNavigatorRouterOptions) {
    if (action.type === 'PUSH' && action.payload.name === options.sidebarScreen && state.routes.length > 1) {
        return true;
    }
    return false;
}

function SplitStackRouter(options: SplitStackNavigatorRouterOptions) {
    const stackRouter = StackRouter(options);
    const {isSmallScreenWidth} = useResponsiveLayout();

    return {
        ...stackRouter,
        getStateForAction(state: StackNavigationState<ParamListBase>, action: CommonActions.Action | StackActionType, configOptions: RouterConfigOptions) {
            if (isPushingSidebarOnCentralPane(state, action, options)) {
                if (isSmallScreenWidth) {
                    // TODO: It's possible that it's better to push whole new SplitNavigator in such case. Not sure yet.
                    // Pop to top on narrow layout.
                    return {...state, routes: [state.routes.at(0)], index: 0};
                }
                // On wide screen do nothing as we want to keep the central pane screen and the sidebar is visible.
                return state;
            }
            return stackRouter.getStateForAction(state, action, configOptions);
        },
        getInitialState({routeNames, routeParamList, routeGetIdList}: RouterConfigOptions) {
            const initialState = stackRouter.getInitialState({routeNames, routeParamList, routeGetIdList});
            adaptStateIfNecessary(initialState, options.sidebarScreen, options.defaultCentralScreen);

            // If we needed to modify the state we need to rehydrate it to get keys for new routes.
            if (initialState.stale) {
                return stackRouter.getRehydratedState(initialState, {routeNames, routeParamList, routeGetIdList});
            }

            return initialState;
        },
        getRehydratedState(partialState: StackState, {routeNames, routeParamList, routeGetIdList}: RouterConfigOptions): StackNavigationState<ParamListBase> {
            adaptStateIfNecessary(partialState, options.sidebarScreen, options.defaultCentralScreen);
            const state = stackRouter.getRehydratedState(partialState, {routeNames, routeParamList, routeGetIdList});
            return state;
        },
    };
}

export default SplitStackRouter;
