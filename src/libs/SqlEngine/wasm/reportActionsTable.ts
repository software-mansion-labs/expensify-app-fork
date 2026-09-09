import type {SqlBatchCommand, SqlDriver, SqlRow} from '@libs/SqlEngine/SqlDriver';

import type {IngestAndOrderRequest, OrderTimings} from './protocol';

/** The two action names the order query binds as parameters, never inlined into the SQL. */
type OrderActionNames = {
    createdActionName: string;
    reportPreviewActionName: string;
};

type OrderResult = {
    ids: string[];
    timings: OrderTimings;
};

type TableCounts = {
    reportCount: number;
    rowCount: number;
};

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS report_actions (
    report_id        TEXT NOT NULL,
    id               TEXT NOT NULL,
    created          TEXT,
    action_name      TEXT,
    PRIMARY KEY (report_id, id)
) WITHOUT ROWID;`;

const CREATE_INDEX = 'CREATE INDEX IF NOT EXISTS report_actions_order ON report_actions (report_id, created DESC, id DESC);';

const DELETE_REPORT = 'DELETE FROM report_actions WHERE report_id = ?;';

const DELETE_ROW = 'DELETE FROM report_actions WHERE report_id = ? AND id = ?;';

const UPSERT_ROW = `INSERT INTO report_actions (report_id, id, created, action_name) VALUES (?, ?, ?, ?)
ON CONFLICT (report_id, id) DO UPDATE SET created = excluded.created, action_name = excluded.action_name;`;

/** Mirrors the `getSortedReportActions(actions, true)` comparator as a lexicographic sort key. */
const ORDER_QUERY = `SELECT id
FROM report_actions
WHERE report_id = ?
ORDER BY
    CASE WHEN action_name = ? THEN 1 ELSE 0 END ASC,
    CASE WHEN created IS NULL THEN 1 ELSE 0 END ASC,
    created DESC,
    CASE WHEN action_name = ? THEN 0 ELSE 1 END ASC,
    id DESC;`;

const COUNT_QUERY = 'SELECT COUNT(*) AS row_count, COUNT(DISTINCT report_id) AS report_count FROM report_actions;';

async function createReportActionsSchema(driver: SqlDriver): Promise<void> {
    await driver.executeBatch([{sql: CREATE_TABLE}, {sql: CREATE_INDEX}]);
}

function toIds(rows: SqlRow[]): string[] {
    const ids: string[] = [];
    for (const row of rows) {
        const id = row.id;
        if (typeof id === 'string') {
            ids.push(id);
        }
    }
    return ids;
}

function readCount(row: SqlRow | undefined, column: string): number {
    const value = row?.[column];
    return typeof value === 'number' ? value : 0;
}

function buildIngestCommands(request: IngestAndOrderRequest): SqlBatchCommand[] {
    const commands: SqlBatchCommand[] = [];
    if (request.full) {
        commands.push({sql: DELETE_REPORT, params: [[request.reportID]]});
    } else if (request.deletes.length > 0) {
        commands.push({sql: DELETE_ROW, params: request.deletes.map((id) => [request.reportID, id])});
    }
    if (request.upserts.length > 0) {
        commands.push({sql: UPSERT_ROW, params: request.upserts.map((row) => [request.reportID, row.id, row.created ?? null, row.actionName ?? null])});
    }
    return commands;
}

/** Applies the ingest and reads the order of one report in a single transaction. */
function ingestAndOrderReport(driver: SqlDriver, request: IngestAndOrderRequest, names: OrderActionNames): Promise<OrderResult> {
    return driver.transaction(async (tx) => {
        const ingestStartedAt = performance.now();
        await tx.executeBatch(buildIngestCommands(request));
        const ingestMs = performance.now() - ingestStartedAt;

        const orderStartedAt = performance.now();
        const rows = await tx.execute(ORDER_QUERY, [request.reportID, names.createdActionName, names.reportPreviewActionName]);
        const orderMs = performance.now() - orderStartedAt;

        return {ids: toIds(rows), timings: {ingestMs, orderMs}};
    });
}

async function dropReportRows(driver: SqlDriver, reportID: string): Promise<void> {
    await driver.execute(DELETE_REPORT, [reportID]);
}

async function readTableCounts(driver: SqlDriver): Promise<TableCounts> {
    const rows = await driver.execute(COUNT_QUERY);
    return {reportCount: readCount(rows.at(0), 'report_count'), rowCount: readCount(rows.at(0), 'row_count')};
}

export {createReportActionsSchema, ingestAndOrderReport, dropReportRows, readTableCounts};
export type {OrderActionNames, OrderResult, TableCounts};
