import type {SqlBatchCommand, SqlDriver, SqlRow, SqlValue} from '@libs/SqlEngine/SqlDriver';

import type {OptionsSearchPlan} from './optionsSearchPlan';
import type {IngestOptionsRequest, OptionIndexKind, OptionsMatcher, SearchOptionsRequest} from './protocol';

import {buildOptionsSearchPlan, FTS_MIN_TERM_LENGTH} from './optionsSearchPlan';

type OptionsSearchResult = {
    reportIDs: string[];
    contactIDs: string[];
    matchedReports: number;
    matchedContacts: number;
    queryMs: number;
};

const KIND_CODE: Record<OptionIndexKind, number> = {report: 0, contact: 1};

/*
 * Two trailing spaces, so every one- and two-character substring of the text is also the prefix of an indexed
 * trigram. Without them a short term sitting at the very end of the text has no trigram to be found by, and the
 * prefix probe in `optionsSearchPlan` would report an empty result for a row that does match.
 */
const SEARCH_TEXT_SENTINEL = '  ';

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
    is_valid    INTEGER NOT NULL,
    UNIQUE (kind, id)
);`;

/*
 * The three filter columns come first as equalities, then the two ORDER BY terms in the order the query asks
 * for them, so the whole window is one index walk that the LIMIT stops. Without `id` the tie-break costs a
 * temp b-tree over every row of the kind.
 */
const CREATE_ORDER_INDEX = 'CREATE INDEX IF NOT EXISTS option_rows_order ON option_rows (kind, is_hidden, is_valid, order_key, id);';

const CREATE_FTS = `CREATE VIRTUAL TABLE IF NOT EXISTS option_fts USING fts5(search_text, content='option_rows', content_rowid='row_id', tokenize='trigram');`;

/** A view over the terms of the index itself, so a query can be costed without reading a single option row. */
const CREATE_VOCAB = `CREATE VIRTUAL TABLE IF NOT EXISTS option_vocab USING fts5vocab(option_fts, 'row');`;

const FTS_TRIGGER_NAMES = ['option_rows_ai', 'option_rows_ad', 'option_rows_au'];

const DROP_FTS_TRIGGERS = FTS_TRIGGER_NAMES.map((name) => `DROP TRIGGER IF EXISTS ${name};`);

const REBUILD_FTS = `INSERT INTO option_fts(option_fts) VALUES('rebuild');`;

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

const UPSERT_ROW = `INSERT INTO option_rows (kind, id, search_text, order_key, is_hidden, is_valid) VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT (kind, id) DO UPDATE SET search_text = excluded.search_text, order_key = excluded.order_key, is_hidden = excluded.is_hidden, is_valid = excluded.is_valid;`;

const COUNT_QUERY = 'SELECT COUNT(*) AS option_row_count FROM option_rows;';

async function createOptionsSchema(driver: SqlDriver, matcher: OptionsMatcher): Promise<void> {
    const commands: SqlBatchCommand[] = [{sql: CREATE_TABLE}, {sql: CREATE_ORDER_INDEX}];
    if (matcher === 'fts') {
        commands.push({sql: CREATE_FTS}, {sql: CREATE_VOCAB}, ...CREATE_FTS_TRIGGERS.map((sql) => ({sql})));
    }
    await driver.executeBatch(commands);
}

/*
 * A full load rebuilds the FTS index in one pass instead of paying three trigger statements per row: 206 ms
 * against 1338 ms at 45,000 rows. An incremental load keeps the triggers, which cost 0.036 ms per upserted row.
 */
function buildIngestCommands(request: IngestOptionsRequest, matcher: OptionsMatcher): SqlBatchCommand[] {
    const isBulkRebuild = request.full && matcher === 'fts';
    const commands: SqlBatchCommand[] = isBulkRebuild ? DROP_FTS_TRIGGERS.map((sql) => ({sql})) : [];
    if (request.full) {
        commands.push({sql: DELETE_ALL});
    } else if (request.deletes.length > 0) {
        commands.push({sql: DELETE_ROW, params: request.deletes.map((ref) => [KIND_CODE[ref.kind], ref.id])});
    }
    if (request.upserts.length > 0) {
        commands.push({
            sql: UPSERT_ROW,
            params: request.upserts.map((row) => [KIND_CODE[row.kind], row.id, `${row.searchText}${SEARCH_TEXT_SENTINEL}`, row.orderKey, row.isHidden ? 1 : 0, row.isValid ? 1 : 0]),
        });
    }
    if (isBulkRebuild) {
        commands.push({sql: REBUILD_FTS}, ...CREATE_FTS_TRIGGERS.map((sql) => ({sql})));
    }
    return commands;
}

/** Applies one version of the option index inside a single transaction and returns the time it took. */
function ingestOptionRows(driver: SqlDriver, request: IngestOptionsRequest, matcher: OptionsMatcher): Promise<number> {
    return driver.transaction(async (tx) => {
        const startedAt = performance.now();
        await tx.executeBatch(buildIngestCommands(request, matcher));
        return performance.now() - startedAt;
    });
}

function escapeLikePattern(term: string): string {
    return `%${term.replaceAll(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

type SearchStatement = {
    sql: string;
    params: SqlValue[];
};

/**
 * One window per kind: rows the substring filter keeps, ordered by the router's own key (ties broken by id, which
 * the JS heap leaves unspecified), plus one extra row so the caller learns whether the window was cut. The ids come back joined so a single value
 * crosses the wasm boundary instead of one row per match.
 *
 * A `driver` plan reads the rows of one selective MATCH expression and filters them with LIKE; the trigram match
 * of a whole term is already the substring match, so only that term may skip its LIKE predicate. A `scan` plan
 * walks the order index and lets the LIMIT stop it.
 */
function buildSearchStatement(terms: string[], kind: OptionIndexKind, limit: number, plan: OptionsSearchPlan): SearchStatement {
    const direction = kind === 'report' ? 'DESC' : 'ASC';
    const isDriven = plan.type === 'driver';
    const likeTerms = isDriven ? terms.filter((term) => term !== plan.exactTerm) : terms;
    const rowsAlias = isDriven ? 'o' : 'option_rows';
    const likePredicates = likeTerms.map(() => `AND ${rowsAlias}.search_text LIKE ? ESCAPE '\\'`).join(' ');
    const likeParams = likeTerms.map(escapeLikePattern);

    if (plan.type === 'driver') {
        // CROSS JOIN pins the FTS table as the outer loop. Left to itself the planner drives from the covering
        // order index and runs one MATCH per row, which costs hundreds of milliseconds at 45,000 rows.
        return {
            sql: `SELECT group_concat(id, ',') AS ids, COUNT(*) AS matched FROM (
    SELECT o.id AS id FROM option_fts f CROSS JOIN option_rows o ON o.row_id = f.rowid
    WHERE option_fts MATCH ? AND o.kind = ? AND o.is_hidden = 0 AND o.is_valid = 1 ${likePredicates}
    ORDER BY o.order_key ${direction}, o.id ${direction} LIMIT ?
);`,
            params: [plan.match, KIND_CODE[kind], ...likeParams, limit + 1],
        };
    }

    return {
        sql: `SELECT group_concat(id, ',') AS ids, COUNT(*) AS matched FROM (
    SELECT id FROM option_rows
    WHERE kind = ? AND is_hidden = 0 AND is_valid = 1 ${likePredicates}
    ORDER BY order_key ${direction}, id ${direction} LIMIT ?
);`,
        params: [KIND_CODE[kind], ...likeParams, limit + 1],
    };
}

// `matched` counts the rows the statement read, which its own `LIMIT ? + 1` bounds: one above the window means
// at least one match waits behind it.
function readWindow(rows: SqlRow[], limit: number): {ids: string[]; matched: number} {
    const row = rows.at(0);
    const joined = row?.ids;
    const count = row?.matched;
    const ids = typeof joined === 'string' && joined.length > 0 ? joined.split(',') : [];
    const matched = typeof count === 'number' ? count : 0;
    return {ids: matched > limit ? ids.slice(0, limit) : ids, matched};
}

const EMPTY_WINDOW = {ids: [], matched: 0} satisfies {ids: string[]; matched: number};

async function readSearchWindow(driver: SqlDriver, terms: string[], kind: OptionIndexKind, limit: number, plan: OptionsSearchPlan) {
    if (plan.type === 'empty') {
        return EMPTY_WINDOW;
    }
    const statement = buildSearchStatement(terms, kind, limit, plan);
    return readWindow(await driver.execute(statement.sql, statement.params), limit);
}

async function searchOptionRows(driver: SqlDriver, request: SearchOptionsRequest, matcher: OptionsMatcher): Promise<OptionsSearchResult> {
    const startedAt = performance.now();
    const plan = await buildOptionsSearchPlan(driver, matcher, request.terms);
    const reports = await readSearchWindow(driver, request.terms, 'report', request.reportLimit, plan);
    const contacts = await readSearchWindow(driver, request.terms, 'contact', request.contactLimit, plan);
    return {
        reportIDs: reports.ids,
        contactIDs: contacts.ids,
        matchedReports: reports.matched,
        matchedContacts: contacts.matched,
        queryMs: performance.now() - startedAt,
    };
}

async function readOptionRowCount(driver: SqlDriver): Promise<number> {
    const rows = await driver.execute(COUNT_QUERY);
    const value = rows.at(0)?.option_row_count;
    return typeof value === 'number' ? value : 0;
}

export {createOptionsSchema, ingestOptionRows, searchOptionRows, readOptionRowCount, buildSearchStatement, SEARCH_TEXT_SENTINEL, FTS_MIN_TERM_LENGTH};
export type {OptionsSearchResult};
