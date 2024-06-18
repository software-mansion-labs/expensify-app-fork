import type {DefaultNavigatorOptions, DefaultRouterOptions, ParamListBase, StackNavigationState} from '@react-navigation/native';
import type {StackNavigationEventMap, StackNavigationOptions} from '@react-navigation/stack';

type SplitNavigatorRouterOptions<RouteName extends string = string> = DefaultRouterOptions<RouteName> & {
    initialCentralPaneScreen: RouteName;
    sidebarScreen: RouteName;
};

type SplitNavigatorProps<ParamList extends ParamListBase> = DefaultNavigatorOptions<ParamListBase, StackNavigationState<ParamListBase>, StackNavigationOptions, StackNavigationEventMap> & {
    initialCentralPaneScreen: Extract<keyof ParamList, string>;
    sidebarScreen: Extract<keyof ParamList, string>;
};

export type {SplitNavigatorProps, SplitNavigatorRouterOptions};
