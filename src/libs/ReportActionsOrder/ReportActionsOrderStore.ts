import Log from '@libs/Log';
import {getDEWRoutedActionFor, getSortedReportActionsForDisplay, replaceBaseURLInPolicyChangeLogAction} from '@libs/ReportActionsUtils';
import {dropReport, ingestAndOrder, isEngineAvailable} from '@libs/SqlEngine/EngineClient';
import {getReportActionsEngineMode} from '@libs/SqlEngine/engineMode';

import type {ReportAction, ReportActions} from '@src/types/onyx';

import noop from 'lodash/noop';

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
    snapshot: ReportActionsOrderSnapshot | undefined;
};

const entries = new Map<string, ReportEntry>();

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
function buildSnapshot(raw: ReportActions, order: ConfirmedOrder): ReportActionsOrderSnapshot {
    const actions: ReportAction[] = [];
    for (const id of order.ids) {
        const parentID = order.syntheticParents.get(id);
        if (parentID === undefined) {
            const reportAction = raw[id];
            if (reportAction) {
                actions.push(replaceBaseURLInPolicyChangeLogAction(reportAction));
            }
            continue;
        }
        const parentAction = raw[parentID];
        const routedAction = parentAction ? getDEWRoutedActionFor(replaceBaseURLInPolicyChangeLogAction(parentAction)) : undefined;
        if (routedAction) {
            actions.push(routedAction);
        }
    }
    return {raw, actions};
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

    const snapshot = buildSnapshot(raw, order);
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
    entry.snapshot = undefined;

    if (isEngineActive()) {
        dropReport(reportID).catch(noop);
    }

    if (hadSnapshot) {
        notify(entry);
    }
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

    const {version} = entry;
    const startedAt = Date.now();
    stats.upsertedRows += diff.upserts.length;
    stats.deletedRows += diff.deletes.length;

    ingestAndOrder({reportID, version, upserts: diff.upserts, deletes: diff.deletes, full: diff.full})
        .then((reply) => {
            const currentEntry = entries.get(reportID);
            if (currentEntry !== entry) {
                return;
            }
            if (reply.version !== entry.version || !entry.raw) {
                stats.staleReplies += 1;
                return;
            }
            stats.roundTrips += 1;
            stats.totalRoundTripMs += Date.now() - startedAt;
            confirm(reportID, entry.raw, {ids: splitOrderedIDs(reply.ids), syntheticParents: parseSyntheticParents(reply.synthetic)});
        })
        .catch((error: unknown) => {
            stats.failures += 1;
            Log.warn('[ReportActionsOrder] ingestAndOrder failed', {reportID, message: error instanceof Error ? error.message : String(error)});
        });
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

    const entry = entries.get(reportID) ?? {version: 0, refCount: 0, subscribers: new Set<() => void>(), raw: undefined, order: undefined, snapshot: undefined};
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

export {getReportActionsOrderSnapshot, getReportActionsOrderStats, resetReportActionsOrderStore, setReportActionsOrderRawActions, subscribeToReportActionsOrder};
export type {ReportActionsOrderSnapshot, ReportActionsOrderStats};
