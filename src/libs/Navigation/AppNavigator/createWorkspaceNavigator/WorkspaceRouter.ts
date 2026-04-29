import type {ParamListBase, PartialState, RouterConfigOptions, StackNavigationState} from '@react-navigation/native';
import {StackRouter} from '@react-navigation/native';
import {getPreservedNavigatorState} from '@navigation/AppNavigator/createSplitNavigator/usePreserveNavigatorState';
import type WorkspaceNavigatorRouterOptions from './types';

function WorkspaceRouter(options: WorkspaceNavigatorRouterOptions) {
    const stackRouter = StackRouter(options);

    return {
        ...stackRouter,
        getInitialState({routeNames, routeParamList, routeGetIdList}: RouterConfigOptions) {
            const preservedState = getPreservedNavigatorState(options.parentRoute.key) as StackNavigationState<ParamListBase> | undefined;
            return preservedState ?? stackRouter.getInitialState({routeNames, routeParamList, routeGetIdList});
        },
        getRehydratedState(partialState: PartialState<StackNavigationState<ParamListBase>>, configOptions: RouterConfigOptions) {
            const preservedState = getPreservedNavigatorState(options.parentRoute.key) as StackNavigationState<ParamListBase> | undefined;
            return stackRouter.getRehydratedState(preservedState ?? partialState, configOptions);
        },
    };
}

export default WorkspaceRouter;
