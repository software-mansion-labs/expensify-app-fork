import {act} from '@testing-library/react-native';

import useOnyx from '@hooks/useOnyx';

import {ActionListContextProvider, useActionListContext, useActionListRef} from '@pages/inbox/ActionListContext';
import useClearReportActionDraftsOnReportChange from '@pages/inbox/report/useClearReportActionDraftsOnReportChange';
import useReportUnreadMessageScrollTracking from '@pages/inbox/report/useReportUnreadMessageScrollTracking';

import ONYXKEYS from '@src/ONYXKEYS';

import type * as ReactNavigation from '@react-navigation/native';
import type {ViewToken} from 'react-native';

import React, {useEffect, useRef, useState} from 'react';
import Onyx from 'react-native-onyx';

import getOnyxValue from '../utils/getOnyxValue';
import renderCoverableScreen from '../utils/ScreenCoverHarness';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof ReactNavigation>('@react-navigation/native'),
    useIsFocused: () => true,
}));

const REPORT_ID = '1';
const REPORT_ACTION_ID = '100';

type ScrollTracking = ReturnType<typeof useReportUnreadMessageScrollTracking>;

const publishedActionListContext: {current: ReturnType<typeof useActionListContext> | undefined} = {current: undefined};
const publishedScrollTracking: {current: ScrollTracking | undefined} = {current: undefined};
const publishedSetUnreadMarkerIndex: {current: ((index: number) => void) | undefined} = {current: undefined};
let renderedReportNames: Array<string | undefined> = [];

function DraftProbe() {
    useClearReportActionDraftsOnReportChange(REPORT_ID);
    return null;
}

function ListRefProbe() {
    useActionListRef();
    return null;
}

function ActionListContextReader() {
    const actionListContext = useActionListContext();

    useEffect(() => {
        publishedActionListContext.current = actionListContext;
    });

    return null;
}

function OnyxProbe() {
    const [report] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID}`);
    const reportName = report?.reportName;

    useEffect(() => {
        renderedReportNames.push(reportName);
    });

    return null;
}

/**
 * Drives the scroll tracker with an externally controllable unread-marker index, which is what the list changes when
 * the unread marker moves. The hook caches the last viewable items so it can recompute the "Latest messages" pill
 * without waiting for another scroll.
 */
function ScrollTrackingProbe() {
    const [unreadMarkerReportActionIndex, setUnreadMarkerReportActionIndex] = useState(-1);
    const currentVerticalScrollingOffsetRef = useRef(0);

    const scrollTracking = useReportUnreadMessageScrollTracking({
        reportID: REPORT_ID,
        isInverted: true,
        currentVerticalScrollingOffsetRef,
        onUnreadActionVisible: () => {},
        unreadMarkerReportActionIndex,
        hasNewerActions: false,
        onTrackScrolling: () => {},
    });

    useEffect(() => {
        publishedScrollTracking.current = scrollTracking;
        publishedSetUnreadMarkerIndex.current = setUnreadMarkerReportActionIndex;
    }, [scrollTracking, setUnreadMarkerReportActionIndex]);

    return null;
}

/**
 * State that the user built up inside the chat window has to survive the window being covered by a thread and
 * revealed again on the way back. Every assertion here describes behavior that ships today, so the suite passes
 * against the current `freeze` behavior and reports what changes once the screen opts into `<Activity>`.
 */
describe('Report screen state across a cover/reveal cycle', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        publishedActionListContext.current = undefined;
        publishedScrollTracking.current = undefined;
        publishedSetUnreadMarkerIndex.current = undefined;
        renderedReportNames = [];
        await Onyx.clear();
    });

    describe('useClearReportActionDraftsOnReportChange', () => {
        it('keeps an in-progress message edit when the chat is covered by a thread', async () => {
            const screen = renderCoverableScreen(<DraftProbe />);
            await waitForBatchedUpdatesWithAct();

            // The user starts editing a message after the screen mounted, so the mount-time clear already ran.
            await act(async () => {
                await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS}${REPORT_ID}`, {[REPORT_ACTION_ID]: {message: 'half written edit'}});
            });

            await screen.hide();
            await waitForBatchedUpdatesWithAct();

            const draftsWhileCovered = await getOnyxValue(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS}${REPORT_ID}`);

            expect(draftsWhileCovered).toEqual({[REPORT_ACTION_ID]: {message: 'half written edit'}});
        });
    });

    describe('useActionListRef', () => {
        it('keeps the report list reachable through the context while the chat is covered', async () => {
            // The provider stays outside the covered screen here because what matters is the caller: scroll managers,
            // transition callbacks and gesture handlers keep running and resolve the list through `getListRef()`.
            const screen = renderCoverableScreen(
                <ActionListContextProvider>
                    <ActionListContextReader />
                    <ListRefProbe />
                </ActionListContextProvider>,
            );
            await waitForBatchedUpdatesWithAct();
            expect(publishedActionListContext.current?.getListRef()).not.toBeNull();

            await screen.hide();
            await waitForBatchedUpdatesWithAct();

            expect(publishedActionListContext.current?.getListRef()).not.toBeNull();
        });
    });

    describe('useOnyx under a cover', () => {
        it('still reflects the newest Onyx value while the chat is covered', async () => {
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID}`, {reportID: REPORT_ID, reportName: 'before'});
            const screen = renderCoverableScreen(<OnyxProbe />);
            await waitForBatchedUpdatesWithAct();
            expect(renderedReportNames.at(-1)).toBe('before');

            await screen.hide();
            await act(async () => {
                await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID}`, {reportName: 'after'});
            });
            await waitForBatchedUpdatesWithAct();

            // `useOnyx` is a `useSyncExternalStore`, so its subscription lives and dies with the effects. A covered
            // screen that stops receiving updates keeps showing stale content for as long as it stays painted.
            expect(renderedReportNames.at(-1)).toBe('after');
        });

        it('catches up with Onyx on the reveal in both behaviors', async () => {
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID}`, {reportID: REPORT_ID, reportName: 'before'});
            const screen = renderCoverableScreen(<OnyxProbe />);
            await waitForBatchedUpdatesWithAct();

            await screen.hide();
            await act(async () => {
                await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID}`, {reportName: 'after'});
            });
            await screen.reveal();
            await waitForBatchedUpdatesWithAct();

            expect(renderedReportNames.at(-1)).toBe('after');
        });
    });

    describe('useReportUnreadMessageScrollTracking', () => {
        it('still knows which rows are on screen after the chat is covered and revealed', async () => {
            const screen = renderCoverableScreen(<ScrollTrackingProbe />);
            await waitForBatchedUpdatesWithAct();

            // The user has scrolled the history up, so rows 20-30 are the ones on screen.
            const viewableItems: ViewToken[] = [20, 25, 30].map((index) => ({index, isViewable: true, item: {}, key: String(index)}));
            act(() => {
                publishedScrollTracking.current?.onViewableItemsChanged({viewableItems, changed: []});
            });
            expect(publishedScrollTracking.current?.isFloatingMessageCounterVisible).toBe(false);

            await screen.hide();
            await screen.reveal();

            // The unread marker lands below the visible window, which must raise the pill from the cached rows alone.
            act(() => {
                publishedSetUnreadMarkerIndex.current?.(5);
            });

            expect(publishedScrollTracking.current?.isFloatingMessageCounterVisible).toBe(true);
        });
    });
});
