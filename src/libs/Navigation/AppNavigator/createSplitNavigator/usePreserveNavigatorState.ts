import type {NavigationState, ParamListBase, PartialState, RouteProp} from '@react-navigation/native';
import {useEffect} from 'react';
import NAVIGATORS from '@src/NAVIGATORS';

const preservedNavigatorStates: Record<string, NavigationState<ParamListBase>> = {};

const collectAllRouteKeys = (state: NavigationState | PartialState<NavigationState>, keys: Set<string>) => {
    for (const route of state.routes) {
        if (route.key) {
            keys.add(route.key);
        }
        // Prefer the live nested state; fall back to the preserved state so that keys for
        // navigators whose route.state was cleared from the root stack are not lost prematurely.
        const nestedState = route.state ?? (route.key ? preservedNavigatorStates[route.key] : undefined);
        if (nestedState) {
            collectAllRouteKeys(nestedState as NavigationState, keys);
        }
    }
};

const cleanPreservedNavigatorStates = (state: NavigationState) => {
    const currentNavigatorKeys = new Set<string>();
    collectAllRouteKeys(state, currentNavigatorKeys);

    for (const key of Object.keys(preservedNavigatorStates)) {
        if (!currentNavigatorKeys.has(key)) {
            delete preservedNavigatorStates[key];
        }
    }
};

const clearPreservedSearchNavigatorStates = () => {
    for (const key of Object.keys(preservedNavigatorStates)) {
        if (key.startsWith(NAVIGATORS.SEARCH_FULLSCREEN_NAVIGATOR)) {
            delete preservedNavigatorStates[key];
        }
    }
};

const getPreservedNavigatorState = (key: string) => preservedNavigatorStates[key];

function usePreserveNavigatorState(state: NavigationState<ParamListBase> | undefined, route: RouteProp<ParamListBase> | undefined) {
    useEffect(() => {
        if (!route || !state) {
            return;
        }
        preservedNavigatorStates[route.key] = state;
    }, [route, state]);
}

export default usePreserveNavigatorState;

export {getPreservedNavigatorState, cleanPreservedNavigatorStates, clearPreservedSearchNavigatorStates};
