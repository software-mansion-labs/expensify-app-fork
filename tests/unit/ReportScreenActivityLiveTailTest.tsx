import {act} from '@testing-library/react-native';

import useReportActionsNewActionLiveTail from '@pages/inbox/report/useReportActionsNewActionLiveTail';

import type * as OnyxTypes from '@src/types/onyx';

import React, {useEffect, useState} from 'react';

import {getFakeReportAction} from '../utils/ReportTestUtils';
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
    default: {setParams: jest.fn(), getReportRHPActiveRoute: jest.fn(() => undefined), setNavigationActionToMicrotaskQueue: jest.fn()},
}));

jest.mock('@libs/Navigation/helpers/isReportTopmostSplitNavigator', () => ({__esModule: true, default: () => true}));

jest.mock('@libs/actions/Report', () => ({
    openReport: jest.fn(),
    pruneReportActionPagesToNewestWindow: jest.fn(),
    subscribeToNewActionEvent: jest.fn(),
}));

jest.mock('@hooks/useCurrentUserPersonalDetails', () => () => ({accountID: 1, email: 'tester@expensify.com'}));

type NewActionHandler = (isFromCurrentUser: boolean, action?: OnyxTypes.ReportAction) => void;

const {openReport, pruneReportActionPagesToNewestWindow, subscribeToNewActionEvent} = jest.requireMock<{
    openReport: jest.Mock;
    pruneReportActionPagesToNewestWindow: jest.Mock;
    subscribeToNewActionEvent: jest.Mock<() => void, [string, NewActionHandler]>;
}>('@libs/actions/Report');

const transitionTracker = createTransitionTrackerHarness();

type LiveTail = ReturnType<typeof useReportActionsNewActionLiveTail>;

const publishedLiveTail: {current: LiveTail | undefined} = {current: undefined};
const publishedFinishInitialLoad: {current: (() => void) | undefined} = {current: undefined};
const setTreatAsNoPaginationAnchor = jest.fn();

function LiveTailProbe() {
    // The initial report actions load is in flight until the openReport triggered by the jump resolves.
    const [isLoadingInitialReportActions, setIsLoadingInitialReportActions] = useState(true);

    const liveTail = useReportActionsNewActionLiveTail({
        reportID: REPORT_ID,
        introSelected: undefined,
        betas: undefined,
        isOffline: false,
        reportScrollManager: {scrollToIndex: jest.fn(), scrollToBottom: jest.fn(), scrollToEnd: jest.fn(), scrollToOffset: jest.fn()},
        setIsFloatingMessageCounterVisible: jest.fn(),
        setActionIdToHighlight: jest.fn(),
        unreadMarkerReportActionID: '200',
        hasNewerActions: true,
        linkedReportActionID: undefined,
        hasNewestReportAction: true,
        sortedVisibleReportActions: [],
        sortedAllReportActionsForPagination: [],
        reportActionPages: undefined,
        setTreatAsNoPaginationAnchor,
        treatAsNoPaginationAnchor: false,
        prevIsLoadingInitialReportActions: true,
        reportLoadingState: {isLoadingInitialReportActions},
    });

    useEffect(() => {
        publishedLiveTail.current = liveTail;
        publishedFinishInitialLoad.current = () => setIsLoadingInitialReportActions(false);
    });

    return null;
}

/**
 * The live-tail jump is a four-stage machine (idle -> open_report -> await_scroll -> await_prune) that spans several
 * renders and an `openReport` round trip. Covering the chat with a thread mid-jump must not rewind it, or the list is
 * left permanently without its pagination anchor. The assertion describes behavior that ships today.
 */
describe('useReportActionsNewActionLiveTail across a cover/reveal cycle', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        transitionTracker.install();
        publishedLiveTail.current = undefined;
        publishedFinishInitialLoad.current = undefined;
    });

    function renderLiveTail() {
        const screen = renderCoverableScreen(<LiveTailProbe />);

        return {
            ...screen,
            getLiveTail: () => publishedLiveTail.current,
            finishInitialLoad: () =>
                act(async () => {
                    publishedFinishInitialLoad.current?.();
                    // The hook defers its scroll flag to a microtask, which has to settle inside the same act block.
                    await Promise.resolve();
                }),
            getNewActionHandler: () => subscribeToNewActionEvent.mock.calls.at(-1)?.[1],
        };
    }

    it('finishes a live-tail jump that was started before the chat was covered', async () => {
        const screen = renderLiveTail();
        await waitForBatchedUpdatesWithAct();

        // The user sends a message while scrolled away from the newest action, which starts the jump.
        act(() => screen.getNewActionHandler()?.(true, getFakeReportAction(300)));
        transitionTracker.firePendingCallbacks();
        await waitForBatchedUpdatesWithAct();
        expect(openReport).toHaveBeenCalledTimes(1);

        // Covering the chat with a thread while the openReport for the jump is still in flight.
        await screen.hide();
        await screen.reveal();
        await waitForBatchedUpdatesWithAct();

        // The fetch lands and the list reaches the newest action, which should walk the machine to its last stage.
        await screen.finishInitialLoad();
        await waitForBatchedUpdatesWithAct();

        // The list reports its layout, which is where the jump prunes the older pages and releases the anchor.
        act(() => screen.getLiveTail()?.completeLiveTailPruneAfterScrollToBottom());

        expect(pruneReportActionPagesToNewestWindow).toHaveBeenCalledTimes(1);
        expect(setTreatAsNoPaginationAnchor).toHaveBeenCalledWith(false);
    });

    // The subscription made at mount must be the one still standing after the cycle, never torn down and rebuilt,
    // because any teardown window drops the new-action events Pusher delivers while the chat is covered.
    it('stays subscribed to the new-action channel after the chat is covered and revealed', async () => {
        const unsubscribe = jest.fn();
        subscribeToNewActionEvent.mockReturnValue(unsubscribe);

        const screen = renderLiveTail();
        await waitForBatchedUpdatesWithAct();
        expect(subscribeToNewActionEvent).toHaveBeenCalledTimes(1);

        await screen.hide();
        await screen.reveal();
        await waitForBatchedUpdatesWithAct();

        expect(unsubscribe).not.toHaveBeenCalled();
        expect(subscribeToNewActionEvent).toHaveBeenCalledTimes(1);
    });
});
