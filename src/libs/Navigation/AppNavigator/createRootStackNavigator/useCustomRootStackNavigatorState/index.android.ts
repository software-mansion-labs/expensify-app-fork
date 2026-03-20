import {isFullScreenName} from '@libs/Navigation/helpers/isNavigatorName';
import type {CustomStateHookProps} from '@libs/Navigation/PlatformStackNavigation/types';
import NAVIGATORS from '@src/NAVIGATORS';

// This is an optimization to keep mounted only last few screens in the stack.
export default function useCustomRootStackNavigatorState({state}: CustomStateHookProps) {
    const lastSplitIndex = state.routes.findLastIndex((route) => isFullScreenName(route.name));
    let indexToSlice = Math.max(0, lastSplitIndex);
    const hasPrevRoute = lastSplitIndex > 0;
    const isPrevFullScreen = isFullScreenName(state.routes.at(lastSplitIndex - 1)?.name);

    // If the route before the last full screen is e.g. RHP, we should leave it in the rendered routes,
    // as there may be display issues (blank screen) when navigating back and recreating that route to render.
    if (hasPrevRoute && !isPrevFullScreen) {
        indexToSlice = lastSplitIndex - 1;
    }
    let routesToRender = state.routes.slice(indexToSlice, state.routes.length);

    // Always include the base ROOT_TAB_NAVIGATOR (first route) in rendered routes.
    // This ensures dontDetachScreen (from persistentScreens) keeps it mounted,
    // preserving the bottom tab navigator's internal state (active tab, history)
    // when another fullscreen route is pushed on top.
    const firstRoute = state.routes[0];
    if (firstRoute?.name === NAVIGATORS.ROOT_TAB_NAVIGATOR && indexToSlice > 0) {
        routesToRender = [firstRoute, ...routesToRender];
    }

    // When more than 2 ROOT_TAB_NAVIGATORs are rendered, keep only the first
    // (persistent base, alive via dontDetachScreen) and the last (active).
    // Filter out intermediate instances to avoid performance overhead.
    const rootTabCount = routesToRender.filter((route) => route.name === NAVIGATORS.ROOT_TAB_NAVIGATOR).length;
    if (rootTabCount > 2) {
        const firstRootTabIdx = routesToRender.findIndex((route) => route.name === NAVIGATORS.ROOT_TAB_NAVIGATOR);
        const lastRootTabIdx = routesToRender.findLastIndex((route) => route.name === NAVIGATORS.ROOT_TAB_NAVIGATOR);
        routesToRender = routesToRender.filter((route, i) => route.name !== NAVIGATORS.ROOT_TAB_NAVIGATOR || i === firstRootTabIdx || i === lastRootTabIdx);
    }

    return {...state, routes: routesToRender, index: routesToRender.length - 1};
}
