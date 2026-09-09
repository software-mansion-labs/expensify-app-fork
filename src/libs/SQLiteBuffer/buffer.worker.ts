import type {Report} from '@src/types/onyx';

/* eslint-disable no-restricted-globals */
/**
 * SQLite buffer worker (MVP stage 1, web only).
 *
 * Owns a SQLite (WASM) database persisted in OPFS via the `opfs-sahpool` VFS, which works in a
 * plain dedicated worker (no COOP/COEP requirement). Receives echo-mode batches from the mirror
 * on the main thread and applies them inside transactions. Hybrid schema: the full JSON blob is
 * the source of truth in `data`; queryable fields are VIRTUAL generated columns with indexes.
 * The DDL and blob-entity CRUD are generated from the typed specs in ./schema.ts, which bind every
 * generated column to a field of the corresponding Onyx type.
 */
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

import type {BufferOp, MainToWorkerMessage, WorkerToMainMessage} from './protocol';
import type {ReportAttributes, ReportGeneratedRow} from './schema';

import {BLOB_STATEMENTS, ID_COLUMN_BY_ENTITY, SCHEMA, TABLE_BY_ENTITY} from './schema';

/**
 * One-time backfill: rows written before the FTS table/triggers existed (or restored from a prior
 * session's OPFS file) get indexed here. Cheap no-op when counts already match.
 */
function backfillFTS(): {indexed: number; tookMs: number} {
    const start = performance.now();
    let ftsMessages = 0;
    let actions = 0;
    db.exec({
        sql: `SELECT (SELECT COUNT(*) FROM fts WHERE kind = 'msg') AS f, (SELECT COUNT(*) FROM report_actions) AS a`,
        rowMode: 'object',
        callback: (row: {f: number; a: number}) => {
            ftsMessages = row.f;
            actions = row.a;
        },
    });
    let indexed = 0;
    if (ftsMessages === 0 && actions > 0) {
        db.exec('BEGIN');
        db.exec(`INSERT INTO fts (text, kind, reportID, actionID)
                 SELECT json_extract(data, '$.message[0].text'), 'msg', reportID, actionID FROM report_actions
                 WHERE json_extract(data, '$.message[0].text') IS NOT NULL`);
        db.exec(`INSERT INTO fts (text, kind, reportID)
                 SELECT json_extract(data, '$.reportName'), 'report', id FROM report_attributes
                 WHERE json_extract(data, '$.reportName') IS NOT NULL`);
        db.exec('COMMIT');
        db.exec({
            sql: `SELECT COUNT(*) FROM fts`,
            callback: (row: number[]) => {
                indexed = row[0];
            },
        });
    }
    return {indexed, tookMs: performance.now() - start};
}

/** Escapes a user query into FTS5 MATCH syntax: each token quoted, last token as a prefix. */
function toFTSQuery(raw: string): string {
    const tokens = raw
        .split(/\s+/)
        .map((token) => token.replaceAll('"', ''))
        .filter(Boolean);
    if (tokens.length === 0) {
        return '""';
    }
    return tokens.map((token, index) => (index === tokens.length - 1 ? `"${token}"*` : `"${token}"`)).join(' ');
}

// The oo1 DB type isn't exported cleanly by the package; keep it loose in the MVP.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any;

const stats = {
    initMs: 0,
    batches: 0,
    ops: 0,
    writeMs: 0,
    maxBatchMs: 0,
    endToEndMs: 0,
    ftsBackfillIndexed: 0,
    ftsBackfillMs: 0,
    errors: [] as string[],
};

function post(message: WorkerToMainMessage) {
    self.postMessage(message);
}

function applyOp(op: BufferOp) {
    switch (op.entity) {
        case 'draft':
            if (op.value === null || op.value === '') {
                db.exec({sql: 'DELETE FROM drafts WHERE id = ?', bind: [op.id]});
            } else {
                db.exec({sql: 'INSERT OR REPLACE INTO drafts (id, hasDraft) VALUES (?, 1)', bind: [op.id]});
            }
            break;
        case 'reportActions': {
            // Echo mode delivers the full current actions object for the report — replace the report's rows wholesale.
            db.exec({sql: 'DELETE FROM report_actions WHERE reportID = ?', bind: [op.id]});
            if (op.value !== null && typeof op.value === 'object') {
                for (const [actionID, action] of Object.entries(op.value as Record<string, unknown>)) {
                    if (action === null || action === undefined) {
                        continue;
                    }
                    db.exec({sql: 'INSERT OR REPLACE INTO report_actions (reportID, actionID, data) VALUES (?, ?, ?)', bind: [op.id, actionID, JSON.stringify(action)]});
                }
            }
            break;
        }
        default: {
            const statements = BLOB_STATEMENTS[op.entity];
            if (!statements) {
                break;
            }
            if (op.value === null) {
                db.exec({sql: statements.remove, bind: [op.id]});
            } else {
                db.exec({sql: statements.upsert, bind: [op.id, JSON.stringify(op.value), ...(statements.extraValues?.(op.value) ?? [])]});
            }
            break;
        }
    }
}

function applyBatch(ops: BufferOp[], enqueuedAt: number) {
    const start = performance.now();
    db.exec('BEGIN');
    try {
        for (const op of ops) {
            applyOp(op);
        }
        db.exec('COMMIT');
    } catch (error) {
        db.exec('ROLLBACK');
        stats.errors.push(String(error));
        if (stats.errors.length > 20) {
            stats.errors.shift();
        }
        return;
    }
    const elapsed = performance.now() - start;
    stats.batches += 1;
    stats.ops += ops.length;
    stats.writeMs += elapsed;
    stats.maxBatchMs = Math.max(stats.maxBatchMs, elapsed);
    stats.endToEndMs += Date.now() - enqueuedAt;
}

function rowCount(table: string): number {
    let count = 0;
    db.exec({
        sql: `SELECT COUNT(*) FROM ${table}`,
        callback: (row: number[]) => {
            count = row[0];
        },
    });
    return count;
}

function dbBytes(): number {
    let pageCount = 0;
    let pageSize = 0;
    db.exec({
        sql: 'PRAGMA page_count',
        callback: (row: number[]) => {
            pageCount = row[0];
        },
    });
    db.exec({
        sql: 'PRAGMA page_size',
        callback: (row: number[]) => {
            pageSize = row[0];
        },
    });
    return pageCount * pageSize;
}

// ===== LHN ordering, ported from SidebarUtils (categorizeReportsForLHN + sortCategorizedReports + combineReportCategories) =====

const DIGIT_SEQUENCE = /\d+/g;
const NUMERIC_PAD_WIDTH = 15;

/** Port of SidebarUtils.buildSortKey: lowercase + zero-pad digit runs so plain string compare gives numeric-aware ordering. */
function buildSortKey(displayName: string): string {
    return displayName.toLowerCase().replaceAll(DIGIT_SEQUENCE, (match) => match.padStart(NUMERIC_PAD_WIDTH, '0'));
}

type LhnMini = {id: string; sortKey: string; displayName: string; date: string; group: 0 | 1 | 2 | 3 | 4};

/** Shared tail of the LHN pipeline: sort each of the five groups and concatenate (port of sortCategorizedReports + combineReportCategories). */
function orderMinis(minis: LhnMini[], focusMode: boolean): string[] {
    const groups: LhnMini[][] = [[], [], [], [], []];
    for (const mini of minis) {
        groups[mini.group].push(mini);
    }
    const byName = (a: LhnMini, b: LhnMini) => {
        if (a.sortKey < b.sortKey) {
            return -1;
        }
        if (a.sortKey > b.sortKey) {
            return 1;
        }
        if (!a.displayName || !b.displayName) {
            return 0;
        }
        return a.displayName.localeCompare(b.displayName);
    };
    const byDateDesc = (a: LhnMini, b: LhnMini) => (a.date && b.date ? (b.date < a.date ? -1 : b.date > a.date ? 1 : 0) : 0);
    const byDateThenName = (a: LhnMini, b: LhnMini) => byDateDesc(a, b) || byName(a, b);
    groups[0].sort(byName);
    groups[1].sort(byName);
    groups[2].sort(byName);
    if (focusMode) {
        groups[3].sort(byName);
        groups[4].sort(byName);
    } else {
        groups[3].sort(byDateThenName);
        groups[4].sort(byDateDesc);
    }
    return groups.flat().map((mini) => mini.id);
}

// The report columns come typed from the schema specs; the rest are query aliases and join columns.
type LhnRow = ReportGeneratedRow & {
    id: string;
    rawName: string | null;
    attrName: string | null;
    requiresAttention: number | null;
    hasErrors: number | null;
    hasDraft: number | null;
    isArchived: number | null;
};

function computeLHNOrder(ids: string[] | null, focusMode: boolean): {orderedIds: string[]; missingIds: string[]} {
    // Restrict to the given candidate set via a temp table (avoids SQL variable limits at 10k+ ids).
    db.exec('DROP TABLE IF EXISTS temp.lhn_ids');
    let joinClause = '';
    if (ids !== null) {
        db.exec('CREATE TEMP TABLE lhn_ids (id TEXT PRIMARY KEY)');
        db.exec('BEGIN');
        for (const id of ids) {
            db.exec({sql: 'INSERT OR IGNORE INTO temp.lhn_ids (id) VALUES (?)', bind: [id]});
        }
        db.exec('COMMIT');
        joinClause = 'JOIN temp.lhn_ids f ON f.id = r.id';
    }

    const rows: LhnRow[] = [];
    db.exec({
        sql: `SELECT r.id AS id, r.lastVisibleActionCreated AS lastVisibleActionCreated, r.isPinned AS isPinned, r.reportType AS reportType,
                     json_extract(r.data, '$.reportName') AS rawName,
                     a.reportName AS attrName, a.requiresAttention AS requiresAttention, a.hasErrors AS hasErrors,
                     d.hasDraft AS hasDraft, v.isArchived AS isArchived
              FROM reports r
              ${joinClause}
              LEFT JOIN report_attributes a ON a.id = r.id
              LEFT JOIN drafts d ON d.id = r.id
              LEFT JOIN rnvp v ON v.id = r.id`,
        rowMode: 'object',
        callback: (row: LhnRow) => {
            rows.push(row);
        },
    });

    const found = new Set(rows.map((row) => row.id));
    const missingIds = ids === null ? [] : ids.filter((id) => !found.has(id));

    const minis: LhnMini[] = rows.map((row) => {
        const displayName = row.attrName ?? row.rawName ?? '';
        // Port of isArchivedNonExpenseReport: archived flag from RNVP, expense reports excluded.
        const isArchivedNonExpense = !!row.isArchived && row.reportType !== 'expense';
        let group: LhnMini['group'] = 3;
        if (row.isPinned || row.requiresAttention) {
            group = 0;
        } else if (row.hasErrors && !isArchivedNonExpense) {
            group = 1;
        } else if (row.hasDraft) {
            group = 2;
        } else if (isArchivedNonExpense) {
            group = 4;
        }
        return {id: row.id, displayName, sortKey: buildSortKey(displayName), date: row.lastVisibleActionCreated ?? '', group};
    });

    return {orderedIds: orderMinis(minis, focusMode), missingIds};
}

type LhnFullParams = {
    focusMode: boolean;
    currentReportID: string | null;
    conciergeReportID: string | null;
    currentUserAccountID: number;
};

const UNSUPPORTED_REPORT_TYPES = new Set(['paycheck', 'bill']);
const WORKSPACE_ROOM_CHAT_TYPES = new Set(['policyAdmins', 'policyAnnounce', 'domainAll', 'policyRoom', 'policyExpenseChat', 'invoiceRoom', 'tripRoom']);

/**
 * Stage-3 port of the LHN membership filter (SidebarUtils.shouldDisplayReportInLHN +
 * ReportUtils.reasonForReportToBeInOptionList), computed entirely from buffer data.
 * Deliberately covers the dominant predicates; the parity comparator quantifies the residue
 * (known v1 gaps: one-transaction threads, canAccessReport betas, violations on expense requests,
 * parent-action-deleted thread hiding, domain-email logins).
 */
function computeLHNFull(params: LhnFullParams): {orderedIds: string[]} {
    // Aggregate per-report action info once: count + the single action's name (for the empty-submitted-report rule).
    const actionsInfo = new Map<string, {count: number; onlyAction: string | null}>();
    db.exec({
        sql: `SELECT reportID, COUNT(*) AS n, MIN(json_extract(data, '$.actionName')) AS minA, MAX(json_extract(data, '$.actionName')) AS maxA FROM report_actions GROUP BY reportID`,
        rowMode: 'object',
        callback: (row: {reportID: string; n: number; minA: string | null; maxA: string | null}) => {
            actionsInfo.set(row.reportID, {count: row.n, onlyAction: row.n === 1 && row.minA === row.maxA ? row.minA : null});
        },
    });

    const minis: LhnMini[] = [];
    db.exec({
        sql: `SELECT r.id AS id, r.data AS data, a.data AS attrData, a.hasErrors AS hasErrors, d.hasDraft AS hasDraft, v.isArchived AS isArchived
              FROM reports r
              LEFT JOIN report_attributes a ON a.id = r.id
              LEFT JOIN drafts d ON d.id = r.id
              LEFT JOIN rnvp v ON v.id = r.id`,
        rowMode: 'object',
        callback: (row: {id: string; data: string; attrData: string | null; hasErrors: number | null; hasDraft: number | null; isArchived: number | null}) => {
            // The rows hold post-merge Onyx values mirrored verbatim, so the parse can only yield these shapes.
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
            const report = JSON.parse(row.data) as Report;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
            const attrs = row.attrData ? (JSON.parse(row.attrData) as ReportAttributes) : null;
            const hasDraft = !!row.hasDraft;
            const isReportArchived = !!row.isArchived;
            const hasErrors = !!row.hasErrors;
            const requiresAttention = !!attrs?.requiresAttention;
            const chatType: string = report.chatType ?? '';
            const type: string = report.type ?? '';
            const isFocused = report.reportID === params.currentReportID;
            const isSystemChat = chatType === 'system';
            const isSelfDM = chatType === 'selfDM';
            const isChatRoom = WORKSPACE_ROOM_CHAT_TYPES.has(chatType);
            const isThreadReport = !!report.parentReportID && !!report.parentReportActionID;
            const isArchivedNonExpense = isReportArchived && type !== 'expense';

            const include = () => {
                const displayName: string = attrs?.reportName ?? report.reportName ?? '';
                let group: LhnMini['group'] = 3;
                if (report.isPinned || requiresAttention) {
                    group = 0;
                } else if (hasErrors && !isArchivedNonExpense) {
                    group = 1;
                } else if (hasDraft) {
                    group = 2;
                } else if (isArchivedNonExpense) {
                    group = 4;
                }
                minis.push({id: row.id, displayName, sortKey: buildSortKey(displayName), date: report.lastVisibleActionCreated ?? '', group});
            };

            if (!report.reportID || UNSUPPORTED_REPORT_TYPES.has(type)) {
                return;
            }
            // Errors always display (RBR must be resolvable) unless the report itself is inaccessible.
            if (hasErrors && !report.errorFields?.notFound) {
                include();
                return;
            }
            // Hidden for current user, unless something overrides it.
            // Port of getReportNotificationPreference: an empty/missing preference resolves to 'hidden'.
            const myNotificationPreference = report.participants?.[params.currentUserAccountID]?.notificationPreference || 'hidden';
            const isHidden = myNotificationPreference === 'hidden';
            const shouldOverrideHidden = hasDraft || hasErrors || isFocused || isSystemChat || !!report.isPinned || requiresAttention || (report.isOwnPolicyExpenseChat && !isReportArchived);
            if (isHidden && !shouldOverrideHidden) {
                return;
            }
            if (isFocused) {
                include();
                return;
            }
            // Reports with no data to show.
            if (!type || report.reportName === undefined) {
                return;
            }
            if (
                !report.participants &&
                !isChatRoom &&
                !isThreadReport &&
                !isReportArchived &&
                type !== 'expense' &&
                type !== 'iou' &&
                type !== 'task' &&
                !isSelfDM &&
                !isSystemChat &&
                chatType !== 'group'
            ) {
                return;
            }
            // Empty submitted money reports with only a CREATED action.
            const actions = actionsInfo.get(row.id);
            if (report.total === 0 && report.stateNum === 1 && report.statusNum === 1 && actions?.onlyAction === 'CREATED') {
                return;
            }
            if (hasDraft) {
                include();
                return;
            }
            if (requiresAttention) {
                include();
                return;
            }
            const isEmptyChat = attrs && typeof attrs.isEmpty === 'boolean' ? attrs.isEmpty : !report.lastVisibleActionCreated && !report.lastMessageText;
            if (report.isPinned) {
                include();
                return;
            }
            if (report.errorFields?.addWorkspaceRoom) {
                include();
                return;
            }
            if (params.focusMode) {
                const isUnread = !!report.lastVisibleActionCreated && (report.lastReadTime ?? '') < report.lastVisibleActionCreated;
                if (isUnread && myNotificationPreference !== 'mute') {
                    include();
                }
                return;
            }
            if (isArchivedNonExpense) {
                include();
                return;
            }
            // Hide empty chats between users (default mode).
            const isConcierge = report.reportID === params.conciergeReportID;
            const isSelfDMVisible = isSelfDM && !isHidden;
            if (isEmptyChat && type === 'chat' && chatType !== 'policyExpenseChat' && chatType !== 'tripRoom' && !isConcierge && !isSystemChat && !isSelfDMVisible) {
                return;
            }
            include();
        },
    });

    return {orderedIds: orderMinis(minis, params.focusMode)};
}

function handleMessage(message: MainToWorkerMessage) {
    switch (message.type) {
        case 'batch':
            applyBatch(message.ops, message.enqueuedAt);
            break;
        case 'stats':
            post({
                type: 'stats',
                requestID: message.requestID,
                stats: {
                    ...stats,
                    rows: {
                        reports: rowCount('reports'),
                        report_actions: rowCount('report_actions'),
                        transactions: rowCount('transactions'),
                        fts: rowCount('fts'),
                    },
                    dbBytes: dbBytes(),
                },
            });
            break;
        case 'compare': {
            const table = TABLE_BY_ENTITY[message.entity];
            const idColumn = ID_COLUMN_BY_ENTITY[message.entity];
            const rows: Record<string, string | null> = {};
            for (const id of message.ids) {
                rows[id] = null;
                db.exec({
                    sql:
                        message.entity === 'reportActions'
                            ? `SELECT json_group_object(actionID, json(data)) FROM ${table} WHERE ${idColumn} = ?`
                            : `SELECT data FROM ${table} WHERE ${idColumn} = ?`,
                    bind: [id],
                    callback: (row: Array<string | null>) => {
                        rows[id] = row[0];
                    },
                });
            }
            post({type: 'compare', requestID: message.requestID, rows});
            break;
        }
        case 'lhn': {
            const start = performance.now();
            try {
                const {orderedIds, missingIds} = computeLHNOrder(message.ids, message.focusMode);
                post({type: 'lhn', requestID: message.requestID, orderedIds, missingIds, tookMs: performance.now() - start});
            } catch (error) {
                post({type: 'lhn', requestID: message.requestID, orderedIds: [], missingIds: [], tookMs: performance.now() - start, error: String(error)});
            }
            break;
        }
        case 'lhnFull': {
            const start = performance.now();
            try {
                const {orderedIds} = computeLHNFull({
                    focusMode: message.focusMode,
                    currentReportID: message.currentReportID,
                    conciergeReportID: message.conciergeReportID,
                    currentUserAccountID: message.currentUserAccountID,
                });
                post({type: 'lhnFull', requestID: message.requestID, orderedIds, tookMs: performance.now() - start});
            } catch (error) {
                post({type: 'lhnFull', requestID: message.requestID, orderedIds: [], tookMs: performance.now() - start, error: String(error)});
            }
            break;
        }
        case 'lhnData': {
            // Flag-flip data path: the full pipeline plus the row payloads for the top of the list,
            // so the LHN can render without any hydrated report collection on the main thread.
            const start = performance.now();
            try {
                const {orderedIds} = computeLHNFull({
                    focusMode: message.focusMode,
                    currentReportID: message.currentReportID,
                    conciergeReportID: message.conciergeReportID,
                    currentUserAccountID: message.currentUserAccountID,
                });
                const windowIds = orderedIds.slice(0, message.windowSize);
                const reportRows: Array<[string, string]> = [];
                for (let offset = 0; offset < windowIds.length; offset += 200) {
                    const chunk = windowIds.slice(offset, offset + 200);
                    db.exec({
                        sql: `SELECT id, data FROM reports WHERE id IN (${chunk.map(() => '?').join(',')})`,
                        bind: chunk,
                        rowMode: 'array',
                        callback: (row: [string, string]) => {
                            reportRows.push([row[0], row[1]]);
                        },
                    });
                }
                post({type: 'lhnData', requestID: message.requestID, orderedIds, reportRows, tookMs: performance.now() - start});
            } catch (error) {
                post({type: 'lhnData', requestID: message.requestID, orderedIds: [], reportRows: [], tookMs: performance.now() - start, error: String(error)});
            }
            break;
        }
        case 'search': {
            const start = performance.now();
            const results: Array<{kind: string; reportID: string; actionID: string | null; snippet: string; rank: number}> = [];
            try {
                db.exec({
                    sql: `SELECT kind, reportID, actionID, snippet(fts, 0, '<b>', '</b>', '…', 12) AS snip, rank
                          FROM fts WHERE fts MATCH ? ORDER BY rank LIMIT ?`,
                    bind: [toFTSQuery(message.query), message.limit ?? 50],
                    rowMode: 'object',
                    callback: (row: {kind: string; reportID: string; actionID: string | null; snip: string; rank: number}) => {
                        results.push({kind: row.kind, reportID: row.reportID, actionID: row.actionID, snippet: row.snip, rank: row.rank});
                    },
                });
                post({type: 'search', requestID: message.requestID, results, tookMs: performance.now() - start});
            } catch (error) {
                post({type: 'search', requestID: message.requestID, results: [], tookMs: performance.now() - start, error: String(error)});
            }
            break;
        }
        case 'query': {
            const rows: unknown[] = [];
            try {
                db.exec({
                    sql: message.sql,
                    bind: message.bind ?? [],
                    rowMode: 'object',
                    callback: (row: unknown) => {
                        rows.push(row);
                    },
                });
                post({type: 'query', requestID: message.requestID, rows});
            } catch (error) {
                post({type: 'query', requestID: message.requestID, rows: [], error: String(error)});
            }
            break;
        }
        default:
            break;
    }
}

const pendingUntilReady: MainToWorkerMessage[] = [];
let isReady = false;

self.onmessage = (event: MessageEvent<MainToWorkerMessage>) => {
    if (!isReady) {
        pendingUntilReady.push(event.data);
        return;
    }
    handleMessage(event.data);
};

async function init() {
    const start = performance.now();
    try {
        const sqlite3 = await sqlite3InitModule();
        const pool = await sqlite3.installOpfsSAHPoolVfs({directory: '/sqlite-buffer'});
        // eslint-disable-next-line new-cap
        db = new pool.OpfsSAHPoolDb('/buffer.db');
        // INSERT OR REPLACE must fire the FTS delete triggers on the replaced row, or the index
        // accumulates stale duplicates.
        db.exec('PRAGMA recursive_triggers = ON');
        db.exec(SCHEMA);
        const backfill = backfillFTS();
        stats.ftsBackfillIndexed = backfill.indexed;
        stats.ftsBackfillMs = Math.round(backfill.tookMs);
        stats.initMs = performance.now() - start;
        isReady = true;
        post({type: 'ready', initMs: stats.initMs});
        for (const message of pendingUntilReady.splice(0)) {
            handleMessage(message);
        }
    } catch (error) {
        post({type: 'initError', message: String(error)});
    }
}

init();
