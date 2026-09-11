import type {LhnPriorityMode} from '@libs/SqlEngine/wasm/protocol';

import ONYXKEYS from '@src/ONYXKEYS';

import type {LhnIndexInputs, LhnOrderSnapshot} from './types';

import {buildLhnIndexRow, buildLhnIndexRows} from './buildLhnIndexRows';
import collectLhnChanges from './collectLhnChanges';
import isSameRow from './isSameRow';
import JsLhnOrderIndex from './JsLhnOrderIndex';

type JsLhnOrderStats = {
    /** How many orders the store produced, which is how many renders got a new list. */
    feedCount: number;
    /** How many times the store looked for changes, including the passes that found none. */
    attemptCount: number;
    /** Main-thread time of every pass so far, so a benchmark can report a per-action average. */
    totalFeedMs: number;
    totalCandidateCount: number;
    totalUpsertCount: number;
    /** Main-thread time of the last pass: the change pass, the rows it rebuilt, the splices and the three copies. */
    lastFeedMs: number;
    /** Rows the last pass rebuilt because one of their inputs changed identity. */
    lastCandidateCount: number;
    /** Of those, the rows that actually came out different and moved in the order. */
    lastUpsertCount: number;
    lastDeleteCount: number;
    /** Rows the index had to fall back to a linear scan to remove. Non-zero means the sorted lists drifted. */
    repairCount: number;
};

const EMPTY_STATS: JsLhnOrderStats = {
    feedCount: 0,
    attemptCount: 0,
    totalFeedMs: 0,
    totalCandidateCount: 0,
    totalUpsertCount: 0,
    lastFeedMs: Number.NaN,
    lastCandidateCount: 0,
    lastUpsertCount: 0,
    lastDeleteCount: 0,
    repairCount: 0,
};

let index = new JsLhnOrderIndex();
let snapshot: LhnOrderSnapshot | undefined;
let previousInputs: LhnIndexInputs | undefined;
let previousPriorityMode: LhnPriorityMode | undefined;
let version = 0;
let stats: JsLhnOrderStats = EMPTY_STATS;

function countPass(feedMs: number, candidateCount: number) {
    stats = {
        ...stats,
        attemptCount: stats.attemptCount + 1,
        totalFeedMs: stats.totalFeedMs + feedMs,
        totalCandidateCount: stats.totalCandidateCount + candidateCount,
        lastFeedMs: feedMs,
        lastCandidateCount: candidateCount,
        lastUpsertCount: 0,
        lastDeleteCount: 0,
        repairCount: index.getRepairCount(),
    };
}

/**
 * The LHN order after one user action, computed in the render that received it. The returned snapshot keeps its
 * identity whenever nothing moved, so the sidebar's downstream memos see a new list only when the order changed.
 *
 * Calling this twice with the same inputs object is a no-op, which is what makes it safe to run inside a memo.
 */
function updateJsLhnOrder(inputs: LhnIndexInputs, priorityMode: LhnPriorityMode): LhnOrderSnapshot | undefined {
    const startedAt = performance.now();
    const changes = collectLhnChanges(previousInputs, inputs);
    const hasPriorityModeChanged = previousPriorityMode !== undefined && previousPriorityMode !== priorityMode;
    if (snapshot && !hasPriorityModeChanged && !changes.full && changes.upsertIDs.length === 0 && changes.deleteIDs.length === 0) {
        countPass(performance.now() - startedAt, 0);
        return snapshot;
    }

    let changedCount = 0;
    if (changes.full) {
        index.reset(buildLhnIndexRows(changes.upsertIDs, inputs), priorityMode);
        changedCount = index.getRowCount();
    } else {
        index.setPriorityMode(priorityMode);
        for (const reportID of changes.upsertIDs) {
            const report = inputs.reportsToDisplay[`${ONYXKEYS.COLLECTION.REPORT}${reportID}`];
            if (!report) {
                continue;
            }
            const row = buildLhnIndexRow(report, inputs);
            if (isSameRow(index.getRow(reportID), row)) {
                continue;
            }
            index.upsert(row);
            changedCount += 1;
        }
        for (const reportID of changes.deleteIDs) {
            index.remove(reportID);
        }
    }

    previousInputs = inputs;
    previousPriorityMode = priorityMode;

    if (snapshot && changedCount === 0 && changes.deleteIDs.length === 0 && !hasPriorityModeChanged) {
        countPass(performance.now() - startedAt, changes.upsertIDs.length);
        return snapshot;
    }

    version += 1;
    snapshot = {...index.getLists(), version};
    const feedMs = performance.now() - startedAt;
    stats = {
        ...stats,
        feedCount: stats.feedCount + 1,
        attemptCount: stats.attemptCount + 1,
        totalFeedMs: stats.totalFeedMs + feedMs,
        totalCandidateCount: stats.totalCandidateCount + changes.upsertIDs.length,
        totalUpsertCount: stats.totalUpsertCount + changedCount,
        lastFeedMs: feedMs,
        lastCandidateCount: changes.upsertIDs.length,
        lastUpsertCount: changedCount,
        lastDeleteCount: changes.deleteIDs.length,
        repairCount: index.getRepairCount(),
    };
    return snapshot;
}

function getJsLhnOrderSnapshot(): LhnOrderSnapshot | undefined {
    return snapshot;
}

function getJsLhnOrderStats(): JsLhnOrderStats {
    return stats;
}

function resetJsLhnOrderStore() {
    index = new JsLhnOrderIndex();
    snapshot = undefined;
    previousInputs = undefined;
    previousPriorityMode = undefined;
    version = 0;
    stats = EMPTY_STATS;
}

export {updateJsLhnOrder, getJsLhnOrderSnapshot, getJsLhnOrderStats, resetJsLhnOrderStore};
export type {JsLhnOrderStats};
