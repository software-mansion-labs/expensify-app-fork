import {renderHook} from '@testing-library/react-native';

import {SidebarOrderedReportsLazyContextProvider, useSidebarOrderedReportsState} from '@hooks/useSidebarOrderedReports';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';
import type {LHNReportAttributes} from '@src/types/onyx/DerivedValues';

import React from 'react';
import Onyx from 'react-native-onyx';

import * as TestHelper from '../utils/TestHelper';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

const makeRoom = (reportID: string, lastVisibleActionCreated: string, isPinned = false): Report => ({
    reportID,
    type: CONST.REPORT.TYPE.CHAT,
    chatType: CONST.REPORT.CHAT_TYPE.POLICY_ROOM,
    reportName: `#${reportID}`,
    lastVisibleActionCreated,
    isPinned,
});

const makeProjection = (report: Report, overrides: Partial<LHNReportAttributes> = {}): LHNReportAttributes => ({
    reportName: report.reportName ?? '',
    sortName: (report.reportName ?? '').toLowerCase(),
    lhnEligibleDefault: 1,
    lhnEligibleFocus: 1,
    isPinned: report.isPinned ? 1 : 0,
    isArchived: 0,
    lastVisibleActionCreated: report.lastVisibleActionCreated ?? '',
    brickRoadStatus: undefined,
    requiresAttention: 0,
    ...overrides,
});

const seedReportWithProjection = async (report: Report, overrides: Partial<LHNReportAttributes> = {}) => {
    await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${report.reportID}`, report);
    await Onyx.set(`${ONYXKEYS.COLLECTION.DERIVED_REPORT_ATTRIBUTES}${report.reportID}`, makeProjection(report, overrides));
};

const wrapper = ({children}: {children: React.ReactNode}) => <SidebarOrderedReportsLazyContextProvider>{children}</SidebarOrderedReportsLazyContextProvider>;

TestHelper.setupApp();

describe('SidebarOrderedReportsLazyContextProvider (SOTA LHN)', () => {
    beforeEach(async () => {
        await Onyx.clear();
        await Onyx.set(ONYXKEYS.NVP_PRIORITY_MODE, CONST.PRIORITY_MODE.DEFAULT);
        await waitForBatchedUpdatesWithAct();
    });

    it('orders eligible reports by recency from the indexed projection window', async () => {
        // Given two eligible rooms with different recency.
        await seedReportWithProjection(makeRoom('older', '2026-01-01T00:00:00.000Z'));
        await seedReportWithProjection(makeRoom('newer', '2026-02-01T00:00:00.000Z'));
        await waitForBatchedUpdatesWithAct();

        const {result} = renderHook(() => useSidebarOrderedReportsState(), {wrapper});
        await waitForBatchedUpdatesWithAct();

        // Then the LHN lists them most-recent first — read from the projection query, not a collection scan.
        expect(result.current.orderedReportIDs).toEqual(['newer', 'older']);
        expect(result.current.filteredReports.map((report) => report.reportID)).toEqual(['newer', 'older']);
    });

    it('excludes members the projection marks ineligible', async () => {
        await seedReportWithProjection(makeRoom('visible', '2026-02-01T00:00:00.000Z'));
        await seedReportWithProjection(makeRoom('hidden', '2026-03-01T00:00:00.000Z'), {lhnEligibleDefault: 0, lhnEligibleFocus: 0});
        await waitForBatchedUpdatesWithAct();

        const {result} = renderHook(() => useSidebarOrderedReportsState(), {wrapper});
        await waitForBatchedUpdatesWithAct();

        expect(result.current.orderedReportIDs).toEqual(['visible']);
    });

    it('sorts pinned reports into the top group regardless of recency', async () => {
        await seedReportWithProjection(makeRoom('recent', '2026-03-01T00:00:00.000Z'));
        await seedReportWithProjection(makeRoom('pinnedOld', '2026-01-01T00:00:00.000Z', true));
        await waitForBatchedUpdatesWithAct();

        const {result} = renderHook(() => useSidebarOrderedReportsState(), {wrapper});
        await waitForBatchedUpdatesWithAct();

        expect(result.current.orderedReportIDs).toEqual(['pinnedOld', 'recent']);
    });

    it('shows a drafted report even when the projection marks it ineligible', async () => {
        await seedReportWithProjection(makeRoom('visible', '2026-02-01T00:00:00.000Z'));
        await seedReportWithProjection(makeRoom('drafted', '2026-01-01T00:00:00.000Z'), {lhnEligibleDefault: 0, lhnEligibleFocus: 0});
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}drafted`, 'draft in progress');
        await waitForBatchedUpdatesWithAct();

        const {result} = renderHook(() => useSidebarOrderedReportsState(), {wrapper});
        await waitForBatchedUpdatesWithAct();

        expect(result.current.orderedReportIDs).toContain('drafted');
        expect(result.current.orderedReportIDs).toContain('visible');
    });

    it('reflects a live projection update (new report arrives)', async () => {
        await seedReportWithProjection(makeRoom('first', '2026-01-01T00:00:00.000Z'));
        await waitForBatchedUpdatesWithAct();

        const {result} = renderHook(() => useSidebarOrderedReportsState(), {wrapper});
        await waitForBatchedUpdatesWithAct();
        expect(result.current.orderedReportIDs).toEqual(['first']);

        // When a newer report and its projection land (as the engine would write them).
        await seedReportWithProjection(makeRoom('second', '2026-02-01T00:00:00.000Z'));
        // The query's live updates reconcile on a short real-time debounce; give it time to settle.
        await new Promise((resolve) => {
            setTimeout(resolve, 120);
        });
        await waitForBatchedUpdatesWithAct();

        expect(result.current.orderedReportIDs).toEqual(['second', 'first']);
    });
});
