import splitOrderedIDs from '@libs/ReportActionsOrder/splitOrderedIDs';
import {getSortedReportActions} from '@libs/ReportActionsUtils';
import type {IngestAndOrderRequest, SortRow} from '@libs/SqlEngine/wasm/protocol';
import type {OrderActionNames} from '@libs/SqlEngine/wasm/reportActionsTable';
import {createReportActionsSchema, dropReportRows, ingestAndOrderReport, ORDER_QUERY, PAIR_SEPARATOR, readTableCounts, SYNTHETIC_QUERY} from '@libs/SqlEngine/wasm/reportActionsTable';
import type {WasmSqlEngine} from '@libs/SqlEngine/wasm/WasmSqlDriver';
import createWasmSqlEngine from '@libs/SqlEngine/wasm/WasmSqlDriver';

import CONST from '@src/CONST';
import type {ReportAction} from '@src/types/onyx';
import type ReportActionName from '@src/types/onyx/ReportActionName';

import createRandomReportAction from '../../utils/collections/reportActions';

const REPORT_ID = '1234';
const OTHER_REPORT_ID = '5678';

const NAMES: OrderActionNames = {
    createdActionName: CONST.REPORT.ACTIONS.TYPE.CREATED,
    reportPreviewActionName: CONST.REPORT.ACTIONS.TYPE.REPORT_PREVIEW,
};

const COMMENT = CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT;
const PREVIEW = CONST.REPORT.ACTIONS.TYPE.REPORT_PREVIEW;
const CREATED = CONST.REPORT.ACTIONS.TYPE.CREATED;

let nextIndex = 0;

function buildAction(reportActionID: string, created: string, actionName: ReportActionName): ReportAction {
    nextIndex += 1;
    return {...createRandomReportAction(nextIndex), reportActionID, created, actionName};
}

/** Actions of one report, covering every branch of the `getSortedReportActions` comparator. */
function buildFixture(): ReportAction[] {
    const actions: ReportAction[] = [];

    // A plain descending timeline, with report action ids of different lengths.
    const timelineIDs = ['9', '10', '100', '1000', '10000', '99999', '123456789', '2', '20', '200'];
    for (const [index, id] of timelineIDs.entries()) {
        actions.push(buildAction(id, `2024-03-${String(index + 1).padStart(2, '0')} 10:00:00.000`, COMMENT));
    }

    // Equal `created`, different ids of different lengths: the tie breaks on the id string, descending.
    for (const id of ['7', '71', '8', '80', '800']) {
        actions.push(buildAction(id, '2024-04-01 08:00:00.000', COMMENT));
    }

    // `REPORT_PREVIEW` ties: at an equal `created` the preview comes first in descending order.
    for (const [index, created] of ['2024-04-02 09:00:00.000', '2024-04-03 09:00:00.000', '2024-04-04 09:00:00.000'].entries()) {
        actions.push(buildAction(`30${index}`, created, PREVIEW));
        actions.push(buildAction(`31${index}`, created, COMMENT));
        actions.push(buildAction(`32${index}`, created, COMMENT));
    }

    // Two previews at the same `created` fall through to the id tie break.
    actions.push(buildAction('401', '2024-04-05 09:00:00.000', PREVIEW));
    actions.push(buildAction('402', '2024-04-05 09:00:00.000', PREVIEW));

    // `CREATED` sorts last in descending order even with the latest timestamp of the whole report.
    actions.push(buildAction('900', '2024-12-31 23:59:59.999', CREATED));
    // A second `CREATED` orders against the first one by `created`.
    actions.push(buildAction('901', '2024-01-01 00:00:00.000', CREATED));

    // More timeline entries so the fixture is around 50 actions.
    for (let index = 0; index < 21; index++) {
        actions.push(buildAction(`5${index}`, `2024-05-${String(index + 1).padStart(2, '0')} 12:34:56.789`, COMMENT));
    }

    actions.push({
        ...buildAction('902', '2024-06-01 00:00:00.000', COMMENT),
        // @ts-expect-error the comparator handles a missing `created`, which the type does not allow.
        created: undefined,
    });

    /*
     * Only one action per sort group may miss `created`: the JS comparator answers "first is newer" for both
     * argument orders when both are missing one, so its order between them is whatever the sort happens to do.
     */

    // A CREATED action without `created` sorts after the CREATED actions that have one.
    actions.push({
        ...buildAction('905', '2024-06-04 00:00:00.000', CREATED),
        // @ts-expect-error the comparator handles a missing `created`, which the type does not allow.
        created: undefined,
    });

    // A CREATED action sharing its timestamp with a comment and a preview: the group decides, not the tie break.
    actions.push(buildAction('906', '2024-04-02 09:00:00.000', CREATED));

    return actions;
}

function toSortRows(actions: ReportAction[]): SortRow[] {
    return actions.map((action) => ({id: action.reportActionID, created: action.created, actionName: action.actionName}));
}

function buildRequest(overrides: Partial<IngestAndOrderRequest>): IngestAndOrderRequest {
    return {type: 'ingest-and-order', requestID: 1, reportID: REPORT_ID, version: 1, upserts: [], deletes: [], full: false, ...overrides};
}

function expectedOrder(actions: ReportAction[]): string[] {
    return getSortedReportActions(actions, true).map((action) => action.reportActionID);
}

describe('report_actions order query', () => {
    let engine: WasmSqlEngine;
    const fixture = buildFixture();

    async function explainPlan(sql: string, params: string[]): Promise<string[]> {
        const rows = await engine.driver.execute(`EXPLAIN QUERY PLAN ${sql}`, params);
        return rows.map((row) => (typeof row.detail === 'string' ? row.detail : ''));
    }

    beforeEach(async () => {
        engine = await createWasmSqlEngine('memory');
        await createReportActionsSchema(engine.driver);
    });

    it('builds a fixture that exercises every comparator branch', () => {
        expect(fixture).toHaveLength(52);
    });

    it('orders a full ingest exactly like getSortedReportActions', async () => {
        const {ids, total} = await ingestAndOrderReport(engine.driver, buildRequest({upserts: toSortRows(fixture), full: true}), NAMES);
        expect(splitOrderedIDs(ids)).toEqual(expectedOrder(fixture));
        expect(total).toBe(fixture.length);
    });

    it('returns the whole order as a single row', async () => {
        await ingestAndOrderReport(engine.driver, buildRequest({upserts: toSortRows(fixture), full: true}), NAMES);
        const rows = await engine.driver.execute(ORDER_QUERY, [REPORT_ID]);
        expect(rows).toHaveLength(1);
    });

    it('serves the order from the covering index without a temporary b-tree', async () => {
        await ingestAndOrderReport(engine.driver, buildRequest({upserts: toSortRows(fixture), full: true}), NAMES);
        const plan = await explainPlan(ORDER_QUERY, [REPORT_ID]);
        expect(plan).toContain('SEARCH report_actions USING COVERING INDEX report_actions_order (report_id=?)');
        expect(plan.join(' | ')).not.toContain('TEMP B-TREE');
    });

    it('reaches the same order through upserts and deletes as through a fresh full ingest', async () => {
        const stale = [buildAction('7001', '2024-07-01 00:00:00.000', COMMENT), buildAction('7002', '2024-07-02 00:00:00.000', PREVIEW)];
        const outdated = fixture.slice(0, 4).map((action) => ({...action, created: '2019-01-01 00:00:00.000'}));
        const initial = [...outdated, ...fixture.slice(4, 40), ...stale];

        await ingestAndOrderReport(engine.driver, buildRequest({upserts: toSortRows(initial), full: true}), NAMES);
        const {ids} = await ingestAndOrderReport(
            engine.driver,
            buildRequest({
                version: 2,
                upserts: toSortRows([...fixture.slice(0, 4), ...fixture.slice(40)]),
                deletes: stale.map((action) => action.reportActionID),
            }),
            NAMES,
        );

        expect(splitOrderedIDs(ids)).toEqual(expectedOrder(fixture));
    });

    it('orders a synthetic row like any other and reports which parent it belongs to', async () => {
        const parent = buildAction('8100', '2024-09-01 00:00:00.000', COMMENT);
        const routed = buildAction('8100DEW', '2024-09-01 00:00:00.001', COMMENT);
        const rows: SortRow[] = [...toSortRows([...fixture, parent]), {id: routed.reportActionID, created: routed.created, actionName: routed.actionName, parentID: parent.reportActionID}];

        const {ids, synthetic} = await ingestAndOrderReport(engine.driver, buildRequest({upserts: rows, full: true}), NAMES);

        expect(splitOrderedIDs(ids)).toEqual(expectedOrder([...fixture, parent, routed]));
        expect(synthetic).toBe(`${routed.reportActionID}${PAIR_SEPARATOR}${parent.reportActionID}`);
    });

    it('reads the synthetic pairs from the partial index and returns them as a single row', async () => {
        await ingestAndOrderReport(engine.driver, buildRequest({upserts: toSortRows(fixture), full: true}), NAMES);

        const rows = await engine.driver.execute(SYNTHETIC_QUERY, [REPORT_ID]);
        expect(rows).toHaveLength(1);

        const plan = await explainPlan(SYNTHETIC_QUERY, [REPORT_ID]);
        expect(plan).toContain('SEARCH report_actions USING COVERING INDEX report_actions_synthetic (report_id=?)');
        expect(plan.join(' | ')).not.toContain('TEMP B-TREE');
    });

    it('keeps reports isolated and drops the rows of one report only', async () => {
        const otherActions = [buildAction('6001', '2024-08-01 00:00:00.000', COMMENT), buildAction('6002', '2024-08-02 00:00:00.000', CREATED)];
        await ingestAndOrderReport(engine.driver, buildRequest({upserts: toSortRows(fixture), full: true}), NAMES);
        await ingestAndOrderReport(engine.driver, buildRequest({reportID: OTHER_REPORT_ID, upserts: toSortRows(otherActions), full: true}), NAMES);

        expect(await readTableCounts(engine.driver)).toEqual({reportCount: 2, rowCount: fixture.length + otherActions.length});

        const {ids} = await ingestAndOrderReport(engine.driver, buildRequest({version: 2}), NAMES);
        expect(splitOrderedIDs(ids)).toEqual(expectedOrder(fixture));

        await dropReportRows(engine.driver, OTHER_REPORT_ID);
        expect(await readTableCounts(engine.driver)).toEqual({reportCount: 1, rowCount: fixture.length});
    });
});
