import {fireEvent, render, screen} from '@testing-library/react-native';

import OnyxListItemProvider from '@components/OnyxListItemProvider';

import Navigation, {navigationRef} from '@libs/Navigation/Navigation';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';

import WiseAccountApprovedPage from '@pages/settings/Wallet/EnableGlobalReimbursements/Wise/WiseAccountApprovedPage';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import SCREENS from '@src/SCREENS';

import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdatesWithAct from '../../../../utils/waitForBatchedUpdatesWithAct';

const DONE_BUTTON_TEST_ID = 'confirmation-primary-button';

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));

const Stack = createPlatformStackNavigator<SettingsNavigatorParamList>();

describe('WiseAccountApprovedPage', () => {
    let goBackSpy: jest.SpyInstance;

    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await Onyx.clear();
        goBackSpy = jest.spyOn(Navigation, 'goBack').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('goes back to Wallet on Done, since the flow is finished', async () => {
        // Given Wise sent a user on the beta back to the page once its form ended
        await Onyx.set(ONYXKEYS.BETAS, [CONST.BETAS.WISE_REIMBURSEMENTS]);
        render(
            <OnyxListItemProvider>
                <NavigationContainer ref={navigationRef}>
                    <Stack.Navigator>
                        <Stack.Screen
                            name={SCREENS.SETTINGS.WALLET.WISE_ACCOUNT_APPROVED}
                            component={WiseAccountApprovedPage}
                        />
                    </Stack.Navigator>
                </NavigationContainer>
            </OnyxListItemProvider>,
        );
        await waitForBatchedUpdatesWithAct();

        // When the user presses Done
        fireEvent.press(screen.getByTestId(DONE_BUTTON_TEST_ID));

        // Then the user lands on Wallet, where the flow started, rather than on a page of the flow
        expect(goBackSpy).toHaveBeenCalledWith(ROUTES.SETTINGS_WALLET);
    });

    it('goes back to Wallet without showing the approval to a user who is not on the beta', async () => {
        // Given a user without the beta who opens the redirect URL, which loads the app fresh, so navigation is not ready yet
        let markNavigationReady = () => {};
        jest.spyOn(Navigation, 'isNavigationReady').mockReturnValue(
            new Promise((resolve) => {
                markNavigationReady = resolve;
            }),
        );
        await Onyx.set(ONYXKEYS.BETAS, []);
        render(
            <OnyxListItemProvider>
                <NavigationContainer ref={navigationRef}>
                    <Stack.Navigator>
                        <Stack.Screen
                            name={SCREENS.SETTINGS.WALLET.WISE_ACCOUNT_APPROVED}
                            component={WiseAccountApprovedPage}
                        />
                    </Stack.Navigator>
                </NavigationContainer>
            </OnyxListItemProvider>,
        );
        await waitForBatchedUpdatesWithAct();
        expect(goBackSpy).not.toHaveBeenCalled();

        // When navigation becomes ready
        markNavigationReady();
        await waitForBatchedUpdatesWithAct();

        // Then the page leaves for Wallet and never shows Done, since the approval is not theirs to see
        expect(goBackSpy).toHaveBeenCalledWith(ROUTES.SETTINGS_WALLET);
        expect(screen.queryByTestId(DONE_BUTTON_TEST_ID)).toBeNull();
    });
});
