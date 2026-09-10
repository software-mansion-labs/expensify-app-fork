import type {ReportsToDisplayInLHN} from '@hooks/useSidebarOrderedReports';

import {feedLhnOrderIndex, getLhnOrderIndexStats, getLhnOrderSnapshot, resetLhnOrderIndexStore} from '@libs/LhnOrderIndex/LhnOrderIndexStore';
import type {LhnIndexInputs} from '@libs/LhnOrderIndex/types';
import SidebarUtils from '@libs/SidebarUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportNameValuePairs} from '@src/types/onyx';
import type {ReportAttributesDerivedValue} from '@src/types/onyx/DerivedValues';

import {flushMockEngineReplies, getMockEngineLhnRowCount, resetMockEngine, setMockEngineAvailable, setMockEngineDeferred} from '../../utils/mockSqlEngineClient';
import {localeCompare} from '../../utils/TestHelper';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- a jest.mock factory cannot reach a typed import
jest.mock('@libs/SqlEngine/EngineClient', () => require('../../utils/mockSqlEngineClient'));

const REPORT_COUNT = 40;
const DRAFT_EVERY = 6;
const ARCHIVED_EVERY = 9;
const PINNED_EVERY = 7;
const UNREAD_EVERY = 4;

function buildInputs(): LhnIndexInputs {
    const reportsToDisplay: ReportsToDisplayInLHN = {};
    const reportAttributes: ReportAttributesDerivedValue['reports'] = {};
    const reportNameValuePairs: Record<string, ReportNameValuePairs> = {};
    const draftComments: Record<string, string> = {};

    for (let index = 1; index <= REPORT_COUNT; index++) {
        const reportID = index.toString();
        const reportName = `Chat ${index.toString().padStart(3, '0')}`;
        const minutes = (index * 17) % 60;
        const base: ReportsToDisplayInLHN[string] = {
            reportID,
            reportName,
            type: CONST.REPORT.TYPE.CHAT,
            chatType: CONST.REPORT.CHAT_TYPE.POLICY_ROOM,
            lastVisibleActionCreated: `2024-03-0${(index % 9) + 1} 10:${minutes.toString().padStart(2, '0')}:00.000`,
            isPinned: index % PINNED_EVERY === 0,
            requiresAttention: index % 11 === 0,
            hasErrorsOtherThanFailedReceipt: index % 13 === 0,
            isUnreadReport: index % UNREAD_EVERY === 0,
        };
        reportsToDisplay[`${ONYXKEYS.COLLECTION.REPORT}${reportID}`] = base;
        reportAttributes[reportID] = {
            reportName,
            isEmpty: false,
            brickRoadStatus: undefined,
            requiresAttention: index % 11 === 0,
            reportErrors: {},
        };
        if (index % ARCHIVED_EVERY === 0) {
            reportNameValuePairs[`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${reportID}`] = {private_isArchived: '2024-01-01 10:00:00.000'};
        }
        if (index % DRAFT_EVERY === 0) {
            draftComments[`${ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}${reportID}`] = `draft ${index}`;
        }
    }

    return {reportsToDisplay, reportAttributes, reportNameValuePairs, draftComments};
}

/** One write, the way the sidebar hands it over: a new map with one new entry and every other entry by reference. */
function withReportChange(inputs: LhnIndexInputs, reportID: string, changes: Partial<ReportsToDisplayInLHN[string]>): LhnIndexInputs {
    const reportKey: `${typeof ONYXKEYS.COLLECTION.REPORT}${string}` = `${ONYXKEYS.COLLECTION.REPORT}${reportID}`;
    const report = inputs.reportsToDisplay[reportKey];
    if (!report) {
        throw new Error(`report ${reportID} is not in the fixture`);
    }
    return {...inputs, reportsToDisplay: {...inputs.reportsToDisplay, [reportKey]: {...report, ...changes}}};
}

function withoutReport(inputs: LhnIndexInputs, reportID: string): LhnIndexInputs {
    const reportsToDisplay = {...inputs.reportsToDisplay};
    delete reportsToDisplay[`${ONYXKEYS.COLLECTION.REPORT}${reportID}`];
    return {...inputs, reportsToDisplay};
}

/** The sidebar sorts on a boolean map keyed by bare report id, while a row reads the draft collection itself. */
function toDraftFlags(draftComments: LhnIndexInputs['draftComments']): Record<string, boolean> {
    const flags: Record<string, boolean> = {};
    for (const [draftKey, draft] of Object.entries(draftComments ?? {})) {
        if (draft) {
            flags[draftKey.replace(ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT, '')] = true;
        }
    }
    return flags;
}

function jsOrder(inputs: LhnIndexInputs): string[] {
    return SidebarUtils.sortReportsToDisplayInLHN(
        inputs.reportsToDisplay,
        CONST.PRIORITY_MODE.DEFAULT,
        localeCompare,
        toDraftFlags(inputs.draftComments),
        inputs.reportNameValuePairs,
        inputs.reportAttributes,
    );
}

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
        const inputs = buildInputs();
        await feed(inputs);

        expect(getLhnOrderSnapshot()?.reportIDs).toEqual(jsOrder(inputs));
        expect(getMockEngineLhnRowCount()).toBe(REPORT_COUNT);
        expect(getLhnOrderIndexStats().lastUpsertCount).toBe(REPORT_COUNT);
    });

    it('rebuilds one row for a write to one report and still matches the sidebar', async () => {
        const first = buildInputs();
        await feed(first);

        const second = withReportChange(first, '5', {lastVisibleActionCreated: '2024-03-31 23:00:00.000'});
        await feed(second);

        expect(getLhnOrderIndexStats().lastUpsertCount).toBe(1);
        expect(getLhnOrderSnapshot()?.reportIDs).toEqual(jsOrder(second));
    });

    it('follows a display name that only changed in the derived attributes', async () => {
        const first = buildInputs();
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
        expect(getLhnOrderSnapshot()?.reportIDs).toEqual(jsOrder(renamed));
    });

    it('moves a report to the draft group when a draft appears', async () => {
        const first = buildInputs();
        await feed(first);

        const draftKey: `${typeof ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}${string}` = `${ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}3`;
        const withDraft: LhnIndexInputs = {...first, draftComments: {...first.draftComments, [draftKey]: 'a new draft'}};
        await feed(withDraft);

        expect(getLhnOrderIndexStats().lastUpsertCount).toBe(1);
        expect(getLhnOrderSnapshot()?.reportIDs).toEqual(jsOrder(withDraft));
    });

    it('drops a report that left the displayed set', async () => {
        const first = buildInputs();
        await feed(first);

        const withoutOne = withoutReport(first, '8');
        await feed(withoutOne);

        expect(getLhnOrderIndexStats().lastDeleteCount).toBe(1);
        expect(getMockEngineLhnRowCount()).toBe(REPORT_COUNT - 1);
        expect(getLhnOrderSnapshot()?.reportIDs).toEqual(jsOrder(withoutOne));
    });

    it('keeps the two Inbox tabs in the same order as the sidebar filter', async () => {
        const inputs = buildInputs();
        await feed(inputs);
        const ordered = jsOrder(inputs);

        expect(getLhnOrderSnapshot()?.unreadReportIDs).toEqual(SidebarUtils.filterReportsForInboxTab(ordered, inputs.reportsToDisplay, CONST.INBOX_TAB.UNREAD));
        expect(getLhnOrderSnapshot()?.todoReportIDs).toEqual(SidebarUtils.filterReportsForInboxTab(ordered, inputs.reportsToDisplay, CONST.INBOX_TAB.TODO));
    });

    it('sends nothing when no input changed', async () => {
        const inputs = buildInputs();
        await feed(inputs);
        const feedCount = getLhnOrderIndexStats().feedCount;

        await feed(inputs);

        expect(getLhnOrderIndexStats().feedCount).toBe(feedCount);
    });

    it('drops a reply that a newer write already replaced', async () => {
        const first = buildInputs();
        await feed(first);

        setMockEngineDeferred(true);
        const stale = withReportChange(first, '2', {lastVisibleActionCreated: '2024-03-31 20:00:00.000'});
        feedLhnOrderIndex(stale, 'default');
        const newest = withReportChange(stale, '2', {lastVisibleActionCreated: '2024-03-31 21:00:00.000'});
        feedLhnOrderIndex(newest, 'default');
        flushMockEngineReplies();
        await waitForBatchedUpdates();

        expect(getLhnOrderIndexStats().staleReplyCount).toBe(1);
        expect(getLhnOrderSnapshot()?.reportIDs).toEqual(jsOrder(newest));
    });

    it('does nothing when the engine is unavailable', async () => {
        setMockEngineAvailable(false);
        await feed(buildInputs());

        expect(getLhnOrderSnapshot()).toBeUndefined();
    });
});
