import {render, renderHook} from '@testing-library/react-native';
import React from 'react';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import getIsNarrowLayout from '@libs/getIsNarrowLayout';
import useNavigationResetRootOnLayoutChange from '@libs/Navigation/AppNavigator/useNavigationResetRootOnLayoutChange';
import {navigationRef} from '@libs/Navigation/Navigation';
import NavigationRoot from '@libs/Navigation/NavigationRoot';
import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';

jest.mock('@hooks/useResponsiveLayout', () => jest.fn());
jest.mock('@libs/getIsNarrowLayout', () => jest.fn());

jest.mock('@pages/settings/InitialSettingsPage');
jest.mock('@pages/settings/Profile/ProfilePage');
jest.mock('@libs/Navigation/AppNavigator/createCustomBottomTabNavigator/BottomTabBar');

describe('Resize screen test', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getIsNarrowLayout as jest.Mock).mockReturnValue(true);
        (useResponsiveLayout as jest.Mock).mockReturnValue({shouldUseNarrowLayout: true});
    });
    it('should navigate to SettingsScreen when the button is pressed', () => {
        const {rerender} = renderHook(() => useNavigationResetRootOnLayoutChange());
        render(
            <NavigationRoot
                authenticated
                shouldShowRequire2FAModal={false}
                initialUrl="https://new.expensify.com/"
                onReady={() => {}}
                lastVisitedPath="settings"
            />,
        );

        expect(navigationRef.current?.getRootState().routes.at(0)).toBeDefined();
        expect(navigationRef.current?.getRootState().routes.at(0)?.name).toBe(NAVIGATORS.BOTTOM_TAB_NAVIGATOR);
        expect(navigationRef.current?.getRootState().routes.at(1)).toBeUndefined();

        console.log('ROOT STATE BEFORE RESIZE', navigationRef.current?.getRootState());

        (getIsNarrowLayout as jest.Mock).mockReturnValue(false);
        (useResponsiveLayout as jest.Mock).mockReturnValue({shouldUseNarrowLayout: false});
        rerender({});

        console.log('ROOT STATE AFTER RESIZE', navigationRef.current?.getRootState());

        expect(navigationRef.current?.getRootState().routes.at(0)).toBeDefined();
        expect(navigationRef.current?.getRootState().routes.at(0)?.name).toBe(NAVIGATORS.BOTTOM_TAB_NAVIGATOR);
        expect(navigationRef.current?.getRootState().routes.at(1)?.name).toBe(SCREENS.SETTINGS.PROFILE.ROOT);
    });
});
