import type {NavigationProp, NavigatorTypeBagBase, ParamListBase, StackNavigationState, StaticConfig, TypedNavigator} from '@react-navigation/native';
import {createNavigatorFactory} from '@react-navigation/native';
import RootNavigatorExtraContent from '@components/Navigation/RootNavigatorExtraContent';
import useNavigationResetOnLayoutChange from '@libs/Navigation/AppNavigator/useNavigationResetOnLayoutChange';
import createPlatformStackNavigatorComponent from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigatorComponent';
import defaultPlatformStackScreenOptions from '@libs/Navigation/PlatformStackNavigation/defaultPlatformStackScreenOptions';
import type {PlatformStackNavigationEventMap, PlatformStackNavigationOptions, PlatformStackNavigationState} from '@libs/Navigation/PlatformStackNavigation/types';
import RootStackRouter from './RootStackRouter';
import useCustomRootStackNavigatorState from './useCustomRootStackNavigatorState';


function transformStateForBottomTab(state: PlatformStackNavigationState<ParamListBase>) {
    if (!state.routes || state.routes.length <= 1) {
        return state;
    }

    const uniqueRoutesMap = new Map();
    const lastRoute = state.routes[state.routes.length - 1];
    const secondToLastRoute = state.routes[state.routes.length - 2];

    for (const route of state.routes) {
        uniqueRoutesMap.set(route.name, route);
    }


    const uniqueRoutes = Array.from(uniqueRoutesMap.values());


    const finalRoutes = uniqueRoutes.filter((r) => r.key !== lastRoute.key);
    finalRoutes.push(lastRoute);

    return {
        ...state,
        routes: finalRoutes,
        index: finalRoutes.length - 1,
    };
}


const RootStackNavigatorComponent = createPlatformStackNavigatorComponent('RootStackNavigator', {
    createRouter: RootStackRouter,
    defaultScreenOptions: defaultPlatformStackScreenOptions,
    useCustomEffects: useNavigationResetOnLayoutChange,
    useCustomState: (props) => {
        const result = useCustomRootStackNavigatorState(props);

        return {
            ...result,
            state: transformStateForBottomTab(result),
        };
    },
    ExtraContent: RootNavigatorExtraContent,
});

function createRootStackNavigator<
    const ParamList extends ParamListBase,
    const NavigatorID extends string | undefined = undefined,
    const TypeBag extends NavigatorTypeBagBase = {
        ParamList: ParamList;
        NavigatorID: NavigatorID;
        State: PlatformStackNavigationState<ParamList>;
        ScreenOptions: PlatformStackNavigationOptions;
        EventMap: PlatformStackNavigationEventMap;
        NavigationList: {
            [RouteName in keyof ParamList]: NavigationProp<ParamList, RouteName, NavigatorID>;
        };
        Navigator: typeof RootStackNavigatorComponent;
    },
    const Config extends StaticConfig<TypeBag> = StaticConfig<TypeBag>,
>(config?: Config): TypedNavigator<TypeBag, Config> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return createNavigatorFactory(RootStackNavigatorComponent)(config);
}

export default createRootStackNavigator;
