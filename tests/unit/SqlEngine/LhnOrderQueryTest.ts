import type {ReportsToDisplayInLHN} from '@hooks/useSidebarOrderedReports';

import {buildLhnIndexRow} from '@libs/LhnOrderIndex/buildLhnIndexRows';
import type {LhnIndexInputs} from '@libs/LhnOrderIndex/types';
import SidebarUtils from '@libs/SidebarUtils';
import {createLhnSchema, ingestAndOrderLhn, readLhnRowCount} from '@libs/SqlEngine/wasm/lhnTable';
import type {LhnIndexRow, LhnPriorityMode, OrderLhnRequest} from '@libs/SqlEngine/wasm/protocol';
import type {WasmSqlEngine} from '@libs/SqlEngine/wasm/WasmSqlDriver';
import createWasmSqlEngine from '@libs/SqlEngine/wasm/WasmSqlDriver';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportNameValuePairs} from '@src/types/onyx';
import type {ReportAttributesDerivedValue} from '@src/types/onyx/DerivedValues';

import {localeCompare} from '../../utils/TestHelper';

type ReportFixture = {
    id: string;
    name: string;
    lastVisibleActionCreated?: string;
    isPinned?: boolean;
    requiresAttention?: boolean;
    hasErrorsOtherThanFailedReceipt?: boolean;
    isUnreadReport?: boolean;
    hasDraft?: boolean;
    isArchived?: boolean;
};

/** One report per LHN group, plus the two Inbox tabs, plus the shapes the order has to break a tie on. */
const FIXTURES: ReportFixture[] = [
    {
        id: '1',
        name: 'Alpha pinned',
        isPinned: true,
        lastVisibleActionCreated: '2024-03-01 10:00:00.000',
    },
    {
        id: '2',
        name: 'Bravo needs attention',
        requiresAttention: true,
        isUnreadReport: true,
        lastVisibleActionCreated: '2024-03-02 10:00:00.000',
    },
    {
        id: '3',
        name: 'Charlie broken',
        hasErrorsOtherThanFailedReceipt: true,
        lastVisibleActionCreated: '2024-03-03 10:00:00.000',
    },
    {
        id: '4',
        name: 'Delta draft',
        hasDraft: true,
        lastVisibleActionCreated: '2024-03-04 10:00:00.000',
    },
    {
        id: '5',
        name: 'Echo recent',
        isUnreadReport: true,
        lastVisibleActionCreated: '2024-03-09 10:00:00.000',
    },
    {
        id: '6',
        name: 'Foxtrot older',
        lastVisibleActionCreated: '2024-03-05 10:00:00.000',
    },
    {
        id: '7',
        name: 'Golf newest',
        lastVisibleActionCreated: '2024-03-10 10:00:00.000',
    },
    {
        id: '8',
        name: 'Hotel archived',
        isArchived: true,
        lastVisibleActionCreated: '2024-03-06 10:00:00.000',
    },
    {
        id: '9',
        name: 'India archived older',
        isArchived: true,
        lastVisibleActionCreated: '2024-03-01 09:00:00.000',
    },
    {
        id: '10',
        name: 'Report 2',
        lastVisibleActionCreated: '2024-03-07 10:00:00.000',
    },
    {
        id: '11',
        name: 'Report 10',
        lastVisibleActionCreated: '2024-03-07 10:00:00.000',
    },
];

function buildInputs(fixtures: readonly ReportFixture[]): LhnIndexInputs {
    const reportsToDisplay: ReportsToDisplayInLHN = {};
    const reportAttributes: ReportAttributesDerivedValue['reports'] = {};
    const reportNameValuePairs: Record<string, ReportNameValuePairs> = {};
    const draftComments: Record<string, string> = {};

    for (const fixture of fixtures) {
        reportsToDisplay[`${ONYXKEYS.COLLECTION.REPORT}${fixture.id}`] = {
            reportID: fixture.id,
            reportName: fixture.name,
            type: CONST.REPORT.TYPE.CHAT,
            chatType: CONST.REPORT.CHAT_TYPE.POLICY_ROOM,
            lastVisibleActionCreated: fixture.lastVisibleActionCreated,
            isPinned: fixture.isPinned,
            requiresAttention: fixture.requiresAttention,
            hasErrorsOtherThanFailedReceipt: fixture.hasErrorsOtherThanFailedReceipt,
            isUnreadReport: fixture.isUnreadReport,
        };
        reportAttributes[fixture.id] = {
            reportName: fixture.name,
            isEmpty: false,
            brickRoadStatus: undefined,
            requiresAttention: !!fixture.requiresAttention,
            reportErrors: {},
        };
        if (fixture.isArchived) {
            reportNameValuePairs[`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${fixture.id}`] = {private_isArchived: '2024-01-01 10:00:00.000'};
        }
        if (fixture.hasDraft) {
            draftComments[`${ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}${fixture.id}`] = 'a draft';
        }
    }

    return {
        reportsToDisplay,
        reportAttributes,
        reportNameValuePairs,
        draftComments,
    };
}

function buildRows(inputs: LhnIndexInputs): LhnIndexRow[] {
    return Object.values(inputs.reportsToDisplay).map((report) => buildLhnIndexRow(report, inputs));
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

/** Today's order for the same inputs, straight from the sidebar's own sort. */
function jsOrder(inputs: LhnIndexInputs, priorityMode: LhnPriorityMode): string[] {
    return SidebarUtils.sortReportsToDisplayInLHN(
        inputs.reportsToDisplay,
        priorityMode === 'focus' ? CONST.PRIORITY_MODE.GSD : CONST.PRIORITY_MODE.DEFAULT,
        localeCompare,
        toDraftFlags(inputs.draftComments),
        inputs.reportNameValuePairs,
        inputs.reportAttributes,
    );
}

function orderRequest(overrides: Partial<OrderLhnRequest>): OrderLhnRequest {
    return {
        type: 'order-lhn',
        requestID: 1,
        version: 1,
        upserts: [],
        deletes: [],
        full: false,
        priorityMode: 'default',
        ...overrides,
    };
}

const PRIORITY_MODES: LhnPriorityMode[] = ['default', 'focus'];

describe.each(PRIORITY_MODES)('lhn_rows order in the %s priority mode', (priorityMode) => {
    let engine: WasmSqlEngine;
    const inputs = buildInputs(FIXTURES);

    beforeEach(async () => {
        engine = await createWasmSqlEngine('memory');
        await createLhnSchema(engine.driver);
        await ingestAndOrderLhn(engine.driver, orderRequest({upserts: buildRows(inputs), full: true, priorityMode}));
    });

    it('returns the same order as the sidebar sort', async () => {
        const result = await ingestAndOrderLhn(engine.driver, orderRequest({version: 2, priorityMode}));

        expect(result.reportIDs).toEqual(jsOrder(inputs, priorityMode));
    });

    it('returns the two Inbox tabs as the sidebar filters them', async () => {
        const result = await ingestAndOrderLhn(engine.driver, orderRequest({version: 2, priorityMode}));
        const ordered = jsOrder(inputs, priorityMode);

        expect(result.unreadReportIDs).toEqual(SidebarUtils.filterReportsForInboxTab(ordered, inputs.reportsToDisplay, CONST.INBOX_TAB.UNREAD));
        expect(result.todoReportIDs).toEqual(SidebarUtils.filterReportsForInboxTab(ordered, inputs.reportsToDisplay, CONST.INBOX_TAB.TODO));
    });

    it('moves a report between groups on an upsert and forgets a deleted one', async () => {
        const pinnedInputs = buildInputs(FIXTURES.map((fixture) => (fixture.id === '6' ? {...fixture, isPinned: true} : fixture)));
        const pinnedReport = pinnedInputs.reportsToDisplay[`${ONYXKEYS.COLLECTION.REPORT}6`];
        if (!pinnedReport) {
            throw new Error('the fixture for report 6 is missing');
        }

        const result = await ingestAndOrderLhn(
            engine.driver,
            orderRequest({
                version: 2,
                upserts: [buildLhnIndexRow(pinnedReport, pinnedInputs)],
                deletes: ['9'],
                priorityMode,
            }),
        );

        expect(result.reportIDs).not.toContain('9');
        expect(await readLhnRowCount(engine.driver)).toBe(FIXTURES.length - 1);
        expect(result.reportIDs.indexOf('6')).toBeLessThan(result.reportIDs.indexOf('3'));
    });
});

describe('lhn_rows tie-breaking', () => {
    let engine: WasmSqlEngine;

    beforeEach(async () => {
        engine = await createWasmSqlEngine('memory');
        await createLhnSchema(engine.driver);
    });

    it('orders equal names by the padded digits, like buildSortKey does', async () => {
        const inputs = buildInputs(FIXTURES);
        await ingestAndOrderLhn(
            engine.driver,
            orderRequest({
                upserts: buildRows(inputs),
                full: true,
                priorityMode: 'focus',
            }),
        );
        const result = await ingestAndOrderLhn(engine.driver, orderRequest({version: 2, priorityMode: 'focus'}));

        // "Report 2" before "Report 10" is the whole point of the zero-padded sort key.
        expect(result.reportIDs.indexOf('10')).toBeLessThan(result.reportIDs.indexOf('11'));
    });

    it('puts a report with no visible action last inside its group, where today the comparator falls back to the name', async () => {
        const fixtures: ReportFixture[] = [
            {
                id: '30',
                name: 'Zulu with an action',
                lastVisibleActionCreated: '2024-03-01 10:00:00.000',
            },
            {id: '31', name: 'Alpha with no action'},
        ];
        const inputs = buildInputs(fixtures);
        await ingestAndOrderLhn(engine.driver, orderRequest({upserts: buildRows(inputs), full: true}));
        const result = await ingestAndOrderLhn(engine.driver, orderRequest({version: 2}));

        expect(result.reportIDs).toEqual(['30', '31']);
        // Today's comparator compares the names as soon as one date is missing, so it puts "Alpha" first.
        expect(jsOrder(inputs, 'default')).toEqual(['31', '30']);
    });
});
