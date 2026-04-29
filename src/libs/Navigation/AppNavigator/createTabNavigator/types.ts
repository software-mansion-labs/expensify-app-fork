import type {ParamListBase, RouteProp, TabRouterOptions} from '@react-navigation/native';

type TabNavigatorRouterOptions = TabRouterOptions & {parentRoute: RouteProp<ParamListBase>};

export default TabNavigatorRouterOptions;
