import {fireEvent, render, screen} from '@testing-library/react-native';

import OnyxListItemProvider from '@components/OnyxListItemProvider';

import Navigation, {navigationRef} from '@libs/Navigation/Navigation';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';

import WiseEmbeddedKYCReviewPage from '@pages/settings/Wallet/EnableGlobalReimbursements/Wise/WiseEmbeddedKYCReviewPage';

import {clearWiseKYCReviewEmbeddedLink} from '@userActions/Wise';

import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';

import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdatesWithAct from '../../../../utils/waitForBatchedUpdatesWithAct';

const KYC_REVIEW_PATH = 'settings/wallet/global-reimbursements/9053192/business-onboarding/confirm/accept-terms/kyc-review';
const LINK = 'https://sandbox.transferwise.tech/kyc-review?bankAccountID=9053192';
const DONE_BUTTON_TEST_ID = 'WiseEmbeddedKYCReviewDoneButton';

jest.mock('@userActions/Wise', () => ({clearWiseKYCReviewEmbeddedLink: jest.fn()}));
jest.mock('@hooks/useDynamicBackPath', () => jest.fn(() => 'settings/wallet/global-reimbursements/9053192/business-onboarding/confirm/accept-terms/kyc-review'));
jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));

const Stack = createPlatformStackNavigator<SettingsNavigatorParamList>();

async function renderPage() {
    const result = render(
        <OnyxListItemProvider>
            <NavigationContainer ref={navigationRef}>
                <Stack.Navigator initialRouteName={SCREENS.SETTINGS.WALLET.DYNAMIC_WISE_EMBEDDED_KYC_REVIEW}>
                    <Stack.Screen
                        name={SCREENS.SETTINGS.WALLET.DYNAMIC_WISE_EMBEDDED_KYC_REVIEW}
                        component={WiseEmbeddedKYCReviewPage}
                        initialParams={{bankAccountID: '9053192'}}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </OnyxListItemProvider>,
    );
    await waitForBatchedUpdatesWithAct();
    return result;
}

describe('WiseEmbeddedKYCReviewPage', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
        jest.spyOn(Navigation, 'goBack').mockImplementation(() => {});
        jest.spyOn(Navigation, 'dismissModal').mockImplementation(() => {});
        await Onyx.clear();
    });

    it('shows the link in place of the embedded page and closes the flow on Done', async () => {
        // Given the link fetched by the KYC review page
        await Onyx.set(ONYXKEYS.RAM_ONLY_WISE_KYC_REVIEW_EMBEDDED_LINK, {url: LINK, isLoading: false});

        // When the page opens
        await renderPage();

        // Then the link shows where Wise's page will be, until the embedded page lands
        expect(screen.getByText(LINK)).toBeOnTheScreen();

        // When the user presses Done
        fireEvent.press(screen.getByTestId(DONE_BUTTON_TEST_ID));

        // Then the whole flow closes
        expect(Navigation.dismissModal).toHaveBeenCalledTimes(1);
    });

    it('goes back to the KYC review when there is no link', async () => {
        // Given no link, as after a reload, since the link lives in memory only

        // When the page opens
        await renderPage();

        // Then it returns to the KYC review, where Continue fetches a new link
        expect(Navigation.goBack).toHaveBeenCalledWith(KYC_REVIEW_PATH);
        expect(screen.queryByTestId(DONE_BUTTON_TEST_ID)).not.toBeOnTheScreen();
    });

    it('drops the link when the page closes', async () => {
        // Given the page open with a link
        await Onyx.set(ONYXKEYS.RAM_ONLY_WISE_KYC_REVIEW_EMBEDDED_LINK, {url: LINK, isLoading: false});
        const {unmount} = await renderPage();

        // When the page closes
        unmount();

        // Then the link is cleared, since it carries a token and the KYC review must not reopen this page with it
        expect(clearWiseKYCReviewEmbeddedLink).toHaveBeenCalledTimes(1);
    });
});
