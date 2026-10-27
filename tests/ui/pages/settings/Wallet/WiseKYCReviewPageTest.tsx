import {act, fireEvent, render, screen} from '@testing-library/react-native';

import OnyxListItemProvider from '@components/OnyxListItemProvider';

import Navigation, {navigationRef} from '@libs/Navigation/Navigation';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import {setHasRadio} from '@libs/NetworkState';

import WiseKYCReviewPage from '@pages/settings/Wallet/EnableGlobalReimbursements/Wise/WiseKYCReviewPage';

import {clearWiseKYCReviewEmbeddedLink, getWiseKYCReviewEmbeddedLink} from '@userActions/Wise';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import {DYNAMIC_ROUTES} from '@src/ROUTES';
import SCREENS from '@src/SCREENS';

import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdatesWithAct from '../../../../utils/waitForBatchedUpdatesWithAct';

const BANK_ACCOUNT_ID = 9053192;
const CONTINUE_BUTTON_TEST_ID = 'confirmation-primary-button';

jest.mock('@userActions/Wise', () => ({getWiseKYCReviewEmbeddedLink: jest.fn(), clearWiseKYCReviewEmbeddedLink: jest.fn()}));
jest.mock('@hooks/useDynamicBackPath', () => jest.fn(() => 'settings/wallet/global-reimbursements/9053192/business-onboarding/confirm/accept-terms'));
jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));

const Stack = createPlatformStackNavigator<SettingsNavigatorParamList>();

async function renderPage() {
    await Onyx.set(ONYXKEYS.BETAS, [CONST.BETAS.WISE_REIMBURSEMENTS]);
    const result = render(
        <OnyxListItemProvider>
            <NavigationContainer ref={navigationRef}>
                <Stack.Navigator initialRouteName={SCREENS.SETTINGS.WALLET.DYNAMIC_WISE_KYC_REVIEW}>
                    <Stack.Screen
                        name={SCREENS.SETTINGS.WALLET.DYNAMIC_WISE_KYC_REVIEW}
                        component={WiseKYCReviewPage}
                        initialParams={{bankAccountID: String(BANK_ACCOUNT_ID)}}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </OnyxListItemProvider>,
    );
    await waitForBatchedUpdatesWithAct();
    return result;
}

describe('WiseKYCReviewPage', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
        jest.spyOn(Navigation, 'navigate').mockImplementation(() => {});
        setHasRadio(true);
        await Onyx.clear();
    });

    it('fetches the link to Wise for the bank account on Continue', async () => {
        // Given the page opened from the terms for a bank account
        await renderPage();

        // When the user presses Continue
        fireEvent.press(screen.getByTestId(CONTINUE_BUTTON_TEST_ID));

        // Then the link is fetched for the bank account from the route, since Wise's page is tied to it
        expect(getWiseKYCReviewEmbeddedLink).toHaveBeenCalledWith(BANK_ACCOUNT_ID);
    });

    it("opens Wise's page once the link it asked for arrives", async () => {
        // Given the user pressed Continue and the link is on its way
        await renderPage();
        fireEvent.press(screen.getByTestId(CONTINUE_BUTTON_TEST_ID));
        expect(Navigation.navigate).not.toHaveBeenCalled();

        // When the link arrives
        await act(() => Onyx.set(ONYXKEYS.RAM_ONLY_WISE_KYC_REVIEW_EMBEDDED_LINK, {url: 'https://wise.com/kyc', isLoading: false}));
        await waitForBatchedUpdatesWithAct();

        // Then Wise's page opens on top of this one
        expect(Navigation.navigate).toHaveBeenCalledWith(expect.stringContaining(DYNAMIC_ROUTES.WISE_EMBEDDED_KYC_REVIEW.path));
    });

    it("does not open Wise's page for a link it did not ask for", async () => {
        // Given a link left over from an earlier visit, as when a fetch returns after its page closed
        await Onyx.set(ONYXKEYS.RAM_ONLY_WISE_KYC_REVIEW_EMBEDDED_LINK, {url: 'https://wise.com/kyc', isLoading: false});

        // When the page opens
        await renderPage();

        // Then it waits for Continue, since the user has not asked to leave yet
        expect(Navigation.navigate).not.toHaveBeenCalled();
    });

    it('disables Continue offline', async () => {
        // Given an offline device, where a read is not sent until the connection returns
        setHasRadio(false);

        // When the page opens
        await renderPage();

        // Then Continue cannot be pressed, so the user does not wait on a link that never comes
        expect(screen.getByTestId(CONTINUE_BUTTON_TEST_ID)).toBeDisabled();
    });

    it('disables Continue while the link is being fetched', async () => {
        // Given the page open
        await renderPage();

        // When the link fetch is in flight
        await act(() => Onyx.set(ONYXKEYS.RAM_ONLY_WISE_KYC_REVIEW_EMBEDDED_LINK, {isLoading: true}));
        await waitForBatchedUpdatesWithAct();

        // Then Continue cannot start a second fetch
        expect(screen.getByTestId(CONTINUE_BUTTON_TEST_ID)).toBeDisabled();
    });

    it('drops the link when the page closes', async () => {
        // Given the page open
        const {unmount} = await renderPage();
        expect(clearWiseKYCReviewEmbeddedLink).not.toHaveBeenCalled();

        // When the page closes
        unmount();

        // Then the link is cleared, since it carries a token
        expect(clearWiseKYCReviewEmbeddedLink).toHaveBeenCalledTimes(1);
    });
});
