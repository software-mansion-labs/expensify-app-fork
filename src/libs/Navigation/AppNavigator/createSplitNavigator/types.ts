import type {DefaultNavigatorOptions, DefaultRouterOptions, ParamListBase, StackNavigationState} from '@react-navigation/native';
import type {StackNavigationEventMap, StackNavigationOptions} from '@react-navigation/stack';

type SplitNavigatorRouterOptions<RouteName extends string = string> = DefaultRouterOptions<RouteName> & {
    initialCentralPaneScreen: RouteName;
    sidebarScreen: RouteName;
};

type SplitNavigatorProps = DefaultNavigatorOptions<ParamListBase, StackNavigationState<ParamListBase>, StackNavigationOptions, StackNavigationEventMap> & {
    initialCentralPaneScreen: keyof ParamListBase;
    sidebarScreen: keyof ParamListBase;
};

export type {SplitNavigatorProps, SplitNavigatorRouterOptions};
