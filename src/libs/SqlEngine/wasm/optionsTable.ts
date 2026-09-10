import type {SqlBatchCommand, SqlDriver, SqlRow, SqlValue} from '@libs/SqlEngine/SqlDriver';

import type {IngestOptionsRequest, OptionIndexKind, OptionsMatcher, SearchOptionsRequest} from './protocol';

type OptionsSearchResult = {
    reportIDs: string[];
    contactIDs: string[];
    hasMoreReports: boolean;
    hasMoreContacts: boolean;
    queryMs: number;
};

const KIND_CODE: Record<OptionIndexKind, number> = {report: 0, contact: 1};

/** The trigram tokenizer indexes nothing shorter than three characters, so shorter terms fall back to LIKE. */
const FTS_MIN_TERM_LENGTH = 3;

/*
 * `row_id` exists for FTS5, which addresses its external content table by rowid. The unique (kind, id)
 * pair is the key the main thread uses.
 */
const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS option_rows (
    row_id      INTEGER PRIMARY KEY,
    kind        INTEGER NOT NULL,
    id          TEXT NOT NULL,
    search_text TEXT NOT NULL,
    order_key   TEXT NOT NULL,
    is_hidden   INTEGER NOT NULL,
    UNIQUE (kind, id)
);`;

const CREATE_ORDER_INDEX = 'CREATE INDEX IF NOT EXISTS option_rows_order ON option_rows (kind, is_hidden, order_key);';

const CREATE_FTS = `CREATE VIRTUAL TABLE IF NOT EXISTS option_fts USING fts5(search_text, content='option_rows', content_rowid='row_id', tokenize='trigram');`;

const CREATE_FTS_TRIGGERS = [
    `CREATE TRIGGER IF NOT EXISTS option_rows_ai AFTER INSERT ON option_rows BEGIN
        INSERT INTO option_fts (rowid, search_text) VALUES (new.row_id, new.search_text);
    END;`,
    `CREATE TRIGGER IF NOT EXISTS option_rows_ad AFTER DELETE ON option_rows BEGIN
        INSERT INTO option_fts (option_fts, rowid, search_text) VALUES ('delete', old.row_id, old.search_text);
    END;`,
    `CREATE TRIGGER IF NOT EXISTS option_rows_au AFTER UPDATE ON option_rows BEGIN
        INSERT INTO option_fts (option_fts, rowid, search_text) VALUES ('delete', old.row_id, old.search_text);
        INSERT INTO option_fts (rowid, search_text) VALUES (new.row_id, new.search_text);
    END;`,
];

const DELETE_ALL = 'DELETE FROM option_rows;';

const DELETE_ROW = 'DELETE FROM option_rows WHERE kind = ? AND id = ?;';

const UPSERT_ROW = `INSERT INTO option_rows (kind, id, search_text, order_key, is_hidden) VALUES (?, ?, ?, ?, ?)
ON CONFLICT (kind, id) DO UPDATE SET search_text = excluded.search_text, order_key = excluded.order_key, is_hidden = excluded.is_hidden;`;

const COUNT_QUERY = 'SELECT COUNT(*) AS option_row_count FROM option_rows;';

async function createOptionsSchema(driver: SqlDriver, matcher: OptionsMatcher): Promise<void> {
    const commands: SqlBatchCommand[] = [{sql: CREATE_TABLE}, {sql: CREATE_ORDER_INDEX}];
    if (matcher === 'fts') {
        commands.push({sql: CREATE_FTS}, ...CREATE_FTS_TRIGGERS.map((sql) => ({sql})));
    }
    await driver.executeBatch(commands);
}

function buildIngestCommands(request: IngestOptionsRequest): SqlBatchCommand[] {
    const commands: SqlBatchCommand[] = [];
    if (request.full) {
        commands.push({sql: DELETE_ALL});
    } else if (request.deletes.length > 0) {
        commands.push({sql: DELETE_ROW, params: request.deletes.map((ref) => [KIND_CODE[ref.kind], ref.id])});
    }
    if (request.upserts.length > 0) {
        commands.push({sql: UPSERT_ROW, params: request.upserts.map((row) => [KIND_CODE[row.kind], row.id, row.searchText, row.orderKey, row.isHidden ? 1 : 0])});
    }
    return commands;
}

/** Applies one version of the option index inside a single transaction and returns the time it took. */
function ingestOptionRows(driver: SqlDriver, request: IngestOptionsRequest): Promise<number> {
    return driver.transaction(async (tx) => {
        const startedAt = performance.now();
        await tx.executeBatch(buildIngestCommands(request));
        return performance.now() - startedAt;
    });
}

function escapeLikePattern(term: string): string {
    return `%${term.replaceAll(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

function toFtsPhrase(term: string): string {
    return `"${term.replaceAll('"', '""')}"`;
}

type SearchStatement = {
    sql: string;
    params: SqlValue[];
};

/**
 * One window per kind: rows the substring filter keeps, ordered by the router's own key (ties broken by id, which
 * the JS heap leaves unspecified), plus one extra row so the caller learns whether the window was cut. The ids come back joined so a single value
 * crosses the wasm boundary instead of one row per match.
 */
function buildSearchStatement(matcher: OptionsMatcher, terms: string[], kind: OptionIndexKind, limit: number): SearchStatement {
    const direction = kind === 'report' ? 'DESC' : 'ASC';
    const ftsTerms = matcher === 'fts' ? terms.filter((term) => term.length >= FTS_MIN_TERM_LENGTH) : [];
    const likeTerms = terms.filter((term) => !ftsTerms.includes(term));
    const rowsAlias = ftsTerms.length > 0 ? 'o' : 'option_rows';
    const likePredicates = likeTerms.map(() => `AND ${rowsAlias}.search_text LIKE ? ESCAPE '\\'`).join(' ');
    const likeParams = likeTerms.map(escapeLikePattern);

    if (ftsTerms.length > 0) {
        return {
            sql: `SELECT group_concat(id, ',') AS ids, COUNT(*) AS matched FROM (
    SELECT o.id AS id FROM option_fts f JOIN option_rows o ON o.row_id = f.rowid
    WHERE option_fts MATCH ? AND o.kind = ? AND o.is_hidden = 0 ${likePredicates}
    ORDER BY o.order_key ${direction}, o.id ${direction} LIMIT ?
);`,
            params: [ftsTerms.map(toFtsPhrase).join(' AND '), KIND_CODE[kind], ...likeParams, limit + 1],
        };
    }

    return {
        sql: `SELECT group_concat(id, ',') AS ids, COUNT(*) AS matched FROM (
    SELECT id FROM option_rows
    WHERE kind = ? AND is_hidden = 0 ${likePredicates}
    ORDER BY order_key ${direction}, id ${direction} LIMIT ?
);`,
        params: [KIND_CODE[kind], ...likeParams, limit + 1],
    };
}

function readWindow(rows: SqlRow[], limit: number): {ids: string[]; hasMore: boolean} {
    const row = rows.at(0);
    const joined = row?.ids;
    const matched = row?.matched;
    const ids = typeof joined === 'string' && joined.length > 0 ? joined.split(',') : [];
    const hasMore = typeof matched === 'number' && matched > limit;
    return {ids: hasMore ? ids.slice(0, limit) : ids, hasMore};
}

async function searchOptionRows(driver: SqlDriver, request: SearchOptionsRequest, matcher: OptionsMatcher): Promise<OptionsSearchResult> {
    const startedAt = performance.now();
    const reportStatement = buildSearchStatement(matcher, request.terms, 'report', request.reportLimit);
    const contactStatement = buildSearchStatement(matcher, request.terms, 'contact', request.contactLimit);
    const reports = readWindow(await driver.execute(reportStatement.sql, reportStatement.params), request.reportLimit);
    const contacts = readWindow(await driver.execute(contactStatement.sql, contactStatement.params), request.contactLimit);
    return {
        reportIDs: reports.ids,
        contactIDs: contacts.ids,
        hasMoreReports: reports.hasMore,
        hasMoreContacts: contacts.hasMore,
        queryMs: performance.now() - startedAt,
    };
}

async function readOptionRowCount(driver: SqlDriver): Promise<number> {
    const rows = await driver.execute(COUNT_QUERY);
    const value = rows.at(0)?.option_row_count;
    return typeof value === 'number' ? value : 0;
}

export {createOptionsSchema, ingestOptionRows, searchOptionRows, readOptionRowCount, buildSearchStatement, FTS_MIN_TERM_LENGTH};
export type {OptionsSearchResult};
