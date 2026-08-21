import ReportFetchHandler from '@pages/inbox/ReportFetchHandler';

import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';

import type * as ReactNavigation from '@react-navigation/native';

import React from 'react';
import Onyx from 'react-native-onyx';

import renderCoverableScreen from '../utils/ScreenCoverHarness';
import createTransitionTrackerHarness from '../utils/TransitionTrackerTestUtils';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

const REPORT_ID = '1';

const mockRoute = {key: 'report-route-key', name: SCREENS.REPORT, params: {reportID: REPORT_ID}};

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof ReactNavigation>('@react-navigation/native'),
    useRoute: () => mockRoute,
    useNavigation: () => ({setParams: jest.fn(), addListener: jest.fn(() => () => {}), getState: jest.fn(() => ({routes: []}))}),
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

jest.mock('@hooks/useCurrentUserPersonalDetails', () => () => ({accountID: 1, email: 'tester@expensify.com'}));
jest.mock('@hooks/usePaginatedReportActions', () => () => ({reportActions: [], linkedAction: undefined}));
jest.mock('@hooks/useReportTransactionsCollection', () => () => ({}));
jest.mock('@hooks/useIsOwnWorkspaceChatRef', () => () => ({current: false}));
jest.mock('@hooks/useIsReportActionsLoaded', () => () => true);
jest.mock('@hooks/useIsAnonymousUser', () => () => false);
jest.mock('@hooks/useIsInSidePanel', () => () => false);
jest.mock('@hooks/useNetwork', () => () => ({isOffline: false}));

const {openReport, subscribeToReportLeavingEvents, unsubscribeFromLeavingRoomReportChannel, updateLoadingInitialReportAction} = jest.requireMock<{
    openReport: jest.Mock;
    subscribeToReportLeavingEvents: jest.Mock;
    unsubscribeFromLeavingRoomReportChannel: jest.Mock;
    updateLoadingInitialReportAction: jest.Mock;
}>('@userActions/Report');

const transitionTracker = createTransitionTrackerHarness();

/**
 * `ReportFetchHandler` owns the fetch, subscription and loading-state work of the chat window. Covering the chat with
 * a thread and revealing it again must not repeat any of that work, and must not tear down what it set up. Every
 * assertion describes behavior that ships today, so the suite passes against the current `freeze` behavior.
 */
describe('ReportFetchHandler across a cover/reveal cycle', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        transitionTracker.install();
        await Onyx.clear();
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID}`, {reportID: REPORT_ID, type: 'chat'});
        await Onyx.merge(`${ONYXKEYS.COLLECTION.RAM_ONLY_REPORT_LOADING_STATE}${REPORT_ID}`, {hasOnceLoadedReportActions: true, isLoadingInitialReportActions: false});
    });

    async function renderFetchHandler(options?: {startCovered: boolean}) {
        const screen = renderCoverableScreen(<ReportFetchHandler />, options);
        await waitForBatchedUpdatesWithAct();
        // The leaving-events subscription is scheduled behind the navigation transition.
        transitionTracker.firePendingCallbacks();
        await waitForBatchedUpdatesWithAct();
        return screen;
    }

    it('stays subscribed to the leaving-room channel after the chat is covered and revealed', async () => {
        const screen = await renderFetchHandler();
        expect(subscribeToReportLeavingEvents).toHaveBeenCalledTimes(1);

        await screen.hide();
        await screen.reveal();
        transitionTracker.firePendingCallbacks();
        await waitForBatchedUpdatesWithAct();

        // Either the channel was never dropped, or it was dropped and subscribed again. What must not happen is a
        // teardown with no matching re-subscription, which leaves the room silently unwatched.
        expect(subscribeToReportLeavingEvents.mock.calls.length).toBeGreaterThanOrEqual(unsubscribeFromLeavingRoomReportChannel.mock.calls.length + 1);
    });

    it('does not re-run openReport when the chat is revealed', async () => {
        const screen = await renderFetchHandler();
        expect(openReport).toHaveBeenCalledTimes(1);
        openReport.mockClear();

        await screen.hide();
        await screen.reveal();
        await waitForBatchedUpdatesWithAct();

        expect(openReport).not.toHaveBeenCalled();
    });

    it('fetches and subscribes exactly once for a report that mounts already covered', async () => {
        // A thread opened from a deep link mounts its parent chat underneath it, and that chat is the one the user
        // lands on after a back press, so it has to be fetched and subscribed at mount and not again on the reveal.
        const screen = await renderFetchHandler({startCovered: true});
        expect(openReport).toHaveBeenCalledTimes(1);
        expect(subscribeToReportLeavingEvents).toHaveBeenCalledTimes(1);

        await screen.reveal();
        transitionTracker.firePendingCallbacks();
        await waitForBatchedUpdatesWithAct();

        expect(openReport).toHaveBeenCalledTimes(1);
        expect(subscribeToReportLeavingEvents).toHaveBeenCalledTimes(1);
    });

    it('does not push the report back into its initial loading state on reveal', async () => {
        await Onyx.merge(`${ONYXKEYS.COLLECTION.RAM_ONLY_REPORT_LOADING_STATE}${REPORT_ID}`, {hasOnceLoadedReportActions: false});
        const screen = await renderFetchHandler();
        updateLoadingInitialReportAction.mockClear();

        await screen.hide();
        await screen.reveal();
        await waitForBatchedUpdatesWithAct();

        expect(updateLoadingInitialReportAction).not.toHaveBeenCalled();
    });
});
