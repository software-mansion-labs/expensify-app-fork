import type {SqlBatchCommand, SqlDriver, SqlRow, SqlValue} from '@libs/SqlEngine/SqlDriver';

import type {IngestAndOrderRequest, OrderTimings, SortRow} from './protocol';

/** The two action names the sort keys are derived from, never inlined into the SQL. */
type OrderActionNames = {
    createdActionName: string;
    reportPreviewActionName: string;
};

type OrderResult = {
    /** The whole order as one value: report action ids joined by `ID_SEPARATOR`. */
    ids: string;
    total: number;
    timings: OrderTimings;
};

type TableCounts = {
    reportCount: number;
    rowCount: number;
};

const ID_SEPARATOR = ',';

/*
 * The index is rebuilt lazily from the Onyx cache on every worker start, so persisted rows are never read.
 * Dropping the table keeps a schema change from failing the init against an OPFS file of an older build.
 */
const DROP_TABLE = 'DROP TABLE IF EXISTS report_actions;';

const CREATE_TABLE = `CREATE TABLE report_actions (
    report_id        TEXT NOT NULL,
    id               TEXT NOT NULL,
    created          TEXT,
    action_name      TEXT,
    sort_group       INTEGER NOT NULL,
    preview_rank     INTEGER NOT NULL,
    PRIMARY KEY (report_id, id)
) WITHOUT ROWID;`;

/*
 * The display order as a plain column list, so this index serves it without a temporary b-tree, and covers it
 * because `id` is the only selected column. Read backwards it is also the reverse order the unread anchor needs.
 */
const CREATE_ORDER_INDEX = 'CREATE INDEX report_actions_order ON report_actions (report_id, sort_group ASC, created DESC, preview_rank ASC, id DESC);';

const DELETE_REPORT = 'DELETE FROM report_actions WHERE report_id = ?;';

const DELETE_ROW = 'DELETE FROM report_actions WHERE report_id = ? AND id = ?;';

const UPSERT_ROW = `INSERT INTO report_actions (report_id, id, created, action_name, sort_group, preview_rank) VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT (report_id, id) DO UPDATE SET created = excluded.created, action_name = excluded.action_name,
    sort_group = excluded.sort_group, preview_rank = excluded.preview_rank;`;

const DISPLAY_ORDER = 'ORDER BY sort_group ASC, created DESC, preview_rank ASC, id DESC';

/** The exact reverse of `DISPLAY_ORDER`, which the planner serves by reading `report_actions_order` backwards. */
const REVERSE_ORDER = 'ORDER BY sort_group DESC, created ASC, preview_rank DESC, id ASC';

/** The whole order of one report as a single row: the ids joined, plus the length the consumer slices against. */
const ORDER_QUERY = `SELECT group_concat(id, '${ID_SEPARATOR}') AS ids, count(*) AS total FROM (
    SELECT id FROM report_actions WHERE report_id = ? ${DISPLAY_ORDER}
);`;

const COUNT_QUERY = 'SELECT COUNT(*) AS row_count, COUNT(DISTINCT report_id) AS report_count FROM report_actions;';

/** Mirrors the two leading steps of the `getSortedReportActions` comparator: CREATED last, then a missing `created` last. */
function toSortGroup(row: SortRow, names: OrderActionNames): number {
    return (row.actionName === names.createdActionName ? 2 : 0) + (row.created === undefined ? 1 : 0);
}

/** Mirrors the comparator's REPORT_PREVIEW tie break: at an equal `created` a preview comes first. */
function toPreviewRank(row: SortRow, names: OrderActionNames): number {
    return row.actionName === names.reportPreviewActionName ? 0 : 1;
}

function toUpsertParams(reportID: string, row: SortRow, names: OrderActionNames): SqlValue[] {
    return [reportID, row.id, row.created ?? null, row.actionName ?? null, toSortGroup(row, names), toPreviewRank(row, names)];
}

function createReportActionsSchema(driver: SqlDriver): Promise<void> {
    return driver.executeBatch([{sql: DROP_TABLE}, {sql: CREATE_TABLE}, {sql: CREATE_ORDER_INDEX}]);
}

function readCount(row: SqlRow | undefined, column: string): number {
    const value = row?.[column];
    return typeof value === 'number' ? value : 0;
}

function readText(row: SqlRow | undefined, column: string): string {
    const value = row?.[column];
    return typeof value === 'string' ? value : '';
}

function buildIngestCommands(request: IngestAndOrderRequest, names: OrderActionNames): SqlBatchCommand[] {
    const commands: SqlBatchCommand[] = [];
    if (request.full) {
        commands.push({sql: DELETE_REPORT, params: [[request.reportID]]});
    } else if (request.deletes.length > 0) {
        commands.push({sql: DELETE_ROW, params: request.deletes.map((id) => [request.reportID, id])});
    }
    if (request.upserts.length > 0) {
        commands.push({sql: UPSERT_ROW, params: request.upserts.map((row) => toUpsertParams(request.reportID, row, names))});
    }
    return commands;
}

/** Applies the ingest and reads the order of one report in a single transaction. */
function ingestAndOrderReport(driver: SqlDriver, request: IngestAndOrderRequest, names: OrderActionNames): Promise<OrderResult> {
    return driver.transaction(async (tx) => {
        const ingestStartedAt = performance.now();
        await tx.executeBatch(buildIngestCommands(request, names));
        const ingestMs = performance.now() - ingestStartedAt;

        const orderStartedAt = performance.now();
        const rows = await tx.execute(ORDER_QUERY, [request.reportID]);
        const orderMs = performance.now() - orderStartedAt;

        return {ids: readText(rows.at(0), 'ids'), total: readCount(rows.at(0), 'total'), timings: {ingestMs, orderMs}};
    });
}

async function dropReportRows(driver: SqlDriver, reportID: string): Promise<void> {
    await driver.execute(DELETE_REPORT, [reportID]);
}

async function readTableCounts(driver: SqlDriver): Promise<TableCounts> {
    const rows = await driver.execute(COUNT_QUERY);
    return {reportCount: readCount(rows.at(0), 'report_count'), rowCount: readCount(rows.at(0), 'row_count')};
}

export {createReportActionsSchema, ingestAndOrderReport, dropReportRows, readTableCounts, ID_SEPARATOR, ORDER_QUERY, DISPLAY_ORDER, REVERSE_ORDER};
export type {OrderActionNames, OrderResult, TableCounts};
