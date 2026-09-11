import {feedLhnOrderIndex, getLhnOrderIndexStats, getLhnOrderSnapshot, resetLhnOrderIndexStore} from '@libs/LhnOrderIndex/LhnOrderIndexStore';
import type {LhnIndexInputs} from '@libs/LhnOrderIndex/types';
import SidebarUtils from '@libs/SidebarUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import {buildLhnIndexInputs, REPORT_COUNT, sidebarOrder, withoutReport, withReportChange} from '../../utils/collections/lhnIndexInputs';
import {flushMockEngineReplies, getMockEngineLhnRowCount, resetMockEngine, setMockEngineAvailable, setMockEngineDeferred} from '../../utils/mockSqlEngineClient';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- a jest.mock factory cannot reach a typed import
jest.mock('@libs/SqlEngine/EngineClient', () => require('../../utils/mockSqlEngineClient'));

/** Feeds one version and waits for the reply, the way the hook does through its effect. */
async function feed(inputs: LhnIndexInputs) {
    feedLhnOrderIndex(inputs, 'default');
    await waitForBatchedUpdates();
}

describe('LhnOrderIndexStore parity with the sidebar sort', () => {
    beforeEach(() => {
        resetMockEngine();
        resetLhnOrderIndexStore();
        setMockEngineAvailable(true);
    });

    it('orders the first full feed the way the sidebar does', async () => {
        const inputs = buildLhnIndexInputs();
        await feed(inputs);

        expect(getLhnOrderSnapshot()?.reportIDs).toEqual(sidebarOrder(inputs));
        expect(getMockEngineLhnRowCount()).toBe(REPORT_COUNT);
        expect(getLhnOrderIndexStats().lastUpsertCount).toBe(REPORT_COUNT);
    });

    it('rebuilds one row for a write to one report and still matches the sidebar', async () => {
        const first = buildLhnIndexInputs();
        await feed(first);

        const second = withReportChange(first, '5', {lastVisibleActionCreated: '2024-03-31 23:00:00.000'});
        await feed(second);

        expect(getLhnOrderIndexStats().lastUpsertCount).toBe(1);
        expect(getLhnOrderSnapshot()?.reportIDs).toEqual(sidebarOrder(second));
    });

    it('follows a display name that only changed in the derived attributes', async () => {
        const first = buildLhnIndexInputs();
        await feed(first);

        const renamedReportID = '12';
        const renamed: LhnIndexInputs = {
            ...first,
            reportAttributes: {
                ...first.reportAttributes,
                [renamedReportID]: {reportName: 'Aaa renamed', isEmpty: false, brickRoadStatus: undefined, requiresAttention: false, reportErrors: {}},
            },
        };
        await feed(renamed);

        expect(getLhnOrderIndexStats().lastUpsertCount).toBe(1);
        expect(getLhnOrderSnapshot()?.reportIDs).toEqual(sidebarOrder(renamed));
    });

    it('moves a report to the draft group when a draft appears', async () => {
        const first = buildLhnIndexInputs();
        await feed(first);

        const draftKey: `${typeof ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}${string}` = `${ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}3`;
        const withDraft: LhnIndexInputs = {...first, draftComments: {...first.draftComments, [draftKey]: 'a new draft'}};
        await feed(withDraft);

        expect(getLhnOrderIndexStats().lastUpsertCount).toBe(1);
        expect(getLhnOrderSnapshot()?.reportIDs).toEqual(sidebarOrder(withDraft));
    });

    it('drops a report that left the displayed set', async () => {
        const first = buildLhnIndexInputs();
        await feed(first);

        const withoutOne = withoutReport(first, '8');
        await feed(withoutOne);

        expect(getLhnOrderIndexStats().lastDeleteCount).toBe(1);
        expect(getMockEngineLhnRowCount()).toBe(REPORT_COUNT - 1);
        expect(getLhnOrderSnapshot()?.reportIDs).toEqual(sidebarOrder(withoutOne));
    });

    it('keeps the two Inbox tabs in the same order as the sidebar filter', async () => {
        const inputs = buildLhnIndexInputs();
        await feed(inputs);
        const ordered = sidebarOrder(inputs);

        expect(getLhnOrderSnapshot()?.unreadReportIDs).toEqual(SidebarUtils.filterReportsForInboxTab(ordered, inputs.reportsToDisplay, CONST.INBOX_TAB.UNREAD));
        expect(getLhnOrderSnapshot()?.todoReportIDs).toEqual(SidebarUtils.filterReportsForInboxTab(ordered, inputs.reportsToDisplay, CONST.INBOX_TAB.TODO));
    });

    it('sends nothing when no input changed', async () => {
        const inputs = buildLhnIndexInputs();
        await feed(inputs);
        const feedCount = getLhnOrderIndexStats().feedCount;

        await feed(inputs);

        expect(getLhnOrderIndexStats().feedCount).toBe(feedCount);
    });

    it('drops a reply that a newer write already replaced', async () => {
        const first = buildLhnIndexInputs();
        await feed(first);

        setMockEngineDeferred(true);
        const stale = withReportChange(first, '2', {lastVisibleActionCreated: '2024-03-31 20:00:00.000'});
        feedLhnOrderIndex(stale, 'default');
        const newest = withReportChange(stale, '2', {lastVisibleActionCreated: '2024-03-31 21:00:00.000'});
        feedLhnOrderIndex(newest, 'default');
        flushMockEngineReplies();
        await waitForBatchedUpdates();

        expect(getLhnOrderIndexStats().staleReplyCount).toBe(1);
        expect(getLhnOrderSnapshot()?.reportIDs).toEqual(sidebarOrder(newest));
    });

    it('does nothing when the engine is unavailable', async () => {
        setMockEngineAvailable(false);
        await feed(buildLhnIndexInputs());

        expect(getLhnOrderSnapshot()).toBeUndefined();
    });
});
