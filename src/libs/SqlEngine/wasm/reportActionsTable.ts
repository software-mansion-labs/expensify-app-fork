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
    /** The synthetic rows as one value: `<id><PAIR_SEPARATOR><parent id>` entries joined by `ID_SEPARATOR`. */
    synthetic: string;
    /** The unread anchor for the `lastReadTime` of the request, empty when none was asked for or none is unread. */
    unreadAnchorID: string;
    timings: OrderTimings;
};

type TableCounts = {
    reportCount: number;
    rowCount: number;
};

const ID_SEPARATOR = ',';

const PAIR_SEPARATOR = ':';

/*
 * The index is rebuilt lazily from the Onyx cache on every worker start, so persisted rows are never read.
 * Dropping the table keeps a schema change from failing the init against an OPFS file of an older build.
 */
const DROP_TABLE = 'DROP TABLE IF EXISTS report_actions;';

/** `parent_id` is set on a synthetic row only: it is the id of the action that expands into it. */
const CREATE_TABLE = `CREATE TABLE report_actions (
    report_id        TEXT NOT NULL,
    id               TEXT NOT NULL,
    created          TEXT,
    action_name      TEXT,
    sort_group       INTEGER NOT NULL,
    preview_rank     INTEGER NOT NULL,
    parent_id        TEXT,
    PRIMARY KEY (report_id, id)
) WITHOUT ROWID;`;

/*
 * The display order as a plain column list, so this index serves it without a temporary b-tree, and covers it
 * because `id` is the only selected column. Read backwards it is also the reverse order the unread anchor needs.
 */
const CREATE_ORDER_INDEX = 'CREATE INDEX report_actions_order ON report_actions (report_id, sort_group ASC, created DESC, preview_rank ASC, id DESC);';

/** Partial index over the few synthetic rows of a report, covering the query that pairs them with their parent. */
const CREATE_SYNTHETIC_INDEX = 'CREATE INDEX report_actions_synthetic ON report_actions (report_id, id, parent_id) WHERE parent_id IS NOT NULL;';

const DELETE_REPORT = 'DELETE FROM report_actions WHERE report_id = ?;';

const DELETE_ROW = 'DELETE FROM report_actions WHERE report_id = ? AND id = ?;';

const UPSERT_ROW = `INSERT INTO report_actions (report_id, id, created, action_name, sort_group, preview_rank, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (report_id, id) DO UPDATE SET created = excluded.created, action_name = excluded.action_name,
    sort_group = excluded.sort_group, preview_rank = excluded.preview_rank, parent_id = excluded.parent_id;`;

const DISPLAY_ORDER = 'ORDER BY sort_group ASC, created DESC, preview_rank ASC, id DESC';

/** The exact reverse of `DISPLAY_ORDER`, which the planner serves by reading `report_actions_order` backwards. */
const REVERSE_ORDER = 'ORDER BY sort_group DESC, created ASC, preview_rank DESC, id ASC';

/** The whole order of one report as a single row: the ids joined, plus the length the consumer slices against. */
const ORDER_QUERY = `SELECT group_concat(id, '${ID_SEPARATOR}') AS ids, count(*) AS total FROM (
    SELECT id FROM report_actions WHERE report_id = ? ${DISPLAY_ORDER}
);`;

/** Which ids of the order are synthetic, and which action each one belongs to, as a single row. */
const SYNTHETIC_QUERY = `SELECT group_concat(id || '${PAIR_SEPARATOR}' || parent_id, '${ID_SEPARATOR}') AS pairs
FROM report_actions WHERE report_id = ? AND parent_id IS NOT NULL;`;

/*
 * The oldest action newer than a `lastReadTime`, which is the last action of the display order that is still
 * unread. Reading the order index backwards puts that action first, so `LIMIT 1` stops the walk there.
 * `created` only filters the walk, because `sort_group` leads the index and the order starts with it.
 * A row without `created` never satisfies the comparison, exactly as `undefined > string` is false in JS.
 */
const ANCHOR_QUERY = `SELECT id FROM report_actions WHERE report_id = ? AND created > ? ${REVERSE_ORDER} LIMIT 1;`;

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
    return [reportID, row.id, row.created ?? null, row.actionName ?? null, toSortGroup(row, names), toPreviewRank(row, names), row.parentID ?? null];
}

function createReportActionsSchema(driver: SqlDriver): Promise<void> {
    return driver.executeBatch([{sql: DROP_TABLE}, {sql: CREATE_TABLE}, {sql: CREATE_ORDER_INDEX}, {sql: CREATE_SYNTHETIC_INDEX}]);
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
        const syntheticRows = await tx.execute(SYNTHETIC_QUERY, [request.reportID]);
        const anchorRows = request.lastReadTime === undefined ? [] : await tx.execute(ANCHOR_QUERY, [request.reportID, request.lastReadTime]);
        const orderMs = performance.now() - orderStartedAt;

        return {
            ids: readText(rows.at(0), 'ids'),
            total: readCount(rows.at(0), 'total'),
            synthetic: readText(syntheticRows.at(0), 'pairs'),
            unreadAnchorID: readText(anchorRows.at(0), 'id'),
            timings: {ingestMs, orderMs},
        };
    });
}

async function dropReportRows(driver: SqlDriver, reportID: string): Promise<void> {
    await driver.execute(DELETE_REPORT, [reportID]);
}

async function readTableCounts(driver: SqlDriver): Promise<TableCounts> {
    const rows = await driver.execute(COUNT_QUERY);
    return {reportCount: readCount(rows.at(0), 'report_count'), rowCount: readCount(rows.at(0), 'row_count')};
}

export {
    createReportActionsSchema,
    ingestAndOrderReport,
    dropReportRows,
    readTableCounts,
    ID_SEPARATOR,
    PAIR_SEPARATOR,
    ANCHOR_QUERY,
    ORDER_QUERY,
    SYNTHETIC_QUERY,
    DISPLAY_ORDER,
    REVERSE_ORDER,
};
export type {OrderActionNames, OrderResult, TableCounts};
