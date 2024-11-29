import type {CommonActions, RouterConfigOptions, StackActionType, StackNavigationState} from '@react-navigation/native';
import {findFocusedRoute, StackRouter} from '@react-navigation/native';
import type {ParamListBase} from '@react-navigation/routers';
import * as Localize from '@libs/Localize';
import syncBrowserHistory from '@libs/Navigation/AppNavigator/createCustomStackNavigator/syncBrowserHistory';
import {isOnboardingFlowName} from '@libs/Navigation/helpers';
import type {PlatformStackRouterOptions} from '@libs/Navigation/PlatformStackNavigation/types';
import type {RootStackParamList} from '@libs/Navigation/types';
import * as Welcome from '@userActions/Welcome';
import CONST from '@src/CONST';

function shouldPreventReset(state: StackNavigationState<ParamListBase>, action: CommonActions.Action | StackActionType) {
    if (action.type !== CONST.NAVIGATION_ACTIONS.RESET || !action?.payload) {
        return false;
    }
    const currentFocusedRoute = findFocusedRoute(state);
    const targetFocusedRoute = findFocusedRoute(action?.payload);

    // We want to prevent the user from navigating back to a non-onboarding screen if they are currently on an onboarding screen
    if (isOnboardingFlowName(currentFocusedRoute?.name) && !isOnboardingFlowName(targetFocusedRoute?.name)) {
        Welcome.setOnboardingErrorMessage(Localize.translateLocal('onboarding.purpose.errorBackButton'));
        return true;
    }

    return false;
}

function CustomRouter(options: PlatformStackRouterOptions) {
    const stackRouter = StackRouter(options);

    return {
        ...stackRouter,
        getRehydratedState(partialState: StackNavigationState<RootStackParamList>, {routeNames, routeParamList, routeGetIdList}: RouterConfigOptions): StackNavigationState<ParamListBase> {
            // compareAndAdaptState(partialState);
            const state = stackRouter.getRehydratedState(partialState, {routeNames, routeParamList, routeGetIdList});
            return state;
        },
        getStateForAction(state: StackNavigationState<ParamListBase>, action: CommonActions.Action | StackActionType, configOptions: RouterConfigOptions) {
            if (shouldPreventReset(state, action)) {
                syncBrowserHistory(state);
                return state;
            }
            return stackRouter.getStateForAction(state, action, configOptions);
        },
    };
}

export default CustomRouter;
