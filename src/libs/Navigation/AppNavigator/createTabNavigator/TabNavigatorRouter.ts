import type {ParamListBase, PartialState, RouterConfigOptions, TabNavigationState} from '@react-navigation/native';
import {TabRouter} from '@react-navigation/native';
import {getPreservedNavigatorState} from '@navigation/AppNavigator/createSplitNavigator/usePreserveNavigatorState';
import type TabNavigatorRouterOptions from './types';

function TabNavigatorRouter(options: TabNavigatorRouterOptions) {
    const tabRouter = TabRouter(options);
    return {
        ...tabRouter,
        getRehydratedState(partialState: PartialState<TabNavigationState<ParamListBase>>, configOptions: RouterConfigOptions) {
            const preservedState = getPreservedNavigatorState(options.parentRoute.key) as TabNavigationState<ParamListBase> | undefined;
            return tabRouter.getRehydratedState(preservedState ?? partialState, configOptions);
        },
    };
}

export default TabNavigatorRouter;
