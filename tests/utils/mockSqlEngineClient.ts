import type {IngestAndOrderParams, IngestOptionsParams, SearchOptionsParams} from '@libs/SqlEngine/EngineClient';
import type {EngineStats, OptionIndexRow, OptionsFoundReply, OptionsIngestedReply, OptionsMatcher, OrderReply, SortRow} from '@libs/SqlEngine/wasm/protocol';

import CONST from '@src/CONST';

/**
 * In-memory stand-in for `@libs/SqlEngine/EngineClient`. It keeps the same sort-row table per report as the
 * worker does and orders it with the descending comparator of `getSortedReportActions`, so a test can prove the
 * hook path without a wasm build. Wire it with `jest.mock('@libs/SqlEngine/EngineClient', () => require('<path>/mockSqlEngineClient'))`.
 */
type OrderOverride = (reportID: string, ids: string[]) => string[];

const tables = new Map<string, Map<string, SortRow>>();
/** The option index, keyed like the worker's unique (kind, id) pair. */
const optionRows = new Map<string, OptionIndexRow>();
let optionsMatcher: OptionsMatcher = 'like';
let searchCount = 0;
let pendingReplies: Array<() => void> = [];
let isAvailable = true;
let isDeferred = false;
let orderOverride: OrderOverride | undefined;
let requestCount = 0;
let dropCount = 0;

const CREATED = CONST.REPORT.ACTIONS.TYPE.CREATED;
const REPORT_PREVIEW = CONST.REPORT.ACTIONS.TYPE.REPORT_PREVIEW;
const DESCENDING = -1;

/** Mirror of the `getSortedReportActions` comparator in descending mode, over sort rows. */
function compareRows(first: SortRow, second: SortRow): number {
    if ((first.actionName === CREATED || second.actionName === CREATED) && first.actionName !== second.actionName) {
        return (first.actionName === CREATED ? -1 : 1) * DESCENDING;
    }
    if (first.created === undefined || second.created === undefined) {
        return (first.created === undefined ? -1 : 1) * DESCENDING;
    }
    if (first.created !== second.created) {
        return (first.created < second.created ? -1 : 1) * DESCENDING;
    }
    if ((first.actionName === REPORT_PREVIEW || second.actionName === REPORT_PREVIEW) && first.actionName !== second.actionName) {
        return (first.actionName === REPORT_PREVIEW ? 1 : -1) * DESCENDING;
    }
    return (first.id < second.id ? -1 : 1) * DESCENDING;
}

function isEngineAvailable(): boolean {
    return isAvailable;
}

function ingestAndOrder({reportID, version, upserts, deletes, full}: IngestAndOrderParams): Promise<OrderReply> {
    requestCount += 1;

    const table = full ? new Map<string, SortRow>() : (tables.get(reportID) ?? new Map<string, SortRow>());
    for (const id of deletes) {
        table.delete(id);
    }
    for (const row of upserts) {
        table.set(row.id, row);
    }
    tables.set(reportID, table);

    const orderedIDs = Array.from(table.values())
        .sort(compareRows)
        .map((row) => row.id);
    const ids = orderOverride ? orderOverride(reportID, orderedIDs) : orderedIDs;
    const reply: OrderReply = {type: 'order', requestID: requestCount, reportID, version, ids, timings: {ingestMs: 0, orderMs: 0}};

    if (!isDeferred) {
        return Promise.resolve(reply);
    }

    return new Promise((resolve) => {
        pendingReplies.push(() => resolve(reply));
    });
}

function toOptionKey(kind: string, id: string): string {
    return `${kind}:${id}`;
}

function ingestOptions({version, upserts, deletes, full}: IngestOptionsParams): Promise<OptionsIngestedReply> {
    requestCount += 1;
    if (full) {
        optionRows.clear();
    }
    for (const ref of deletes) {
        optionRows.delete(toOptionKey(ref.kind, ref.id));
    }
    for (const row of upserts) {
        optionRows.set(toOptionKey(row.kind, row.id), row);
    }
    const reply: OptionsIngestedReply = {type: 'options-ingested', requestID: requestCount, version, ingestMs: 0};
    if (!isDeferred) {
        return Promise.resolve(reply);
    }
    return new Promise((resolve) => {
        pendingReplies.push(() => resolve(reply));
    });
}

/** Mirror of the worker's window query: hidden rows out, every term a substring, ordered by the row key, cut at the limit. */
function selectWindow(kind: OptionIndexRow['kind'], terms: string[], limit: number): {ids: string[]; hasMore: boolean} {
    const matches: OptionIndexRow[] = [];
    for (const row of optionRows.values()) {
        if (row.kind !== kind || row.isHidden || !terms.every((term) => row.searchText.includes(term))) {
            continue;
        }
        matches.push(row);
    }
    matches.sort((first, second) => {
        if (first.orderKey === second.orderKey) {
            return 0;
        }
        const ascending = first.orderKey < second.orderKey ? -1 : 1;
        return kind === 'report' ? -ascending : ascending;
    });
    return {ids: matches.slice(0, limit).map((row) => row.id), hasMore: matches.length > limit};
}

function searchOptions({version, terms, reportLimit, contactLimit}: SearchOptionsParams): Promise<OptionsFoundReply> {
    requestCount += 1;
    searchCount += 1;
    const reports = selectWindow('report', terms, reportLimit);
    const contacts = selectWindow('contact', terms, contactLimit);
    const reply: OptionsFoundReply = {
        type: 'options-found',
        requestID: requestCount,
        version,
        reportIDs: reports.ids,
        contactIDs: contacts.ids,
        hasMoreReports: reports.hasMore,
        hasMoreContacts: contacts.hasMore,
        queryMs: 0,
    };
    if (!isDeferred) {
        return Promise.resolve(reply);
    }
    return new Promise((resolve) => {
        pendingReplies.push(() => resolve(reply));
    });
}

function setEngineOptionsMatcher(matcher: OptionsMatcher) {
    optionsMatcher = matcher;
}

function getEngineOptionsMatcher(): OptionsMatcher {
    return optionsMatcher;
}

function dropReport(reportID: string): Promise<void> {
    dropCount += 1;
    tables.delete(reportID);
    return Promise.resolve();
}

function getEngineStats(): Promise<EngineStats> {
    let rowCount = 0;
    for (const table of tables.values()) {
        rowCount += table.size;
    }
    return Promise.resolve({
        sqliteVersion: 'mock',
        vfs: 'memory',
        optionsMatcher,
        reportCount: tables.size,
        rowCount,
        optionRowCount: optionRows.size,
        requestCount,
        totalIngestMs: 0,
        totalOrderMs: 0,
        optionIngestCount: 0,
        totalOptionIngestMs: 0,
        searchCount,
        totalSearchMs: 0,
    });
}

function setMockEngineAvailable(value: boolean) {
    isAvailable = value;
}

/** When deferred, replies wait for `flushMockEngineReplies` so a test can post a newer version first. */
function setMockEngineDeferred(value: boolean) {
    isDeferred = value;
}

function setMockEngineOrderOverride(override: OrderOverride | undefined) {
    orderOverride = override;
}

function flushMockEngineReplies() {
    const replies = pendingReplies;
    pendingReplies = [];
    for (const resolve of replies) {
        resolve();
    }
}

function getMockEngineRequestCount(): number {
    return requestCount;
}

function getMockEngineDropCount(): number {
    return dropCount;
}

function getMockEngineSearchCount(): number {
    return searchCount;
}

function getMockEngineOptionRowCount(): number {
    return optionRows.size;
}

function resetMockEngine() {
    tables.clear();
    optionRows.clear();
    searchCount = 0;
    optionsMatcher = 'like';
    pendingReplies = [];
    isAvailable = true;
    isDeferred = false;
    orderOverride = undefined;
    requestCount = 0;
    dropCount = 0;
}

export {
    dropReport,
    flushMockEngineReplies,
    getEngineOptionsMatcher,
    getEngineStats,
    getMockEngineDropCount,
    getMockEngineOptionRowCount,
    getMockEngineRequestCount,
    getMockEngineSearchCount,
    ingestAndOrder,
    ingestOptions,
    isEngineAvailable,
    searchOptions,
    setEngineOptionsMatcher,
    resetMockEngine,
    setMockEngineAvailable,
    setMockEngineDeferred,
    setMockEngineOrderOverride,
};
