import {findFocusedRoute} from '@react-navigation/native';
import NAVIGATION_TABS from '@components/Navigation/NavigationTabBar/NAVIGATION_TABS';
import getIsNarrowLayout from '@libs/getIsNarrowLayout';
import {getSettingsTabStateFromSessionStorage} from '@libs/Navigation/helpers/lastVisitedTabPathUtils';
import {TAB_TO_FULLSCREEN} from '@libs/Navigation/linkingConfig/RELATIONS';
import {navigationRef} from '@libs/Navigation/Navigation';
import type {FullScreenName, SearchFullscreenNavigatorParamList} from '@libs/Navigation/types';
import Performance from '@libs/Performance';
import {buildCannedSearchQuery, buildSearchQueryJSON, buildSearchQueryString} from '@libs/SearchQueryUtils';
import CONST from '@src/CONST';
import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';
import {getPreservedNavigatorState} from './createSplitNavigator/usePreserveNavigatorState';

/**
 * Function that preloads all fullscreen navigators except the current one.
 * This helps improve performance by preloading navigators that might be needed soon.
 * This is a plain function version of the hook, without any React hooks.
 */
function preloadFullScreenNavigators(fullscreenTabName: keyof typeof NAVIGATION_TABS) {
    const state = navigationRef.getRootState();
    // preloadedRoutes is not typed on the navigation state, so we fallback to an empty array if it doesn't exist
    const preloadedRoutes = (state as {preloadedRoutes?: Array<{name: string}>}).preloadedRoutes ?? [];
    Performance.markStart('PRELOAD');
    console.time('PRELOAD');
    Object.values(NAVIGATION_TABS)
        .filter((tabName) => tabName !== fullscreenTabName && !preloadedRoutes.some((preloadedRoute) => TAB_TO_FULLSCREEN[tabName].includes(preloadedRoute.name as FullScreenName)))
        .forEach((tabName) => {
            if (tabName === NAVIGATION_TABS.WORKSPACES) {
                const lastWorkspacesSplitNavigator = state.routes.findLast((route: {name: string}) => route.name === NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR);

                if (!lastWorkspacesSplitNavigator) {
                    console.time('PRELOAD_WORKSPACES_LIST');
                    navigationRef.current?.dispatch({
                        type: CONST.NAVIGATION.ACTION_TYPE.PRELOAD,
                        payload: {name: SCREENS.WORKSPACES_LIST, params: {}},
                        target: state.key,
                    });
                    return;
                }

                const focusedWorkspaceRoute = findFocusedRoute(lastWorkspacesSplitNavigator.state ?? {routes: []});

                if (!getIsNarrowLayout()) {
                    navigationRef.current?.dispatch({
                        type: CONST.NAVIGATION.ACTION_TYPE.PRELOAD,
                        payload: {name: NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR, params: {screen: SCREENS.WORKSPACE.INITIAL, params: focusedWorkspaceRoute?.params}},
                        target: state.key,
                    });
                    return;
                }

                navigationRef.current?.dispatch({
                    type: CONST.NAVIGATION.ACTION_TYPE.PRELOAD,
                    payload: {name: NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR, params: {screen: focusedWorkspaceRoute?.name, params: focusedWorkspaceRoute?.params}},
                    target: state.key,
                });
                return;
            }

            if (tabName === NAVIGATION_TABS.SETTINGS) {
                if (!getIsNarrowLayout()) {
                    const settingsTabState = getSettingsTabStateFromSessionStorage();
                    console.time('PRELOAD_ACCOUNT');
                    navigationRef.current?.dispatch({
                        type: CONST.NAVIGATION.ACTION_TYPE.PRELOAD,
                        payload: {name: NAVIGATORS.SETTINGS_SPLIT_NAVIGATOR, params: {screen: settingsTabState ? findFocusedRoute(settingsTabState)?.name : SCREENS.SETTINGS.PROFILE}},
                        target: state.key,
                    });
                    return;
                }

                navigationRef.current?.dispatch({
                    type: CONST.NAVIGATION.ACTION_TYPE.PRELOAD,
                    payload: {name: NAVIGATORS.SETTINGS_SPLIT_NAVIGATOR, params: {}},
                    target: state.key,
                });
                return;
            }

            if (tabName === NAVIGATION_TABS.SEARCH) {
                const lastSearchNavigator = state.routes.findLast((route: {name: string; key?: string}) => route.name === NAVIGATORS.SEARCH_FULLSCREEN_NAVIGATOR);
                const lastSearchNavigatorState = lastSearchNavigator && lastSearchNavigator.key ? getPreservedNavigatorState(lastSearchNavigator.key) : undefined;
                const lastSearchRoute = lastSearchNavigatorState?.routes.findLast((route) => (route as {name: string}).name === SCREENS.SEARCH.ROOT) as
                    | {name: string; params?: Record<string, unknown>}
                    | undefined;

                if (lastSearchRoute) {
                    const {q, ...rest} = lastSearchRoute.params as SearchFullscreenNavigatorParamList[typeof SCREENS.SEARCH.ROOT];
                    const queryJSON = buildSearchQueryJSON(q);
                    if (queryJSON) {
                        const query = buildSearchQueryString(queryJSON);
                        navigationRef.current?.dispatch({
                            type: CONST.NAVIGATION.ACTION_TYPE.PRELOAD,
                            payload: {name: NAVIGATORS.SEARCH_FULLSCREEN_NAVIGATOR, params: {screen: SCREENS.SEARCH.ROOT, params: {q: query, ...rest}}},
                            target: state.key,
                        });
                        return;
                    }
                }
                console.time('PRELOAD_SEARCH');
                navigationRef.current?.dispatch({
                    type: CONST.NAVIGATION.ACTION_TYPE.PRELOAD,
                    payload: {name: NAVIGATORS.SEARCH_FULLSCREEN_NAVIGATOR, params: {screen: SCREENS.SEARCH.ROOT, params: {q: buildCannedSearchQuery()}}},
                    target: state.key,
                });
                return;
            }
            console.time('PRELOAD_INBOX');
            navigationRef.current?.dispatch({
                type: CONST.NAVIGATION.ACTION_TYPE.PRELOAD,
                payload: {name: NAVIGATORS.REPORTS_SPLIT_NAVIGATOR, params: {}},
                target: state.key,
            });
        });
}

export default preloadFullScreenNavigators;
