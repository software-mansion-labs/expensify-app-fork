import Log from '@libs/Log';
import {getDEWRoutedActionFor, getSortedReportActionsForDisplay, replaceBaseURLInPolicyChangeLogAction} from '@libs/ReportActionsUtils';
import {dropReport, ingestAndOrder, isEngineAvailable} from '@libs/SqlEngine/EngineClient';
import {getReportActionsEngineMode} from '@libs/SqlEngine/engineMode';

import type {ReportAction, ReportActions} from '@src/types/onyx';

import noop from 'lodash/noop';

import type {ReportActionsDiff} from './diffReportActions';

import diffReportActions, {isDiffEmpty} from './diffReportActions';
import parseSyntheticParents from './parseSyntheticParents';
import splitOrderedIDs from './splitOrderedIDs';

/**
 * A confirmed order for one report. `raw` is the exact Onyx value `actions` was built from, so a consumer can
 * tell in render whether the confirmed order still describes the value it is holding.
 */
type ReportActionsOrderSnapshot = {
    raw: ReportActions;
    actions: ReportAction[];
    /** The position of every action in `actions`, built with the order so all consumers share one map. */
    idToIndex: Map<string, number>;
    /** The `lastReadTime` `anchorID` was resolved against, undefined while no consumer asked for an anchor. */
    anchorTime: string | undefined;
    /** The oldest action newer than `anchorTime`, empty when nothing is unread or nothing was asked for. */
    anchorID: string;
};

type ReportActionsOrderStats = {
    /** Orders confirmed by the worker. */
    roundTrips: number;
    /** Orders confirmed without a worker message because no sort key moved. */
    localConfirms: number;
    /** Replies discarded because a newer version had already been posted. */
    staleReplies: number;
    failures: number;
    /** Confirmed orders that disagreed with the JS order (counted in `strict` mode only). */
    mismatches: number;
    upsertedRows: number;
    deletedRows: number;
    totalRoundTripMs: number;
};

/** The order of one report as the worker confirmed it, kept so a local confirm can rebuild the snapshot. */
type ConfirmedOrder = {
    ids: string[];
    syntheticParents: Map<string, string>;
};

type ReportEntry = {
    version: number;
    refCount: number;
    subscribers: Set<() => void>;
    raw: ReportActions | undefined;
    order: ConfirmedOrder | undefined;
    /** The `lastReadTime` the worker resolves this report's unread anchor against. */
    anchorTime: string | undefined;
    anchorID: string;
    snapshot: ReportActionsOrderSnapshot | undefined;
};

const entries = new Map<string, ReportEntry>();

/** The diff of a request that only reads, sent when an anchor input changed but no report action did. */
const EMPTY_REQUEST_DIFF: ReportActionsDiff = {upserts: [], deletes: [], full: false};

const stats: ReportActionsOrderStats = {
    roundTrips: 0,
    localConfirms: 0,
    staleReplies: 0,
    failures: 0,
    mismatches: 0,
    upsertedRows: 0,
    deletedRows: 0,
    totalRoundTripMs: 0,
};

function isEngineActive(): boolean {
    return getReportActionsEngineMode() !== 'off' && isEngineAvailable();
}

function notify(entry: ReportEntry) {
    for (const subscriber of entry.subscribers) {
        subscriber();
    }
}

/**
 * Maps a confirmed order to report actions in one pass. A synthetic id is rebuilt from the action the worker
 * paired it with, so the whole order, routed actions included, comes from SQL and nothing is re-sorted here.
 */
function buildSnapshot(raw: ReportActions, order: ConfirmedOrder, anchorTime: string | undefined, anchorID: string): ReportActionsOrderSnapshot {
    const actions: ReportAction[] = [];
    const idToIndex = new Map<string, number>();
    for (const id of order.ids) {
        const parentID = order.syntheticParents.get(id);
        if (parentID === undefined) {
            const reportAction = raw[id];
            if (reportAction) {
                idToIndex.set(id, actions.length);
                actions.push(replaceBaseURLInPolicyChangeLogAction(reportAction));
            }
            continue;
        }
        const parentAction = raw[parentID];
        const routedAction = parentAction ? getDEWRoutedActionFor(replaceBaseURLInPolicyChangeLogAction(parentAction)) : undefined;
        if (routedAction) {
            idToIndex.set(id, actions.length);
            actions.push(routedAction);
        }
    }
    return {raw, actions, idToIndex, anchorTime, anchorID};
}

function countMismatch(reportID: string, snapshot: ReportActionsOrderSnapshot) {
    const jsOrder = getSortedReportActionsForDisplay(snapshot.raw, undefined, true, undefined, reportID);
    const engineIDs = snapshot.actions.map((reportAction) => reportAction.reportActionID);
    const jsIDs = jsOrder.map((reportAction) => reportAction.reportActionID);

    if (engineIDs.length === jsIDs.length && engineIDs.every((id, index) => id === jsIDs.at(index))) {
        return;
    }

    stats.mismatches += 1;
    Log.warn('[ReportActionsOrder] SQL order differs from the JS order', {reportID, engineCount: engineIDs.length, jsCount: jsIDs.length});
}

function confirm(reportID: string, raw: ReportActions, order: ConfirmedOrder) {
    const entry = entries.get(reportID);
    if (!entry) {
        return;
    }

    const snapshot = buildSnapshot(raw, order, entry.anchorTime, entry.anchorID);
    entry.order = order;
    entry.snapshot = snapshot;

    if (getReportActionsEngineMode() === 'strict') {
        countMismatch(reportID, snapshot);
    }

    notify(entry);
}

function forgetReport(reportID: string) {
    const entry = entries.get(reportID);
    if (!entry) {
        return;
    }

    const hadSnapshot = !!entry.snapshot;
    entry.raw = undefined;
    entry.order = undefined;
    entry.anchorID = '';
    entry.snapshot = undefined;

    if (isEngineActive()) {
        dropReport(reportID).catch(noop);
    }

    if (hadSnapshot) {
        notify(entry);
    }
}

/** Sends one diff to the worker. An empty diff is legal: the worker skips the ingest and only reads. */
function requestOrder(reportID: string, entry: ReportEntry, diff: ReportActionsDiff) {
    const {version, anchorTime} = entry;
    const startedAt = Date.now();
    stats.upsertedRows += diff.upserts.length;
    stats.deletedRows += diff.deletes.length;

    ingestAndOrder({reportID, version, upserts: diff.upserts, deletes: diff.deletes, full: diff.full, lastReadTime: anchorTime})
        .then((reply) => {
            const currentEntry = entries.get(reportID);
            if (currentEntry !== entry) {
                return;
            }
            const currentRaw = currentEntry.raw;
            if (reply.version !== currentEntry.version || !currentRaw) {
                stats.staleReplies += 1;
                return;
            }
            stats.roundTrips += 1;
            stats.totalRoundTripMs += Date.now() - startedAt;
            currentEntry.anchorID = reply.unreadAnchorID;
            const ids = splitOrderedIDs(reply.ids);
            // The worker counts the order it joined, so a shorter split means the joined value lost ids on the way.
            if (ids.length !== reply.total) {
                Log.warn('[ReportActionsOrder] the joined order does not hold every ordered id', {reportID, idCount: ids.length, total: reply.total});
            }
            confirm(reportID, currentRaw, {ids, syntheticParents: parseSyntheticParents(reply.synthetic)});
        })
        .catch((error: unknown) => {
            stats.failures += 1;
            Log.warn('[ReportActionsOrder] ingestAndOrder failed', {reportID, message: error instanceof Error ? error.message : String(error)});
        });
}

/** Feeds a new raw Onyx value into the store. Safe to call with the value the store already holds. */
function setReportActionsOrderRawActions(reportID: string, raw: ReportActions | undefined) {
    const entry = entries.get(reportID);

    if (!entry || !isEngineActive() || raw === entry.raw) {
        return;
    }

    entry.version += 1;

    if (!raw) {
        forgetReport(reportID);
        return;
    }

    const diff = diffReportActions(entry.raw, raw);
    entry.raw = raw;

    if (isDiffEmpty(diff) && entry.order) {
        stats.localConfirms += 1;
        confirm(reportID, raw, entry.order);
        return;
    }

    requestOrder(reportID, entry, diff);
}

/**
 * Names the `lastReadTime` the worker resolves this report's unread anchor against. One report has one anchor
 * time, so a consumer holding a different snapshot of it keeps computing its own anchor from the ordered array.
 */
function setReportActionsOrderAnchorTime(reportID: string, anchorTime: string | undefined) {
    const entry = entries.get(reportID);

    if (!entry || !isEngineActive() || anchorTime === undefined || anchorTime === entry.anchorTime) {
        return;
    }

    entry.anchorTime = anchorTime;
    entry.anchorID = '';
    entry.version += 1;

    if (entry.raw) {
        requestOrder(reportID, entry, EMPTY_REQUEST_DIFF);
    }
}

function releaseReport(reportID: string) {
    const entry = entries.get(reportID);
    if (!entry) {
        return;
    }

    entry.refCount -= 1;
    if (entry.refCount > 0) {
        return;
    }

    // React re-subscribes by running the cleanup and the new subscribe in the same tick, so only drop the
    // report once that tick is over and nobody has taken it over.
    Promise.resolve()
        .then(() => {
            const currentEntry = entries.get(reportID);
            if (currentEntry !== entry || entry.refCount > 0) {
                return;
            }
            entries.delete(reportID);
            if (isEngineActive()) {
                dropReport(reportID).catch(noop);
            }
        })
        .catch(noop);
}

function subscribeToReportActionsOrder(reportID: string | undefined, listener: () => void): () => void {
    if (!reportID) {
        return noop;
    }

    const entry = entries.get(reportID) ?? {
        version: 0,
        refCount: 0,
        subscribers: new Set<() => void>(),
        raw: undefined,
        order: undefined,
        anchorTime: undefined,
        anchorID: '',
        snapshot: undefined,
    };
    entries.set(reportID, entry);
    entry.refCount += 1;
    entry.subscribers.add(listener);

    return () => {
        entry.subscribers.delete(listener);
        releaseReport(reportID);
    };
}

function getReportActionsOrderSnapshot(reportID: string | undefined): ReportActionsOrderSnapshot | undefined {
    if (!reportID) {
        return undefined;
    }
    return entries.get(reportID)?.snapshot;
}

function getReportActionsOrderStats(): ReportActionsOrderStats {
    return {...stats};
}

/** Test-only. Clears every report and every counter. */
function resetReportActionsOrderStore() {
    entries.clear();
    stats.roundTrips = 0;
    stats.localConfirms = 0;
    stats.staleReplies = 0;
    stats.failures = 0;
    stats.mismatches = 0;
    stats.upsertedRows = 0;
    stats.deletedRows = 0;
    stats.totalRoundTripMs = 0;
}

export {
    getReportActionsOrderSnapshot,
    getReportActionsOrderStats,
    resetReportActionsOrderStore,
    setReportActionsOrderAnchorTime,
    setReportActionsOrderRawActions,
    subscribeToReportActionsOrder,
};
export type {ReportActionsOrderSnapshot, ReportActionsOrderStats};
