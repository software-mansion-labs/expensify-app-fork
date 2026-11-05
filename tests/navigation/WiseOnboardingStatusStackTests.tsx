import {act, render} from '@testing-library/react-native';

import useResponsiveLayout from '@hooks/useResponsiveLayout';

import getIsNarrowLayout from '@libs/getIsNarrowLayout';
import createRootStackNavigator from '@libs/Navigation/AppNavigator/createRootStackNavigator';
import createSplitNavigator from '@libs/Navigation/AppNavigator/createSplitNavigator';
import createDynamicRoute from '@libs/Navigation/helpers/dynamicRoutesUtils/createDynamicRoute';
import getPathFromState from '@libs/Navigation/helpers/getPathFromState';
import replaceWiseIntroWithOnboardingStatus from '@libs/Navigation/helpers/replaceWiseIntroWithOnboardingStatus';
import Navigation from '@libs/Navigation/Navigation';
import navigationRef from '@libs/Navigation/navigationRef';
import type {AuthScreensParamList, RightModalNavigatorParamList, SettingsNavigatorParamList, SettingsSplitNavigatorParamList, TabNavigatorParamList} from '@libs/Navigation/types';

import createPlatformStackNavigator from '@navigation/PlatformStackNavigation/createPlatformStackNavigator';

import CONST from '@src/CONST';
import NAVIGATORS from '@src/NAVIGATORS';
import ROUTES, {DYNAMIC_ROUTES} from '@src/ROUTES';
import SCREENS from '@src/SCREENS';

import type {InitialState} from '@react-navigation/native';

import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {NavigationContainer} from '@react-navigation/native';
import React from 'react';

jest.mock('@hooks/useResponsiveLayout', () => jest.fn());
jest.mock('@libs/getIsNarrowLayout', () => jest.fn());

const BANK_ACCOUNT_ID = 1;
const INTRO_PATH = createDynamicRoute(DYNAMIC_ROUTES.WISE_GLOBAL_REIMBURSEMENTS_INTRO.getRoute(BANK_ACCOUNT_ID), ROUTES.SETTINGS_WALLET);
const STATUS_URL = `/${createDynamicRoute(DYNAMIC_ROUTES.WISE_ONBOARDING_STATUS.getRoute(BANK_ACCOUNT_ID), ROUTES.SETTINGS_WALLET)}`;

const RootStack = createRootStackNavigator<AuthScreensParamList>();
const TabNav = createBottomTabNavigator<TabNavigatorParamList>();
const SettingsSplit = createSplitNavigator<SettingsSplitNavigatorParamList>();
const RightModalNavigatorStack = createSplitNavigator<RightModalNavigatorParamList>();
const SettingsModalStack = createPlatformStackNavigator<SettingsNavigatorParamList>();

function EmptyScreen() {
    return null;
}

const WISE_FLOW_SCREENS = [
    SCREENS.SETTINGS.WALLET.DYNAMIC_WISE_GLOBAL_REIMBURSEMENTS_INTRO,
    SCREENS.SETTINGS.WALLET.DYNAMIC_WISE_BUSINESS_ONBOARDING,
    SCREENS.SETTINGS.WALLET.DYNAMIC_WISE_ACCEPT_TERMS,
    SCREENS.SETTINGS.WALLET.DYNAMIC_WISE_ONBOARDING_STATUS,
] as const;

function TestSettingsModalStackNavigator() {
    return (
        <SettingsModalStack.Navigator>
            {WISE_FLOW_SCREENS.map((name) => (
                <SettingsModalStack.Screen
                    key={name}
                    name={name}
                    component={EmptyScreen}
                />
            ))}
        </SettingsModalStack.Navigator>
    );
}

function TestRightModalNavigator() {
    return (
        <RightModalNavigatorStack.Navigator
            defaultCentralScreen={SCREENS.RIGHT_MODAL.SETTINGS}
            parentRoute={CONST.NAVIGATION_TESTS.DEFAULT_PARENT_ROUTE}
        >
            <RightModalNavigatorStack.Screen
                name={SCREENS.RIGHT_MODAL.SETTINGS}
                component={TestSettingsModalStackNavigator}
            />
        </RightModalNavigatorStack.Navigator>
    );
}

function TestSettingsSplitNavigator() {
    return (
        <SettingsSplit.Navigator
            sidebarScreen={SCREENS.SETTINGS.ROOT}
            defaultCentralScreen={SCREENS.SETTINGS.WALLET.ROOT}
            parentRoute={CONST.NAVIGATION_TESTS.DEFAULT_PARENT_ROUTE}
        >
            <SettingsSplit.Screen
                name={SCREENS.SETTINGS.ROOT}
                component={EmptyScreen}
            />
            <SettingsSplit.Screen
                name={SCREENS.SETTINGS.WALLET.ROOT}
                component={EmptyScreen}
            />
        </SettingsSplit.Navigator>
    );
}

function TestTabNavigator() {
    return (
        <TabNav.Navigator screenOptions={{headerShown: false}}>
            <TabNav.Screen
                name={NAVIGATORS.SETTINGS_SPLIT_NAVIGATOR}
                component={TestSettingsSplitNavigator}
            />
        </TabNav.Navigator>
    );
}

/** Wallet open in Settings, with the Wise flow's screens stacked in the settings RHP above it */
function renderWiseFlowOverWallet(wiseFlowRoutes: InitialState['routes']) {
    render(
        <NavigationContainer
            ref={navigationRef}
            initialState={{
                index: 1,
                routes: [
                    {
                        name: NAVIGATORS.TAB_NAVIGATOR,
                        state: {
                            index: 0,
                            routes: [
                                {
                                    name: NAVIGATORS.SETTINGS_SPLIT_NAVIGATOR,
                                    state: {index: 1, routes: [{name: SCREENS.SETTINGS.ROOT}, {name: SCREENS.SETTINGS.WALLET.ROOT}]},
                                },
                            ],
                        },
                    },
                    {
                        name: NAVIGATORS.RIGHT_MODAL_NAVIGATOR,
                        state: {
                            index: 0,
                            routes: [{name: SCREENS.RIGHT_MODAL.SETTINGS, state: {index: wiseFlowRoutes.length - 1, routes: wiseFlowRoutes}}],
                        },
                    },
                ],
            }}
        >
            <RootStack.Navigator>
                <RootStack.Screen
                    name={NAVIGATORS.TAB_NAVIGATOR}
                    component={TestTabNavigator}
                />
                <RootStack.Screen
                    name={NAVIGATORS.RIGHT_MODAL_NAVIGATOR}
                    component={TestRightModalNavigator}
                />
            </RootStack.Navigator>
        </NavigationContainer>,
    );
}

function getSettingsModalScreenNames() {
    const rightModalState = navigationRef.current?.getRootState().routes.findLast((route) => route.name === NAVIGATORS.RIGHT_MODAL_NAVIGATOR)?.state;
    return rightModalState?.routes.findLast((route) => route.name === SCREENS.RIGHT_MODAL.SETTINGS)?.state?.routes.map((route) => route.name);
}

function getCurrentPath() {
    const rootState = navigationRef.current?.getRootState();
    return rootState ? getPathFromState(rootState) : undefined;
}

describe('Wise onboarding status stack', () => {
    beforeEach(() => {
        jest.mocked(getIsNarrowLayout).mockReturnValue(true);
        jest.mocked(useResponsiveLayout).mockReturnValue({...CONST.NAVIGATION_TESTS.DEFAULT_USE_RESPONSIVE_LAYOUT_VALUE, shouldUseNarrowLayout: true});
    });

    it.each([
        ['the business onboarding form', SCREENS.SETTINGS.WALLET.DYNAMIC_WISE_BUSINESS_ONBOARDING],
        ['the accept terms page', SCREENS.SETTINGS.WALLET.DYNAMIC_WISE_ACCEPT_TERMS],
    ])('replaces the intro and %s with the status page', (_label, flowScreen) => {
        // Given a page of the flow open over the intro, which the Wallet opened
        renderWiseFlowOverWallet([
            {name: SCREENS.SETTINGS.WALLET.DYNAMIC_WISE_GLOBAL_REIMBURSEMENTS_INTRO, params: {bankAccountID: String(BANK_ACCOUNT_ID)}},
            {name: flowScreen, params: {bankAccountID: String(BANK_ACCOUNT_ID)}},
        ]);

        // When the business is with Wise and the flow opens the status page
        act(() => replaceWiseIntroWithOnboardingStatus(INTRO_PATH, BANK_ACCOUNT_ID));

        // Then the status page is the only screen over the Wallet, so its URL, which Wise also gets as the redirect, does not repeat the intro's segment
        expect(getSettingsModalScreenNames()).toEqual([SCREENS.SETTINGS.WALLET.DYNAMIC_WISE_ONBOARDING_STATUS]);
        expect(getCurrentPath()).toBe(STATUS_URL);
    });

    it('replaces the intro with the status page when the intro opens it', () => {
        // Given the intro open over the Wallet for a business that is already with Wise
        renderWiseFlowOverWallet([{name: SCREENS.SETTINGS.WALLET.DYNAMIC_WISE_GLOBAL_REIMBURSEMENTS_INTRO, params: {bankAccountID: String(BANK_ACCOUNT_ID)}}]);

        // When the intro's Continue opens the status page over the screen under the intro
        act(() => Navigation.navigate(createDynamicRoute(DYNAMIC_ROUTES.WISE_ONBOARDING_STATUS.getRoute(BANK_ACCOUNT_ID), ROUTES.SETTINGS_WALLET), {forceReplace: true}));

        // Then the status page takes the intro's place, the same stack and URL as when the Wallet opens it directly
        expect(getSettingsModalScreenNames()).toEqual([SCREENS.SETTINGS.WALLET.DYNAMIC_WISE_ONBOARDING_STATUS]);
        expect(getCurrentPath()).toBe(STATUS_URL);
    });
});
