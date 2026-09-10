import Log from '@libs/Log';
import {isEngineAvailable, orderLhn} from '@libs/SqlEngine/EngineClient';
import type {LhnIndexRow, LhnPriorityMode} from '@libs/SqlEngine/wasm/protocol';

import ONYXKEYS from '@src/ONYXKEYS';

import type {LhnIndexInputs, LhnOrderSnapshot} from './types';

import {buildLhnIndexRow} from './buildLhnIndexRows';
import collectLhnChanges from './collectLhnChanges';

type LhnOrderIndexStats = {
    /** How many versions have been sent to the engine. */
    feedCount: number;
    /** How many times the store looked for changes, including the passes that found none. */
    attemptCount: number;
    /** Main-thread time of every pass so far, so a benchmark can report a per-action average. */
    totalFeedMs: number;
    totalCandidateCount: number;
    totalUpsertCount: number;
    /** Main-thread time of the last feed: the change pass plus building the rows it found. */
    lastFeedMs: number;
    /** Rows the last feed rebuilt because one of their inputs changed identity. */
    lastCandidateCount: number;
    /** Of those, the rows that actually came out different and crossed the boundary. */
    lastUpsertCount: number;
    lastDeleteCount: number;
    /** The engine's own timers for the last order that came back. */
    lastIngestMs: number;
    lastQueryMs: number;
    /** Replies that arrived for a version that was no longer the newest. */
    staleReplyCount: number;
    /** Orders the guard compared with today's JS order and found different. */
    mismatchCount: number;
    failureCount: number;
};

const listeners = new Set<() => void>();

let snapshot: LhnOrderSnapshot | undefined;
let previousInputs: LhnIndexInputs | undefined;
let previousPriorityMode: LhnPriorityMode | undefined;
let version = 0;
const sentRows = new Map<string, LhnIndexRow>();

const EMPTY_STATS: LhnOrderIndexStats = {
    feedCount: 0,
    attemptCount: 0,
    totalFeedMs: 0,
    totalCandidateCount: 0,
    totalUpsertCount: 0,
    lastFeedMs: Number.NaN,
    lastCandidateCount: 0,
    lastUpsertCount: 0,
    lastDeleteCount: 0,
    lastIngestMs: Number.NaN,
    lastQueryMs: Number.NaN,
    staleReplyCount: 0,
    mismatchCount: 0,
    failureCount: 0,
};

let stats: LhnOrderIndexStats = EMPTY_STATS;

function isSameRow(first: LhnIndexRow | undefined, second: LhnIndexRow): boolean {
    return (
        !!first &&
        first.bucket === second.bucket &&
        first.sortKey === second.sortKey &&
        first.lastVisibleActionCreated === second.lastVisibleActionCreated &&
        first.isUnread === second.isUnread &&
        first.isTodo === second.isTodo
    );
}

/**
 * The rows that really changed, out of the reports whose inputs changed identity. The two counts differ a lot:
 * `updateReportsToDisplayInLHN` gives a new entry to every report carrying a flag (unread, attention, errors) on
 * every recheck, so a single incoming message hands this function about a third of the account, of which one row
 * is genuinely different. Comparing the rows keeps the boundary payload at the size of the real change.
 */
function collectChangedRows(candidateIDs: readonly string[], inputs: LhnIndexInputs): LhnIndexRow[] {
    const upserts: LhnIndexRow[] = [];
    for (const reportID of candidateIDs) {
        const report = inputs.reportsToDisplay[`${ONYXKEYS.COLLECTION.REPORT}${reportID}`];
        if (!report) {
            continue;
        }
        const row = buildLhnIndexRow(report, inputs);
        if (isSameRow(sentRows.get(reportID), row)) {
            continue;
        }
        sentRows.set(reportID, row);
        upserts.push(row);
    }
    return upserts;
}

function notify() {
    for (const listener of listeners) {
        listener();
    }
}

function subscribeToLhnOrder(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function getLhnOrderSnapshot(): LhnOrderSnapshot | undefined {
    return snapshot;
}

/** The version the newest request was sent for. An order older than this is stale, which is what the guard checks. */
function getLhnOrderVersion(): number {
    return version;
}

/**
 * Sends one user action to the engine: the rows it changed and, in the same message, the order that comes out.
 * Only the newest reply is kept, so a burst of writes while a round trip is in flight collapses into one order.
 */
function feedLhnOrderIndex(inputs: LhnIndexInputs, priorityMode: LhnPriorityMode) {
    if (!isEngineAvailable()) {
        return;
    }

    const startedAt = performance.now();
    const changes = collectLhnChanges(previousInputs, inputs);
    const hasPriorityModeChanged = previousPriorityMode !== undefined && previousPriorityMode !== priorityMode;
    const hasRowChanges = changes.full || changes.upsertIDs.length > 0 || changes.deleteIDs.length > 0;
    if (!hasRowChanges && !hasPriorityModeChanged && snapshot) {
        return;
    }

    if (changes.full) {
        sentRows.clear();
    }
    const upserts = collectChangedRows(changes.upsertIDs, inputs);
    for (const reportID of changes.deleteIDs) {
        sentRows.delete(reportID);
    }
    previousInputs = inputs;
    previousPriorityMode = priorityMode;
    const feedMs = performance.now() - startedAt;
    if (upserts.length === 0 && changes.deleteIDs.length === 0 && !hasPriorityModeChanged && snapshot) {
        stats = {
            ...stats,
            attemptCount: stats.attemptCount + 1,
            totalFeedMs: stats.totalFeedMs + feedMs,
            totalCandidateCount: stats.totalCandidateCount + changes.upsertIDs.length,
            lastFeedMs: feedMs,
            lastCandidateCount: changes.upsertIDs.length,
            lastUpsertCount: 0,
            lastDeleteCount: 0,
        };
        return;
    }

    version += 1;
    const requestVersion = version;

    stats = {
        ...stats,
        feedCount: stats.feedCount + 1,
        attemptCount: stats.attemptCount + 1,
        totalFeedMs: stats.totalFeedMs + feedMs,
        totalCandidateCount: stats.totalCandidateCount + changes.upsertIDs.length,
        totalUpsertCount: stats.totalUpsertCount + upserts.length,
        lastFeedMs: feedMs,
        lastCandidateCount: changes.upsertIDs.length,
        lastUpsertCount: upserts.length,
        lastDeleteCount: changes.deleteIDs.length,
    };

    orderLhn({version: requestVersion, upserts, deletes: changes.deleteIDs, full: changes.full, priorityMode})
        .then((reply) => {
            if (reply.version !== version) {
                stats = {...stats, staleReplyCount: stats.staleReplyCount + 1};
                return;
            }
            snapshot = {reportIDs: reply.reportIDs, unreadReportIDs: reply.unreadReportIDs, todoReportIDs: reply.todoReportIDs, version: reply.version};
            stats = {...stats, lastIngestMs: reply.ingestMs, lastQueryMs: reply.queryMs};
            notify();
        })
        .catch((error: unknown) => {
            stats = {...stats, failureCount: stats.failureCount + 1};
            Log.warn(`[LhnOrderIndex] the engine failed to order the LHN: ${error instanceof Error ? error.message : 'unknown error'}`);
        });
}

/** The guard: today's order against the engine's, counted and logged when they differ. The caller has the locale. */
function compareLhnOrder(expected: readonly string[], received: readonly string[]) {
    if (expected.length === received.length && expected.every((reportID, index) => reportID === received.at(index))) {
        return;
    }
    stats = {...stats, mismatchCount: stats.mismatchCount + 1};
    const firstDifference = received.findIndex((reportID, index) => reportID !== expected.at(index));
    Log.warn(`[LhnOrderIndex] the engine order differs from the JS order at position ${firstDifference} (${expected.length} vs ${received.length} reports)`);
}

function getLhnOrderIndexStats(): LhnOrderIndexStats {
    return stats;
}

function resetLhnOrderIndexStore() {
    sentRows.clear();
    snapshot = undefined;
    previousInputs = undefined;
    previousPriorityMode = undefined;
    version = 0;
    listeners.clear();
    stats = EMPTY_STATS;
}

export {feedLhnOrderIndex, subscribeToLhnOrder, getLhnOrderSnapshot, getLhnOrderVersion, getLhnOrderIndexStats, compareLhnOrder, resetLhnOrderIndexStore};
export type {LhnOrderIndexStats};
