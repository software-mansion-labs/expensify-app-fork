import type {IngestOptionsParams, SearchOptionsParams} from '@libs/SqlEngine/EngineClient';
import type {EngineStats, OptionIndexRow, OptionsFoundReply, OptionsIngestedReply} from '@libs/SqlEngine/wasm/protocol';

/**
 * In-memory stand-in for `@libs/SqlEngine/EngineClient`. It keeps the same option index as the worker does and
 * answers a search with the same window, so a test can prove the SearchRouter path without a wasm build.
 * Wire it with `jest.mock('@libs/SqlEngine/EngineClient', () => require('<path>/mockSqlEngineClient'))`.
 */

/** The option index, keyed like the worker's unique (kind, id) pair. */
const optionRows = new Map<string, OptionIndexRow>();
let searchCount = 0;
let pendingReplies: Array<() => void> = [];
let isAvailable = true;
let isDeferred = false;
let requestCount = 0;

function isEngineAvailable(): boolean {
    return isAvailable;
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

function compareIDs(first: string, second: string): number {
    if (first === second) {
        return 0;
    }
    return first < second ? -1 : 1;
}

/** Mirror of the worker's window query: hidden and invalid rows out, every term a substring, ordered by the row key then the id, cut at the limit and counted one past it. */
function selectWindow(kind: OptionIndexRow['kind'], terms: string[], limit: number): {ids: string[]; matched: number} {
    const matches: OptionIndexRow[] = [];
    for (const row of optionRows.values()) {
        if (row.kind !== kind || row.isHidden || !row.isValid || !terms.every((term) => row.searchText.includes(term))) {
            continue;
        }
        matches.push(row);
    }
    matches.sort((first, second) => {
        const ascending = first.orderKey === second.orderKey ? compareIDs(first.id, second.id) : compareIDs(first.orderKey, second.orderKey);
        return kind === 'report' ? -ascending : ascending;
    });
    return {ids: matches.slice(0, limit).map((row) => row.id), matched: Math.min(matches.length, limit + 1)};
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
        matchedReports: reports.matched,
        matchedContacts: contacts.matched,
        queryMs: 0,
    };
    if (!isDeferred) {
        return Promise.resolve(reply);
    }
    return new Promise((resolve) => {
        pendingReplies.push(() => resolve(reply));
    });
}

function getEngineStats(): Promise<EngineStats> {
    return Promise.resolve({
        sqliteVersion: 'mock',
        vfs: 'memory',
        optionRowCount: optionRows.size,
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

function getMockEngineSearchCount(): number {
    return searchCount;
}

function getMockEngineOptionRowCount(): number {
    return optionRows.size;
}

function resetMockEngine() {
    optionRows.clear();
    searchCount = 0;
    pendingReplies = [];
    isAvailable = true;
    isDeferred = false;
    requestCount = 0;
}

export {
    flushMockEngineReplies,
    getEngineStats,
    getMockEngineOptionRowCount,
    getMockEngineRequestCount,
    getMockEngineSearchCount,
    ingestOptions,
    isEngineAvailable,
    searchOptions,
    resetMockEngine,
    setMockEngineAvailable,
    setMockEngineDeferred,
};
