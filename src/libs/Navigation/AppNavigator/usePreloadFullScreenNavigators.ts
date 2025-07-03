import {findFocusedRoute, useFocusEffect} from '@react-navigation/native';
import {useCallback} from 'react';
import NAVIGATION_TABS from '@components/Navigation/NavigationTabBar/NAVIGATION_TABS';
import {isAnonymousUser} from '@libs/actions/Session';
import getIsNarrowLayout from '@libs/getIsNarrowLayout';
import {getSettingsTabStateFromSessionStorage} from '@libs/Navigation/helpers/lastVisitedTabPathUtils';
import {TAB_TO_FULLSCREEN} from '@libs/Navigation/linkingConfig/RELATIONS';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackNavigationProp} from '@libs/Navigation/PlatformStackNavigation/types';
import type {AuthScreensParamList, FullScreenName, SearchFullscreenNavigatorParamList, SettingsSplitNavigatorParamList, WorkspaceSplitNavigatorParamList} from '@libs/Navigation/types';
import {buildCannedSearchQuery, buildSearchQueryJSON, buildSearchQueryString} from '@libs/SearchQueryUtils';
import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';
import {getPreservedNavigatorState} from './createSplitNavigator/usePreserveNavigatorState';

function preloadWorkspacesTab(navigation: PlatformStackNavigationProp<AuthScreensParamList>) {
    const lastWorkspacesSplitNavigator = navigation.getState().routes.findLast((route) => route.name === NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR);

    if (!lastWorkspacesSplitNavigator) {
        navigation.preload(SCREENS.WORKSPACES_LIST, {});
        return;
    }

    if (!lastWorkspacesSplitNavigator?.state) {
        return;
    }

    const focusedWorkspaceRoute = findFocusedRoute(lastWorkspacesSplitNavigator.state);

    if (!focusedWorkspaceRoute || !focusedWorkspaceRoute?.params) {
        return;
    }

    if (getIsNarrowLayout()) {
        navigation.preload(NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR, {
            screen: SCREENS.WORKSPACE.INITIAL,
            params: focusedWorkspaceRoute.params as WorkspaceSplitNavigatorParamList[typeof SCREENS.WORKSPACE.INITIAL],
        });
        return;
    }

    navigation.preload(NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR, {
        screen: focusedWorkspaceRoute.name,
        params: focusedWorkspaceRoute?.params as {policyID: string},
    });
}

function preloadReportsTab(navigation: PlatformStackNavigationProp<AuthScreensParamList>) {
    const lastSearchNavigator = navigation.getState().routes.findLast((route) => route.name === NAVIGATORS.SEARCH_FULLSCREEN_NAVIGATOR);
    const lastSearchNavigatorState = lastSearchNavigator && lastSearchNavigator.key ? getPreservedNavigatorState(lastSearchNavigator?.key) : undefined;
    const lastSearchRoute = lastSearchNavigatorState?.routes.findLast((route) => route.name === SCREENS.SEARCH.ROOT);

    if (lastSearchRoute) {
        const {q, ...rest} = lastSearchRoute.params as SearchFullscreenNavigatorParamList[typeof SCREENS.SEARCH.ROOT];
        const queryJSON = buildSearchQueryJSON(q);
        if (queryJSON) {
            const query = buildSearchQueryString(queryJSON);
            navigation.preload(NAVIGATORS.SEARCH_FULLSCREEN_NAVIGATOR, {screen: SCREENS.SEARCH.ROOT, params: {q: query, ...rest}});
        }
    }

    navigation.preload(NAVIGATORS.SEARCH_FULLSCREEN_NAVIGATOR, {screen: SCREENS.SEARCH.ROOT, params: {q: buildCannedSearchQuery()}});
}

function preloadAccountTab(navigation: PlatformStackNavigationProp<AuthScreensParamList>) {
    if (!getIsNarrowLayout()) {
        const settingsTabState = getSettingsTabStateFromSessionStorage();
        navigation.preload(NAVIGATORS.SETTINGS_SPLIT_NAVIGATOR, {
            screen: settingsTabState ? (findFocusedRoute(settingsTabState)?.name as keyof SettingsSplitNavigatorParamList) : SCREENS.SETTINGS.PROFILE,
        });
        return;
    }
    navigation.preload(NAVIGATORS.SETTINGS_SPLIT_NAVIGATOR, {screen: SCREENS.SETTINGS.ROOT});
}

function preloadInboxTab(navigation: PlatformStackNavigationProp<AuthScreensParamList>) {
    const payload = getIsNarrowLayout() ? {screen: SCREENS.HOME} : {screen: SCREENS.REPORT, params: {reportID: ''}};
    navigation.preload(NAVIGATORS.REPORTS_SPLIT_NAVIGATOR, payload);
}

/**
 * Hook that preloads all fullscreen navigators except the current one.
 * This helps improve performance by preloading navigators that might be needed soon.
 */
function usePreloadFullScreenNavigators(navigation: PlatformStackNavigationProp<AuthScreensParamList>, fullscreenTabName: keyof typeof NAVIGATION_TABS) {
    const state = navigation.getState();
    const {preloadedRoutes} = state;

    useFocusEffect(
        useCallback(() => {
            if (isAnonymousUser()) {
                return;
            }

            Navigation.setNavigationActionToMicrotaskQueue(() => {
                Object.values(NAVIGATION_TABS)
                    .filter((tabName) => {
                        const isCurrentTab = tabName === fullscreenTabName;
                        const isRouteAlreadyPreloaded = !preloadedRoutes.some((preloadedRoute) => TAB_TO_FULLSCREEN[fullscreenTabName].includes(preloadedRoute.name as FullScreenName));
                        return !isCurrentTab && isRouteAlreadyPreloaded;
                    })
                    .forEach((tabName) => {
                        switch (tabName) {
                            case NAVIGATION_TABS.WORKSPACES:
                                preloadWorkspacesTab(navigation);
                                return;
                            case NAVIGATION_TABS.SEARCH:
                                preloadReportsTab(navigation);
                                return;
                            case NAVIGATION_TABS.SETTINGS:
                                preloadAccountTab(navigation);
                                return;
                            case NAVIGATION_TABS.HOME:
                                preloadInboxTab(navigation);
                                return;
                            default:
                                return undefined;
                        }
                    });
            });
        }, [fullscreenTabName, navigation, preloadedRoutes]),
    );
}

export default usePreloadFullScreenNavigators;
