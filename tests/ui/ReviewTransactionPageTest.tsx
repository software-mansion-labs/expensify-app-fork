import {fireEvent, render, screen} from '@testing-library/react-native';

import Text from '@components/Text';

import {fireAndForgetReportFraudulentTransaction, reportFraudulentTransaction} from '@libs/actions/MultifactorAuthentication';
import Navigation from '@libs/Navigation/Navigation';

import ReviewTransactionPage from '@pages/MultifactorAuthentication/ReviewTransactionPage';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type {ComponentProps} from 'react';

import React from 'react';
import {View} from 'react-native';
import Onyx from 'react-native-onyx';

import createMock from '../utils/createMock';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

type ReportResult = Awaited<ReturnType<typeof reportFraudulentTransaction>>;
type PageProps = ComponentProps<typeof ReviewTransactionPage>;

const TRANSACTION_ID = '123';

function mockTouchable(testID: string, onPress: () => void) {
    const {Pressable} = jest.requireActual<Record<string, React.FC<Record<string, unknown>>>>('react-native');
    return (
        <Pressable
            testID={testID}
            accessibilityRole="button"
            onPress={onPress}
        />
    );
}

function mockLabel(label: string) {
    return <Text>{label}</Text>;
}

function mockOutcome(label: string, actionTestID: string, onAction: () => void) {
    return (
        <View>
            {mockLabel(label)}
            {mockTouchable(actionTestID, onAction)}
        </View>
    );
}
const CARD_ID = 456;

jest.mock('@libs/actions/MultifactorAuthentication', () => ({
    reportFraudulentTransaction: jest.fn(),
    fireAndForgetReportFraudulentTransaction: jest.fn(),
}));

jest.mock('@libs/Navigation/Navigation', () => ({
    __esModule: true,
    default: {navigate: jest.fn(), closeRHPFlow: jest.fn()},
}));

jest.mock('@components/MultifactorAuthentication/Context', () => ({
    useMultifactorAuthentication: () => ({executeScenario: jest.fn()}),
}));

jest.mock('@hooks/useBeforeRemove', () => jest.fn());

jest.mock('@hooks/useNetworkWithOfflineStatus', () => () => ({isOffline: false}));

jest.mock('@hooks/useLocalize', () => ({
    __esModule: true,
    default: () => ({translate: (key: string) => key}),
}));

jest.mock(
    '@components/ScreenWrapper',
    () =>
        ({children}: {children: React.ReactNode}) =>
            children,
);
jest.mock(
    '@components/BlockingViews/FullPageOfflineBlockingView',
    () =>
        ({children}: {children: React.ReactNode}) =>
            children,
);
jest.mock('@pages/MultifactorAuthentication/ReviewTransactionPage/ReviewTransactionContent', () => () => null);

jest.mock('@components/Header', () => {
    function MockHeader({children}: {children: React.ReactNode}) {
        return children;
    }
    MockHeader.BackButton = ({onPress}: {onPress: () => void}) => mockTouchable('back', onPress);
    MockHeader.Title = () => null;
    return MockHeader;
});

jest.mock(
    '@pages/MultifactorAuthentication/AuthorizeTransactionPage/AuthorizeTransactionActions',
    () =>
        ({onDeny}: {onDeny: () => void}) =>
            mockTouchable('not-recognized', onDeny),
);

jest.mock('@components/MultifactorAuthentication/components/Modals', () => {
    const mockModal =
        (testID: string) =>
        ({isVisible, onConfirm}: {isVisible: boolean; onConfirm: () => void}) =>
            isVisible ? mockTouchable(testID, onConfirm) : null;
    return {FreezeCardCancelConfirmModal: mockModal('confirm-freeze'), TerminateCardCancelConfirmModal: mockModal('confirm-terminate')};
});

jest.mock('@components/MultifactorAuthentication/config/scenarios/AuthorizeTransaction', () => ({
    AlreadyReviewedFailureScreen: () => mockLabel('already-reviewed-outcome'),
    DeniedTransactionServerFailureScreen: () => mockLabel('server-failure-outcome'),
}));

jest.mock(
    '@pages/MultifactorAuthentication/ReviewTransactionPage/FrozenCardOutcomeScreen',
    () =>
        ({onUnfreezePress}: {onUnfreezePress: () => void}) =>
            mockOutcome('frozen-outcome', 'unfreeze', onUnfreezePress),
);

function renderPage() {
    render(<ReviewTransactionPage {...createMock<PageProps>({route: {params: {transactionID: TRANSACTION_ID}}})} />);
}

function mockReportResult(reason: ReportResult['reason']) {
    jest.mocked(reportFraudulentTransaction).mockResolvedValue(createMock<ReportResult>({reason, httpStatusCode: 200}));
}

describe('ReviewTransactionPage', () => {
    beforeAll(() => Onyx.init({keys: ONYXKEYS}));

    beforeEach(async () => {
        await Onyx.merge(ONYXKEYS.TRANSACTIONS_PENDING_FRAUD_REVIEW, {
            [TRANSACTION_ID]: {transactionID: TRANSACTION_ID, created: '2026-11-09 10:00:00', lastFourPAN: '1234', amount: 4000, currency: 'USD', merchant: 'Amazon', cardID: CARD_ID},
        });
    });

    afterEach(async () => {
        jest.clearAllMocks();
        await Onyx.clear();
    });

    it('shows the frozen card outcome and opens the card page after a successful report', async () => {
        // Given the server freezes the card
        mockReportResult(CONST.MULTIFACTOR_AUTHENTICATION.REASON.FLOW_OUTCOMES.FRAUD_REPORTED);
        renderPage();
        await waitForBatchedUpdatesWithAct();

        // When the cardholder says they don't recognize the transaction and then taps unfreeze
        fireEvent.press(screen.getByTestId('not-recognized'));
        await waitForBatchedUpdatesWithAct();
        fireEvent.press(screen.getByTestId('unfreeze'));

        // Then they saw the frozen result and land on the page of the card that was frozen
        expect(Navigation.closeRHPFlow).toHaveBeenCalled();
        expect(jest.mocked(Navigation.navigate).mock.calls.at(0)?.at(0)).toContain(String(CARD_ID));
    });

    it('shows the already reviewed outcome when another device answered first', async () => {
        // Given the transaction was already reviewed on another device
        mockReportResult(CONST.MULTIFACTOR_AUTHENTICATION.REASON.CLIENT_ERRORS.ALREADY_REVIEWED);
        renderPage();
        await waitForBatchedUpdatesWithAct();

        // When the cardholder reports the transaction
        fireEvent.press(screen.getByTestId('not-recognized'));
        await waitForBatchedUpdatesWithAct();

        // Then they are told it was handled elsewhere instead of seeing a frozen card
        expect(screen.getByText('already-reviewed-outcome')).toBeOnTheScreen();
    });

    it('shows the server failure outcome when the report fails', async () => {
        // Given the server rejects the report
        mockReportResult(CONST.MULTIFACTOR_AUTHENTICATION.REASON.SERVER_ERRORS.UNRECOGNIZED);
        renderPage();
        await waitForBatchedUpdatesWithAct();

        // When the cardholder reports the transaction
        fireEvent.press(screen.getByTestId('not-recognized'));
        await waitForBatchedUpdatesWithAct();

        // Then they see that something went wrong instead of a frozen card
        expect(screen.getByText('server-failure-outcome')).toBeOnTheScreen();
    });

    it('reports fraud without waiting and shows the frozen card when the cardholder backs out', async () => {
        // Given the review screen is open
        renderPage();
        await waitForBatchedUpdatesWithAct();

        // When the cardholder taps back and confirms the drawer
        fireEvent.press(screen.getByTestId('back'));
        fireEvent.press(screen.getByTestId('confirm-freeze'));

        // Then the fraud report is sent in the background and the frozen result shows right away
        expect(fireAndForgetReportFraudulentTransaction).toHaveBeenCalledWith({transactionID: TRANSACTION_ID});
        expect(screen.getByText('frozen-outcome')).toBeOnTheScreen();
    });

    it('does not send a second report when backing out while the first one is in flight', async () => {
        // Given the cardholder already tapped "No, it wasn't me" and the report has not finished yet
        jest.mocked(reportFraudulentTransaction).mockReturnValue(new Promise(() => {}));
        renderPage();
        await waitForBatchedUpdatesWithAct();
        fireEvent.press(screen.getByTestId('not-recognized'));

        // When they back out and confirm the drawer
        fireEvent.press(screen.getByTestId('back'));
        fireEvent.press(screen.getByTestId('confirm-freeze'));

        // Then only the first report is sent
        expect(reportFraudulentTransaction).toHaveBeenCalledTimes(1);
        expect(fireAndForgetReportFraudulentTransaction).not.toHaveBeenCalled();
    });
});
