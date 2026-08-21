import {act} from '@testing-library/react-native';

import useClearReportActionDraftsOnReportChange from '@pages/inbox/report/useClearReportActionDraftsOnReportChange';
import useReportUnreadMessageScrollTracking from '@pages/inbox/report/useReportUnreadMessageScrollTracking';

import ONYXKEYS from '@src/ONYXKEYS';

import type * as ReactNavigation from '@react-navigation/native';
import type {ViewToken} from 'react-native';

import React, {useRef, useState} from 'react';
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
        await Onyx.clear();
    });

    describe('useClearReportActionDraftsOnReportChange', () => {
        function DraftProbe() {
            useClearReportActionDraftsOnReportChange(REPORT_ID);
            return null;
        }

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

    describe('useReportUnreadMessageScrollTracking', () => {
        /**
         * Renders the hook with an externally controllable unread-marker index, which is what the list changes when
         * the unread marker moves. The hook caches the last viewable items so it can recompute the "Latest messages"
         * pill without waiting for another scroll.
         */
        function renderScrollTracking() {
            const trackingRef: {current: ReturnType<typeof useReportUnreadMessageScrollTracking> | undefined} = {current: undefined};
            let setUnreadMarkerIndex: ((index: number) => void) | undefined;

            function Probe() {
                const [unreadMarkerReportActionIndex, setIndex] = useState(-1);
                setUnreadMarkerIndex = setIndex;
                const currentVerticalScrollingOffsetRef = useRef(0);

                trackingRef.current = useReportUnreadMessageScrollTracking({
                    reportID: REPORT_ID,
                    isInverted: true,
                    currentVerticalScrollingOffsetRef,
                    onUnreadActionVisible: () => {},
                    unreadMarkerReportActionIndex,
                    hasNewerActions: false,
                    onTrackScrolling: () => {},
                });

                return null;
            }

            const screen = renderCoverableScreen(<Probe />);

            return {
                ...screen,
                getTracking: () => trackingRef.current,
                setUnreadMarkerIndex: (index: number) => act(() => setUnreadMarkerIndex?.(index)),
            };
        }

        it('still knows which rows are on screen after the chat is covered and revealed', async () => {
            const screen = renderScrollTracking();

            // The user has scrolled the history up, so rows 20-30 are the ones on screen.
            const viewableItems: ViewToken[] = [20, 25, 30].map((index) => ({index, isViewable: true, item: {}, key: String(index)}));
            act(() => {
                screen.getTracking()?.onViewableItemsChanged({viewableItems, changed: []});
            });
            expect(screen.getTracking()?.isFloatingMessageCounterVisible).toBe(false);

            await screen.hide();
            await screen.reveal();

            // The unread marker lands below the visible window, which must raise the pill from the cached rows alone.
            screen.setUnreadMarkerIndex(5);

            expect(screen.getTracking()?.isFloatingMessageCounterVisible).toBe(true);
        });
    });
});
