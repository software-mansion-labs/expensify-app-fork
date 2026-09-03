import {act} from '@testing-library/react-native';

import useReportActionsScroll from '@hooks/useReportActionsScroll';
import type useReportScrollManager from '@hooks/useReportScrollManager';

import {ActionListContextProvider} from '@pages/inbox/ActionListContext';

import ONYXKEYS from '@src/ONYXKEYS';
import type * as OnyxTypes from '@src/types/onyx';

import type * as ReactNavigation from '@react-navigation/native';

import React, {useEffect, useState} from 'react';
import Onyx from 'react-native-onyx';

import {createMockReport, getFakeReportAction} from '../utils/ReportTestUtils';
import renderCoverableScreen from '../utils/ScreenCoverHarness';
import createTransitionTrackerHarness from '../utils/TransitionTrackerTestUtils';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

const REPORT_ID = '1';

jest.mock('@libs/Navigation/TransitionTracker', () => ({
    __esModule: true,
    default: {runAfterTransitions: jest.fn()},
}));

jest.mock('@libs/Navigation/Navigation', () => ({
    __esModule: true,
    default: {setParams: jest.fn(), navigate: jest.fn(), getReportRHPActiveRoute: jest.fn(() => undefined), setNavigationActionToMicrotaskQueue: jest.fn()},
}));

jest.mock('@libs/Navigation/helpers/isReportTopmostSplitNavigator', () => ({__esModule: true, default: () => true}));

jest.mock('@libs/actions/Report', () => ({
    openReport: jest.fn(),
    pruneReportActionPagesToNewestWindow: jest.fn(),
    subscribeToNewActionEvent: jest.fn(),
}));

jest.mock('@hooks/useCurrentUserPersonalDetails', () => () => ({accountID: 1, email: 'tester@expensify.com'}));

jest.mock('@hooks/useNetworkWithOfflineStatus', () => ({
    __esModule: true,
    default: () => ({isOffline: false, lastOfflineAt: {current: undefined}, lastOnlineAt: {current: undefined}}),
}));

jest.mock('@hooks/useReportScrollManager', () => {
    const reportScrollManager = {scrollToIndex: jest.fn(), scrollToBottom: jest.fn(), scrollToEnd: jest.fn(), scrollToOffset: jest.fn()};
    return {__esModule: true, default: () => reportScrollManager};
});

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof ReactNavigation>('@react-navigation/native'),
    useIsFocused: () => true,
    useRoute: () => ({params: {}}),
    useNavigation: () => ({setParams: jest.fn(), addListener: jest.fn(() => () => {}), isFocused: () => true}),
}));

const transitionTracker = createTransitionTrackerHarness();
const reportScrollManager = jest.requireMock<{default: typeof useReportScrollManager}>('@hooks/useReportScrollManager').default();

const lastAction = getFakeReportAction(2);
const sortedVisibleReportActions = [lastAction];

const report = createMockReport({
    reportID: REPORT_ID,
    lastMessageText: 'hey',
    lastVisibleActionCreated: lastAction.created,
    lastActorAccountID: 2,
});

function ScrollProbe() {
    const [treatAsNoPaginationAnchor, setTreatAsNoPaginationAnchor] = useState(false);

    useReportActionsScroll({
        reportID: REPORT_ID,
        report,
        transactionThreadReport: undefined,
        parentReportAction: undefined,
        sortedVisibleReportActions,
        renderedVisibleReportActions: sortedVisibleReportActions,
        keyExtractor: (item: OnyxTypes.ReportAction) => item.reportActionID,
        hasScrolledOverThreshold: true,
        markNewestActionAsRead: () => {},
        completeSkippedMarkAsRead: () => {},
        unreadMarkerReportActionID: null,
        unreadMarkerReportActionIndex: -1,
        hasNewerActions: false,
        draftAutoScrollKey: '',
        actionBadgeTargetIndex: -1,
        sortedAllReportActionsForPagination: sortedVisibleReportActions,
        treatAsNoPaginationAnchor,
        setTreatAsNoPaginationAnchor,
    });

    return null;
}

/**
 * The same probe for a chat opened with an unread marker, which is one of the two sources of `initialScrollKey`. The
 * marker clears while the screen stays mounted, the way it clears once the newest action has been read.
 */
function UnreadMarkerScrollProbe({onMount}: {onMount: (clearUnreadMarker: () => void) => void}) {
    const [unreadMarkerReportActionID, setUnreadMarkerReportActionID] = useState<string | null>(lastAction.reportActionID);
    const [treatAsNoPaginationAnchor, setTreatAsNoPaginationAnchor] = useState(false);

    useEffect(() => {
        onMount(() => setUnreadMarkerReportActionID(null));
    }, [onMount]);

    useReportActionsScroll({
        reportID: REPORT_ID,
        report,
        transactionThreadReport: undefined,
        parentReportAction: undefined,
        sortedVisibleReportActions,
        renderedVisibleReportActions: sortedVisibleReportActions,
        keyExtractor: (item: OnyxTypes.ReportAction) => item.reportActionID,
        hasScrolledOverThreshold: true,
        markNewestActionAsRead: () => {},
        completeSkippedMarkAsRead: () => {},
        unreadMarkerReportActionID,
        unreadMarkerReportActionIndex: unreadMarkerReportActionID ? 0 : -1,
        hasNewerActions: false,
        draftAutoScrollKey: '',
        actionBadgeTargetIndex: -1,
        sortedAllReportActionsForPagination: sortedVisibleReportActions,
        treatAsNoPaginationAnchor,
        setTreatAsNoPaginationAnchor,
    });

    return null;
}

/**
 * `useReportActionsScroll` schedules the initial scroll-to-bottom behind the entry transition exactly once, on mount;
 * its own comment states that re-running it would yank the user back down while they read history. Covering the chat
 * with a thread and coming back must not schedule that scroll again. The assertions describe behavior that ships today.
 */
describe('useReportActionsScroll across a cover/reveal cycle', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        transitionTracker.install();
        await Onyx.clear();
    });

    it('schedules the initial scroll-to-bottom once, not again after a reveal', async () => {
        const screen = renderCoverableScreen(
            <ActionListContextProvider>
                <ScrollProbe />
            </ActionListContextProvider>,
        );
        await waitForBatchedUpdatesWithAct();

        // The entry transition ends and the mount-time schedule scrolls the list to the newest message.
        transitionTracker.firePendingCallbacks();
        expect(reportScrollManager.scrollToBottom).toHaveBeenCalledTimes(1);

        // The user scrolls up to read history, opens a thread and comes back.
        await screen.hide();
        await screen.reveal();
        await waitForBatchedUpdatesWithAct();

        // The pop transition back to the chat completes; the once-per-lifetime schedule must not yank the list again.
        transitionTracker.firePendingCallbacks();
        expect(reportScrollManager.scrollToBottom).toHaveBeenCalledTimes(1);
    });

    it('does not schedule the initial scroll-to-bottom after a reveal when the unread marker that suppressed it has cleared', async () => {
        let clearUnreadMarker = () => {};
        const screen = renderCoverableScreen(
            <ActionListContextProvider>
                <UnreadMarkerScrollProbe onMount={(clear) => (clearUnreadMarker = clear)} />
            </ActionListContextProvider>,
        );
        await waitForBatchedUpdatesWithAct();

        // The unread marker positions the list itself, so the mount run declines the scroll-to-bottom.
        transitionTracker.firePendingCallbacks();
        expect(reportScrollManager.scrollToBottom).not.toHaveBeenCalled();

        // The user reads the new messages, the marker clears, and they scroll up into history.
        act(() => clearUnreadMarker());
        await waitForBatchedUpdatesWithAct();

        // They open a thread from an old message and come back.
        await screen.hide();
        await screen.reveal();
        await waitForBatchedUpdatesWithAct();

        // The question of where the list starts was settled on mount; a cleared marker must not answer it again.
        transitionTracker.firePendingCallbacks();
        expect(reportScrollManager.scrollToBottom).not.toHaveBeenCalled();
    });
});
