import {renderHook} from '@testing-library/react-native';

import checkDeviceEligibility from '@components/MultifactorAuthentication/biometrics/checkDeviceEligibility';

import useNetwork from '@hooks/useNetwork';

import {isTransactionStillPending3DSReview} from '@libs/actions/MultifactorAuthentication';
import Navigation from '@libs/Navigation/Navigation';
import useNavigateTo3DSAuthorizationChallenge from '@libs/Navigation/useNavigateTo3DSAuthorizationChallenge';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {TransactionPending3DSReview} from '@src/types/onyx';

import Onyx from 'react-native-onyx';
import waitForBatchedUpdates from 'tests/utils/waitForBatchedUpdates';

jest.mock('@hooks/useNetwork');
// Nothing in the MFA flow is focused, so the hook is free to navigate.
jest.mock('@hooks/useRootNavigationState', () => jest.fn(() => false));
jest.mock('@components/MultifactorAuthentication/biometrics/checkDeviceEligibility');
jest.mock('@components/MultifactorAuthentication/config/scenarios/AuthorizeTransaction', () => ({allowedAuthenticationMethods: []}));
jest.mock('@libs/actions/MultifactorAuthentication', () => ({isTransactionStillPending3DSReview: jest.fn()}));
jest.mock('@libs/Navigation/Navigation', () => ({
    __esModule: true,
    default: {navigate: jest.fn(), isNavigationReady: jest.fn(() => Promise.resolve())},
    isMFAFlowScreen: jest.fn(() => false),
}));

const TRANSACTION: TransactionPending3DSReview = {
    transactionID: '123',
    created: '2024-01-01T12:00:00.000Z',
    expires: '2024-01-01T12:08:00.000Z',
    lastFourPAN: '1234',
};

function mockNetwork(isOffline: boolean) {
    jest.mocked(useNetwork).mockReturnValue({isOffline} as ReturnType<typeof useNetwork>);
}

describe('useNavigateTo3DSAuthorizationChallenge', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await Onyx.clear();
        await Onyx.set(ONYXKEYS.TRANSACTIONS_PENDING_3DS_REVIEW, {[TRANSACTION.transactionID]: TRANSACTION});
        jest.mocked(checkDeviceEligibility).mockResolvedValue({success: true} as Awaited<ReturnType<typeof checkDeviceEligibility>>);
        jest.mocked(isTransactionStillPending3DSReview).mockResolvedValue(true);
    });

    it('waits until the device is back online to open a pending review', async () => {
        // Given a pending review while the device is offline
        mockNetwork(true);
        const {rerender} = renderHook(() => useNavigateTo3DSAuthorizationChallenge());
        await waitForBatchedUpdates();

        // Then nothing is checked or opened, because the pending check needs the network
        expect(isTransactionStillPending3DSReview).not.toHaveBeenCalled();
        expect(Navigation.navigate).not.toHaveBeenCalled();

        // When the device comes back online
        mockNetwork(false);
        rerender({});
        await waitForBatchedUpdates();

        // Then the review opens, so a review left offline without a decision comes back
        expect(Navigation.navigate).toHaveBeenCalledWith(ROUTES.MULTIFACTOR_AUTHENTICATION_AUTHORIZE_TRANSACTION.getRoute(TRANSACTION.transactionID));
    });
});
