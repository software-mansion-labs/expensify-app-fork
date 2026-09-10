import type {SqlBatchCommand, SqlDriver, SqlRow} from '@libs/SqlEngine/SqlDriver';

import type {LhnPriorityMode, OrderLhnRequest} from './protocol';

import {LHN_FIRST_RECENCY_BUCKET} from './protocol';

type LhnOrderResult = {
    reportIDs: string[];
    unreadReportIDs: string[];
    todoReportIDs: string[];
    ingestMs: number;
    queryMs: number;
};

const ID_SEPARATOR = ',';

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS lhn_rows (
    report_id   TEXT PRIMARY KEY,
    bucket      INTEGER NOT NULL,
    sort_key    TEXT NOT NULL,
    last_action TEXT NOT NULL,
    is_unread   INTEGER NOT NULL,
    is_todo     INTEGER NOT NULL
);`;

/*
 * One index per priority mode, plus a partial index per Inbox tab. The partial ones cover the tab queries
 * without scanning the reports the tab drops, which is most of the table on an ordinary account.
 */
const CREATE_INDEXES = [
    'CREATE INDEX IF NOT EXISTS lhn_rows_recency ON lhn_rows (bucket, last_action DESC, sort_key);',
    'CREATE INDEX IF NOT EXISTS lhn_rows_alphabetical ON lhn_rows (bucket, sort_key);',
    'CREATE INDEX IF NOT EXISTS lhn_rows_unread ON lhn_rows (bucket, last_action DESC, sort_key) WHERE is_unread = 1;',
    'CREATE INDEX IF NOT EXISTS lhn_rows_todo ON lhn_rows (bucket, last_action DESC, sort_key) WHERE is_todo = 1;',
];

const DELETE_ALL = 'DELETE FROM lhn_rows;';

const DELETE_ROW = 'DELETE FROM lhn_rows WHERE report_id = ?;';

const UPSERT_ROW = `INSERT INTO lhn_rows (report_id, bucket, sort_key, last_action, is_unread, is_todo) VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT (report_id) DO UPDATE SET bucket = excluded.bucket, sort_key = excluded.sort_key, last_action = excluded.last_action,
    is_unread = excluded.is_unread, is_todo = excluded.is_todo;`;

const COUNT_QUERY = 'SELECT COUNT(*) AS lhn_row_count FROM lhn_rows;';

function createLhnSchema(driver: SqlDriver): Promise<void> {
    return driver.executeBatch([{sql: CREATE_TABLE}, ...CREATE_INDEXES.map((sql) => ({sql}))]);
}

function buildIngestCommands(request: OrderLhnRequest): SqlBatchCommand[] {
    const commands: SqlBatchCommand[] = [];
    if (request.full) {
        commands.push({sql: DELETE_ALL});
    } else if (request.deletes.length > 0) {
        commands.push({
            sql: DELETE_ROW,
            params: request.deletes.map((reportID) => [reportID]),
        });
    }
    if (request.upserts.length > 0) {
        commands.push({
            sql: UPSERT_ROW,
            params: request.upserts.map((row) => [row.reportID, row.bucket, row.sortKey, row.lastVisibleActionCreated, row.isUnread ? 1 : 0, row.isTodo ? 1 : 0]),
        });
    }
    return commands;
}

/**
 * The LHN order, as one string per list instead of one row per report. The five groups come out in bucket order;
 * inside a group the default mode orders by recency and falls back to the sort key, and the focus mode is
 * alphabetical throughout. The report id closes the order so equal keys cannot come back in a different order
 * on the next call.
 */
function buildOrderStatement(priorityMode: LhnPriorityMode, where: string): string {
    const recency = priorityMode === 'default' ? `CASE WHEN bucket >= ${LHN_FIRST_RECENCY_BUCKET} THEN last_action END DESC,` : '';
    return `SELECT group_concat(report_id, '${ID_SEPARATOR}') AS ids FROM (
    SELECT report_id FROM lhn_rows ${where}
    ORDER BY bucket ASC, ${recency} sort_key ASC, report_id ASC
);`;
}

function readIDs(rows: SqlRow[]): string[] {
    const joined = rows.at(0)?.ids;
    return typeof joined === 'string' && joined.length > 0 ? joined.split(ID_SEPARATOR) : [];
}

/** Applies one version of the LHN rows and returns the three lists the sidebar renders, in one transaction. */
function ingestAndOrderLhn(driver: SqlDriver, request: OrderLhnRequest): Promise<LhnOrderResult> {
    return driver.transaction(async (tx) => {
        const ingestStartedAt = performance.now();
        await tx.executeBatch(buildIngestCommands(request));
        const ingestMs = performance.now() - ingestStartedAt;

        const queryStartedAt = performance.now();
        const reportIDs = readIDs(await tx.execute(buildOrderStatement(request.priorityMode, '')));
        const unreadReportIDs = readIDs(await tx.execute(buildOrderStatement(request.priorityMode, 'WHERE is_unread = 1')));
        const todoReportIDs = readIDs(await tx.execute(buildOrderStatement(request.priorityMode, 'WHERE is_todo = 1')));
        const queryMs = performance.now() - queryStartedAt;

        return {reportIDs, unreadReportIDs, todoReportIDs, ingestMs, queryMs};
    });
}

async function readLhnRowCount(driver: SqlDriver): Promise<number> {
    const rows = await driver.execute(COUNT_QUERY);
    const value = rows.at(0)?.lhn_row_count;
    return typeof value === 'number' ? value : 0;
}

export {createLhnSchema, ingestAndOrderLhn, readLhnRowCount, buildOrderStatement};
export type {LhnOrderResult};
