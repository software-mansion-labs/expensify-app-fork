import type * as OnyxListItemProvider from '@components/OnyxListItemProvider';

import type * as MoneyRequestReportUtils from '@libs/MoneyRequestReportUtils';
import type * as ReportActionsUtils from '@libs/ReportActionsUtils';

import ReportFetchHandler from '@pages/inbox/ReportFetchHandler';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';

import type * as ReactNavigation from '@react-navigation/native';

import React from 'react';
import Onyx from 'react-native-onyx';

import {getFakeReportAction} from '../utils/ReportTestUtils';
import renderCoverableScreen from '../utils/ScreenCoverHarness';
import createTransitionTrackerHarness from '../utils/TransitionTrackerTestUtils';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

const REPORT_ID = '1';
const TRANSACTION_ID = '500';

const mockRoute = {key: 'report-route-key', name: SCREENS.REPORT, params: {reportID: REPORT_ID}};
const mockTransaction = {transactionID: TRANSACTION_ID, reportID: REPORT_ID};
const mockReportAction = getFakeReportAction(1);

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof ReactNavigation>('@react-navigation/native'),
    useRoute: () => mockRoute,
    useNavigation: () => ({setParams: jest.fn(), addListener: jest.fn(() => () => {})}),
    useIsFocused: () => true,
}));

jest.mock('@libs/Navigation/TransitionTracker', () => ({
    __esModule: true,
    default: {runAfterTransitions: jest.fn()},
}));

jest.mock('@userActions/Report', () => ({
    clearStaleDMRecoveryTargetByTargetReportID: jest.fn(),
    createTransactionThreadReport: jest.fn(),
    joinReportViaSecureLink: jest.fn(),
    markLocalReportActionsAsLoaded: jest.fn(),
    openReport: jest.fn(),
    readNewestAction: jest.fn(),
    setViewingPublicRoomReportID: jest.fn(),
    subscribeToReportLeavingEvents: jest.fn(),
    unsubscribeFromLeavingRoomReportChannel: jest.fn(),
    updateLastVisitTime: jest.fn(),
    updateLoadingInitialReportAction: jest.fn(),
}));

// Undefined drives the legacy path; CONST.FAKE_REPORT_ID drives the fake-ID path of the second describe.
let mockOneTransactionThreadReportID: string | undefined;

// A legacy single-transaction expense report: one transaction, no IOU action for it, and no transaction thread yet.
// The utils are stubbed to that shape so the test drives the handler's own guard, not their derivation logic.
jest.mock('@libs/ReportActionsUtils', () => ({
    ...jest.requireActual<typeof ReportActionsUtils>('@libs/ReportActionsUtils'),
    getFilteredReportActionsForReportView: (reportActions: unknown) => reportActions,
    getIOUActionForReportID: () => undefined,
    getOneTransactionThreadReportID: () => mockOneTransactionThreadReportID,
}));

jest.mock('@libs/MoneyRequestReportUtils', () => ({
    ...jest.requireActual<typeof MoneyRequestReportUtils>('@libs/MoneyRequestReportUtils'),
    getAllNonDeletedTransactions: () => [mockTransaction],
}));

jest.mock('@components/OnyxListItemProvider', () => ({
    ...jest.requireActual<typeof OnyxListItemProvider>('@components/OnyxListItemProvider'),
    usePersonalDetails: () => ({}),
}));

jest.mock('@hooks/useCurrentUserPersonalDetails', () => () => ({accountID: 1, email: 'tester@expensify.com'}));
jest.mock('@hooks/usePaginatedReportActions', () => () => ({reportActions: [mockReportAction], linkedAction: undefined}));
jest.mock('@hooks/useReportTransactionsCollection', () => () => ({[`transactions_${TRANSACTION_ID}`]: mockTransaction}));
jest.mock('@hooks/useIsOwnWorkspaceChatRef', () => () => ({current: false}));
jest.mock('@hooks/useIsReportActionsLoaded', () => () => true);
jest.mock('@hooks/useIsAnonymousUser', () => () => false);
jest.mock('@hooks/useIsInSidePanel', () => () => false);
jest.mock('@hooks/useNetwork', () => () => ({isOffline: false}));

const {createTransactionThreadReport} = jest.requireMock<{createTransactionThreadReport: jest.Mock}>('@userActions/Report');

const transitionTracker = createTransitionTrackerHarness();

beforeAll(() => {
    Onyx.init({keys: ONYXKEYS});
});

beforeEach(async () => {
    jest.clearAllMocks();
    transitionTracker.install();
    mockOneTransactionThreadReportID = undefined;
    await Onyx.clear();
    await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID}`, {reportID: REPORT_ID, type: CONST.REPORT.TYPE.EXPENSE});
    await Onyx.merge(`${ONYXKEYS.COLLECTION.RAM_ONLY_REPORT_LOADING_STATE}${REPORT_ID}`, {hasOnceLoadedReportActions: true, isLoadingInitialReportActions: false});
});

/**
 * Opening a legacy single-transaction expense report creates its missing transaction thread once, guarded by a ref
 * whose comment says it is set before the call "to prevent race conditions". A ref survives a cover, so a reveal must
 * not re-arm it. The assertion describes behavior that ships today.
 */
describe('ReportFetchHandler legacy transaction thread across a cover/reveal cycle', () => {
    it('creates the missing transaction thread once, not again after a reveal', async () => {
        const screen = renderCoverableScreen(<ReportFetchHandler />);
        await waitForBatchedUpdatesWithAct();
        transitionTracker.firePendingCallbacks();
        await waitForBatchedUpdatesWithAct();

        expect(createTransactionThreadReport).toHaveBeenCalledTimes(1);

        await screen.hide();
        await screen.reveal();
        transitionTracker.firePendingCallbacks();
        await waitForBatchedUpdatesWithAct();

        expect(createTransactionThreadReport).toHaveBeenCalledTimes(1);
    });
});

/**
 * While the one-transaction thread is still the fake placeholder (create in flight, offline, or failed), a second path
 * calls `createTransactionThreadReport` guarded only by those data conditions, with no surviving ref. The conditions
 * are evaluated once per effect run, so as long as effects run once per mount a cover/reveal cannot re-enter the path
 * and create a duplicate optimistic thread. The assertion describes behavior that ships today.
 */
describe('ReportFetchHandler fake-ID transaction thread across a cover/reveal cycle', () => {
    it('creates the fake-ID transaction thread once, not again after a reveal', async () => {
        // The mocked createTransactionThreadReport never resolves, so the fake-ID conditions persist across the cycle.
        mockOneTransactionThreadReportID = CONST.FAKE_REPORT_ID;

        const screen = renderCoverableScreen(<ReportFetchHandler />);
        await waitForBatchedUpdatesWithAct();
        transitionTracker.firePendingCallbacks();
        await waitForBatchedUpdatesWithAct();

        expect(createTransactionThreadReport).toHaveBeenCalledTimes(1);

        await screen.hide();
        await screen.reveal();
        transitionTracker.firePendingCallbacks();
        await waitForBatchedUpdatesWithAct();

        expect(createTransactionThreadReport).toHaveBeenCalledTimes(1);
    });
});
