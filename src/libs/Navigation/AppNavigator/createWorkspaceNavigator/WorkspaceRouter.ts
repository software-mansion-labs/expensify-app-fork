import type {ParamListBase, PartialState, RouterConfigOptions, StackNavigationState} from '@react-navigation/native';
import {StackRouter} from '@react-navigation/native';
import {getPreservedNavigatorState} from '@navigation/AppNavigator/createSplitNavigator/usePreserveNavigatorState';
import SCREENS from '@src/SCREENS';
import type WorkspaceNavigatorRouterOptions from './types';

type WorkspaceState = StackNavigationState<ParamListBase> | PartialState<StackNavigationState<ParamListBase>>;

/**
 * `WORKSPACES_LIST` is the entry/sidebar screen of `WorkspaceNavigator`; the split navigators (Workspace/Domain) are
 * always pushed on top of it. When state is rebuilt from a deep link straight into a split (e.g. cold-start on
 * /workspaces/<id>/members/invite, or in-app `linkTo` of the same), `WORKSPACES_LIST` can be missing — leaving back
 * navigation with nowhere to go once the split is popped. Re-prepend it so the back stack matches normal navigation.
 */
function prependWorkspacesListIfMissing(state: WorkspaceState): WorkspaceState {
    if (!state.routes.length || state.routes.at(0)?.name === SCREENS.WORKSPACES_LIST) {
        return state;
    }
    const routes = [{name: SCREENS.WORKSPACES_LIST}, ...state.routes];
    return {...state, routes, index: routes.length - 1, stale: true} as WorkspaceState;
}

function WorkspaceRouter(options: WorkspaceNavigatorRouterOptions) {
    const stackRouter = StackRouter(options);

    const rehydrate = (state: WorkspaceState, configOptions: RouterConfigOptions) => stackRouter.getRehydratedState(prependWorkspacesListIfMissing(state), configOptions);

    return {
        ...stackRouter,
        getInitialState(configOptions: RouterConfigOptions) {
            const initialState = getPreservedNavigatorState(options.parentRoute.key) ?? stackRouter.getInitialState(configOptions);
            return rehydrate(initialState, configOptions);
        },
        getRehydratedState: rehydrate,
    };
}

export default WorkspaceRouter;
