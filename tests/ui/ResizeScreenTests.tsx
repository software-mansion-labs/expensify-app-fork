import {NavigationContainer} from '@react-navigation/native';
import {render, renderHook} from '@testing-library/react-native';
import React from 'react';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import getIsNarrowLayout from '@libs/getIsNarrowLayout';
import createResponsiveStackNavigator from '@libs/Navigation/AppNavigator/createResponsiveStackNavigator';
import BottomTabNavigator from '@libs/Navigation/AppNavigator/Navigators/BottomTabNavigator';
import useNavigationResetRootOnLayoutChange from '@libs/Navigation/AppNavigator/useNavigationResetRootOnLayoutChange';
import navigationRef from '@libs/Navigation/navigationRef';
import type {AuthScreensParamList} from '@libs/Navigation/types';
import ProfilePage from '@pages/settings/Profile/ProfilePage';
import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';
import type ReactComponentModule from '@src/types/utils/ReactComponentModule';

const RootStack = createResponsiveStackNavigator<AuthScreensParamList>();
const AuthScreens = require<ReactComponentModule>('@libs/Navigation/AppNavigator/AuthScreens').default;

jest.mock('@hooks/useResponsiveLayout', () => jest.fn());
jest.mock('@libs/getIsNarrowLayout', () => jest.fn());

jest.mock('@pages/settings/InitialSettingsPage');
jest.mock('@pages/settings/Profile/ProfilePage');
jest.mock('@libs/Navigation/AppNavigator/createCustomBottomTabNavigator/BottomTabBar');

jest.doMock('@libs/Navigation/AppNavigator/AuthScreens', () => {
    <RootStack.Navigator>
        <RootStack.Screen
            name={NAVIGATORS.BOTTOM_TAB_NAVIGATOR}
            component={BottomTabNavigator}
        />

        <RootStack.Screen
            name={SCREENS.SETTINGS.PROFILE.ROOT}
            component={ProfilePage}
        />
    </RootStack.Navigator>;
});

const INITIAL_STATE = {routes: [{name: NAVIGATORS.BOTTOM_TAB_NAVIGATOR, state: {index: 1, routes: [{name: SCREENS.HOME}, {name: SCREENS.SETTINGS.ROOT}]}}]};

describe('Resize screen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getIsNarrowLayout as jest.Mock).mockReturnValue(true);
        (useResponsiveLayout as jest.Mock).mockReturnValue({shouldUseNarrowLayout: true});
    });
    it('Should display the settings profile after resizing the screen with the settings page opened to the wide layout', () => {
        const {rerender} = renderHook(() => useNavigationResetRootOnLayoutChange());
        // Given the initialized navigation on the narrow layout with the settings screen
        render(
            <NavigationContainer
                ref={navigationRef}
                initialState={INITIAL_STATE}
            >
                <AuthScreens />
            </NavigationContainer>,
        );

        expect(navigationRef.current?.isReady()).toBeTruthy();
        expect(navigationRef.current?.getRootState().routes.at(0)).toBeDefined();
        expect(navigationRef.current?.getRootState().routes.at(0)?.name).toBe(NAVIGATORS.BOTTOM_TAB_NAVIGATOR);
        expect(navigationRef.current?.getRootState().routes.at(1)).toBeUndefined();

        // When resizing the screen to the wide layout
        (getIsNarrowLayout as jest.Mock).mockReturnValue(false);
        (useResponsiveLayout as jest.Mock).mockReturnValue({shouldUseNarrowLayout: false});
        rerender({});

        // Then the settings profile page should be displayed on the screen
        expect(navigationRef.current?.isReady()).toBeTruthy();
        expect(navigationRef.current?.getRootState().routes.at(0)).toBeDefined();
        expect(navigationRef.current?.getRootState().routes.at(0)?.name).toBe(NAVIGATORS.BOTTOM_TAB_NAVIGATOR);
        expect(navigationRef.current?.getRootState().routes.at(1)?.name).toBe(SCREENS.SETTINGS.PROFILE.ROOT);
    });
});
