import {act, fireEvent, render, screen} from '@testing-library/react-native';

import useNetworkWithOfflineStatus from '@hooks/useNetworkWithOfflineStatus';

import {fireAndForgetDenyTransaction} from '@libs/actions/MultifactorAuthentication';
import Navigation from '@libs/Navigation/Navigation';

import AuthorizeTransactionPage from '@pages/MultifactorAuthentication/AuthorizeTransactionPage';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import Onyx from 'react-native-onyx';
import waitForBatchedUpdatesWithAct from 'tests/utils/waitForBatchedUpdatesWithAct';

const TRANSACTION_ID = '123';
const BACK_BUTTON = 'back-button';
const CONFIRM_BUTTON = 'confirm-deny';

type ReactNativeMock = {Pressable: React.ComponentType<{testID: string; accessibilityRole: 'button'; onPress: () => void}>};

type CancelConfirmModalProps = {isVisible: boolean; onConfirm: () => void};

let lastCancelConfirmModalProps: CancelConfirmModalProps | undefined;

jest.mock('@hooks/useNetworkWithOfflineStatus', () => jest.fn());
jest.mock('@hooks/useBeforeRemove', () => jest.fn());
jest.mock('@libs/Navigation/Navigation', () => ({closeRHPFlow: jest.fn()}));
jest.mock('@libs/actions/MultifactorAuthentication', () => ({denyTransaction: jest.fn(), fireAndForgetDenyTransaction: jest.fn()}));
jest.mock('@components/MultifactorAuthentication/Context', () => ({useMultifactorAuthentication: () => ({executeScenario: jest.fn()})}));
jest.mock('@components/MultifactorAuthentication/config/scenarios', () => ({}));
jest.mock('@components/MultifactorAuthentication/config/scenarios/AuthorizeTransaction', () => ({}));
jest.mock(
    '@components/ScreenWrapper',
    () =>
        ({children}: {children: React.ReactNode}) =>
            children,
);
jest.mock('@pages/MultifactorAuthentication/AuthorizeTransactionPage/AuthorizeTransactionContent', () => () => null);
jest.mock('@pages/MultifactorAuthentication/AuthorizeTransactionPage/AuthorizeTransactionActions', () => () => null);
jest.mock('@components/HeaderWithBackButton', () => {
    const {Pressable} = jest.requireActual<ReactNativeMock>('react-native');
    return ({onBackButtonPress}: {onBackButtonPress: () => void}) => (
        <Pressable
            testID="back-button"
            accessibilityRole="button"
            onPress={onBackButtonPress}
        />
    );
});
jest.mock('@components/MultifactorAuthentication/components/Modals', () => {
    const {Pressable} = jest.requireActual<ReactNativeMock>('react-native');
    return {
        AuthorizeTransactionCancelConfirmModal: (props: CancelConfirmModalProps) => {
            lastCancelConfirmModalProps = props;
            return props.isVisible ? (
                <Pressable
                    testID="confirm-deny"
                    accessibilityRole="button"
                    onPress={props.onConfirm}
                />
            ) : null;
        },
    };
});

function setOffline(isOffline: boolean) {
    jest.mocked(useNetworkWithOfflineStatus).mockReturnValue({isOffline, lastOfflineAt: {current: undefined}, lastOnlineAt: {current: undefined}});
}

// The page reads only the route's transaction, so the navigation props are left out.
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
const pageProps = {route: {params: {transactionID: TRANSACTION_ID}}} as unknown as React.ComponentProps<typeof AuthorizeTransactionPage>;

function renderPage() {
    return render(<AuthorizeTransactionPage {...pageProps} />);
}

describe('MultifactorAuthenticationScenarioAuthorizeTransactionPage', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        lastCancelConfirmModalProps = undefined;
        setOffline(false);
        await act(async () => {
            await Onyx.clear();
            await Onyx.merge(ONYXKEYS.TRANSACTIONS_PENDING_3DS_REVIEW, {[TRANSACTION_ID]: {transactionID: TRANSACTION_ID}});
        });
        await waitForBatchedUpdatesWithAct();
    });

    it('denies the transaction when the user confirms leaving the review online', async () => {
        // Given the cancel modal is open
        renderPage();
        await waitForBatchedUpdatesWithAct();
        fireEvent.press(screen.getByTestId(BACK_BUTTON));

        // When the user confirms
        fireEvent.press(screen.getByTestId(CONFIRM_BUTTON));

        // Then the deny is sent and the review closes
        expect(fireAndForgetDenyTransaction).toHaveBeenCalledWith({transactionID: TRANSACTION_ID});
        expect(Navigation.closeRHPFlow).toHaveBeenCalledTimes(1);
    });

    it('hides the cancel modal when the device goes offline, because the deny it promises cannot be sent', async () => {
        // Given the cancel modal is open
        const {rerender} = renderPage();
        await waitForBatchedUpdatesWithAct();
        fireEvent.press(screen.getByTestId(BACK_BUTTON));
        expect(screen.getByTestId(CONFIRM_BUTTON)).toBeOnTheScreen();

        // When the device goes offline
        setOffline(true);
        rerender(<AuthorizeTransactionPage {...pageProps} />);

        // Then the modal is gone
        expect(screen.queryByTestId(CONFIRM_BUTTON)).not.toBeOnTheScreen();

        // When a confirm still lands, e.g. a tap that was on its way
        act(() => lastCancelConfirmModalProps?.onConfirm());

        // Then the review closes without a decision, so no deny marks the transaction as handled and the review comes back once online
        expect(fireAndForgetDenyTransaction).not.toHaveBeenCalled();
        expect(Navigation.closeRHPFlow).toHaveBeenCalledTimes(1);
    });
});
