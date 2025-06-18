import type {NavigationProp} from '@react-navigation/native';
import {findFocusedRoute, useFocusEffect} from '@react-navigation/native';
import {useCallback} from 'react';
import NAVIGATION_TABS from '@components/Navigation/NavigationTabBar/NAVIGATION_TABS';
import getIsNarrowLayout from '@libs/getIsNarrowLayout';
import {getSettingsTabStateFromSessionStorage} from '@libs/Navigation/helpers/lastVisitedTabPathUtils';
import {TAB_TO_FULLSCREEN} from '@libs/Navigation/linkingConfig/RELATIONS';
import type {RootNavigatorParamList, SearchFullscreenNavigatorParamList} from '@libs/Navigation/types';
import {buildCannedSearchQuery, buildSearchQueryJSON, buildSearchQueryString} from '@libs/SearchQueryUtils';
import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';
import {getPreservedNavigatorState} from './createSplitNavigator/usePreserveNavigatorState';

/**
 * Hook that preloads all fullscreen navigators except the current one.
 * This helps improve performance by preloading navigators that might be needed soon.
 */
function usePreloadFullScreenNavigators(navigation: NavigationProp<RootNavigatorParamList>, fullscreenTabName: keyof typeof NAVIGATION_TABS) {
    const state = navigation.getState();
    const {preloadedRoutes} = state;

    useFocusEffect(
        useCallback(() => {
            setTimeout(() => {
                Object.values(NAVIGATION_TABS)
                    .filter((tabName) => tabName !== fullscreenTabName && !preloadedRoutes.some((preloadedRoute) => TAB_TO_FULLSCREEN[tabName].includes(preloadedRoute.name)))
                    .forEach((tabName) => {
                        if (tabName === NAVIGATION_TABS.WORKSPACES) {
                            const lastWorkspacesSplitNavigator = state.routes.findLast((route) => route.name === NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR);

                            if (!lastWorkspacesSplitNavigator) {
                                navigation.preload(SCREENS.WORKSPACES_LIST);
                                return;
                            }

                            const focusedWorkspaceRoute = findFocusedRoute(lastWorkspacesSplitNavigator.state);

                            if (!getIsNarrowLayout()) {
                                navigation.preload(NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR, {screen: SCREENS.WORKSPACE.INITIAL, params: focusedWorkspaceRoute?.params});
                                return;
                            }

                            navigation.preload(NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR, {screen: focusedWorkspaceRoute.name, params: focusedWorkspaceRoute?.params});
                            return;
                        }

                        if (tabName === NAVIGATION_TABS.SETTINGS) {
                            if (!getIsNarrowLayout()) {
                                const settingsTabState = getSettingsTabStateFromSessionStorage();
                                navigation.preload(NAVIGATORS.SETTINGS_SPLIT_NAVIGATOR, {screen: settingsTabState ? findFocusedRoute(settingsTabState)?.name : SCREENS.SETTINGS.PROFILE});
                                return;
                            }
                            navigation.preload(NAVIGATORS.SETTINGS_SPLIT_NAVIGATOR);
                            return;
                        }

                        if (tabName === NAVIGATION_TABS.SEARCH) {
                            const lastSearchNavigator = state.routes.findLast((route) => route.name === NAVIGATORS.SEARCH_FULLSCREEN_NAVIGATOR);
                            const lastSearchNavigatorState = lastSearchNavigator && lastSearchNavigator.key ? getPreservedNavigatorState(lastSearchNavigator?.key) : undefined;
                            const lastSearchRoute = lastSearchNavigatorState?.routes.findLast((route) => route.name === SCREENS.SEARCH.ROOT);

                            if (lastSearchRoute) {
                                const {q, ...rest} = lastSearchRoute.params as SearchFullscreenNavigatorParamList[typeof SCREENS.SEARCH.ROOT];
                                const queryJSON = buildSearchQueryJSON(q);
                                if (queryJSON) {
                                    const query = buildSearchQueryString(queryJSON);
                                    navigation.preload(NAVIGATORS.SEARCH_FULLSCREEN_NAVIGATOR, {screen: SCREENS.SEARCH.ROOT, params: {q: query, ...rest}});
                                    return;
                                }
                            }

                            navigation.preload(NAVIGATORS.SEARCH_FULLSCREEN_NAVIGATOR, {screen: SCREENS.SEARCH.ROOT, params: {q: buildCannedSearchQuery()}});
                            return;
                        }

                        navigation.preload(NAVIGATORS.REPORTS_SPLIT_NAVIGATOR, {screen: SCREENS.REPORT});
                    });
            }, 1000);
        }, [fullscreenTabName, preloadedRoutes]),
    );
}

export default usePreloadFullScreenNavigators;
