import {renderHook} from '@testing-library/react-native';

import {SidebarOrderedReportsLazyContextProvider, useSidebarOrderedReportsState} from '@hooks/useSidebarOrderedReports';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';

import React from 'react';
import Onyx from 'react-native-onyx';

import * as TestHelper from '../utils/TestHelper';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

const CURRENT_USER_ACCOUNT_ID = 1;

const makeRoom = (reportID: string, lastVisibleActionCreated: string, isPinned = false): Report => ({
    reportID,
    type: CONST.REPORT.TYPE.CHAT,
    chatType: CONST.REPORT.CHAT_TYPE.POLICY_ROOM,
    reportName: `#${reportID}`,
    lastVisibleActionCreated,
    lastMessageText: 'hello',
    isPinned,
    participants: {[CURRENT_USER_ACCOUNT_ID]: {notificationPreference: 'always'}},
});

// A chat the current user hid — the materializer marks it LHN-ineligible.
const makeHiddenChat = (reportID: string, lastVisibleActionCreated: string): Report => ({
    reportID,
    type: CONST.REPORT.TYPE.CHAT,
    lastVisibleActionCreated,
    lastMessageText: 'hello',
    participants: {[CURRENT_USER_ACCOUNT_ID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.HIDDEN}},
});

// The scoped materializer computes projections asynchronously and the provider's query reconciles on
// a short real-time debounce — give both time to settle.
const settle = async () => {
    await waitForBatchedUpdatesWithAct();
    await new Promise((resolve) => {
        setTimeout(resolve, 120);
    });
    await waitForBatchedUpdatesWithAct();
};

const wrapper = ({children}: {children: React.ReactNode}) => <SidebarOrderedReportsLazyContextProvider>{children}</SidebarOrderedReportsLazyContextProvider>;

TestHelper.setupApp();

describe('SidebarOrderedReportsLazyContextProvider (SOTA LHN, end-to-end with the scoped materializer)', () => {
    beforeEach(async () => {
        await Onyx.clear();
        await Onyx.set(ONYXKEYS.NVP_PRIORITY_MODE, CONST.PRIORITY_MODE.DEFAULT);
        await Onyx.set(ONYXKEYS.SESSION, {accountID: CURRENT_USER_ACCOUNT_ID, email: 'current@test.com'});
        await waitForBatchedUpdatesWithAct();
    });

    it('orders eligible reports by recency from the indexed projection window', async () => {
        // Given two eligible rooms with different recency — the materializer projects them.
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}older`, makeRoom('older', '2026-01-01T00:00:00.000Z'));
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}newer`, makeRoom('newer', '2026-02-01T00:00:00.000Z'));
        await settle();

        const {result} = renderHook(() => useSidebarOrderedReportsState(), {wrapper});
        await settle();

        // Then the LHN lists them most-recent first — read from the projection query, not a collection scan.
        expect(result.current.orderedReportIDs).toEqual(['newer', 'older']);
        expect(result.current.filteredReports.map((report) => report.reportID)).toEqual(['newer', 'older']);
    });

    it('excludes reports the materializer marks ineligible', async () => {
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}visible`, makeRoom('visible', '2026-02-01T00:00:00.000Z'));
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}hidden`, makeHiddenChat('hidden', '2026-03-01T00:00:00.000Z'));
        await settle();

        const {result} = renderHook(() => useSidebarOrderedReportsState(), {wrapper});
        await settle();

        expect(result.current.orderedReportIDs).toEqual(['visible']);
    });

    it('sorts pinned reports into the top group regardless of recency', async () => {
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}recent`, makeRoom('recent', '2026-03-01T00:00:00.000Z'));
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}pinnedOld`, makeRoom('pinnedOld', '2026-01-01T00:00:00.000Z', true));
        await settle();

        const {result} = renderHook(() => useSidebarOrderedReportsState(), {wrapper});
        await settle();

        expect(result.current.orderedReportIDs).toEqual(['pinnedOld', 'recent']);
    });

    it('shows a drafted report even when it is otherwise ineligible', async () => {
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}visible`, makeRoom('visible', '2026-02-01T00:00:00.000Z'));
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}drafted`, makeHiddenChat('drafted', '2026-01-01T00:00:00.000Z'));
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}drafted`, 'draft in progress');
        await settle();

        const {result} = renderHook(() => useSidebarOrderedReportsState(), {wrapper});
        await settle();

        expect(result.current.orderedReportIDs).toContain('drafted');
        expect(result.current.orderedReportIDs).toContain('visible');
    });

    it('reflects a live update (new report arrives after mount)', async () => {
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}first`, makeRoom('first', '2026-01-01T00:00:00.000Z'));
        await settle();

        const {result} = renderHook(() => useSidebarOrderedReportsState(), {wrapper});
        await settle();
        expect(result.current.orderedReportIDs).toEqual(['first']);

        // When a newer report lands — the materializer projects it and the window query picks it up.
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}second`, makeRoom('second', '2026-02-01T00:00:00.000Z'));
        await settle();

        expect(result.current.orderedReportIDs).toEqual(['second', 'first']);
    });
});
