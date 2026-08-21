import Log from '@libs/Log';

import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxCollectionKey} from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';
import OnyxCache, {TASK} from 'react-native-onyx/dist/OnyxCache';
import {registerQueryWatcher} from 'react-native-onyx/dist/OnyxQuery';
import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';

/**
 * Lazy-Onyx POC, scoped-store derived (SOTA step 3): the WRITE-TIME materializer runtime.
 *
 * The classic derived engine subscribes to whole dependency collections, which under lazy Onyx
 * reads every one of them from disk and pins them in RAM for as long as the engine lives. This
 * runtime keeps the same "materialized view maintained incrementally" model but changes how inputs
 * are acquired: it listens to WRITES (cheap per-member notifications), maps each write batch to the
 * affected output entries, and recomputes ONLY those entries from targeted reads (the scoped-store
 * per-entry computes). Nothing ever holds a full collection.
 *
 * Freshness model (why derived data is available before any write):
 * - outputs are persisted, so a boot serves the last session's state straight from disk;
 * - every datum enters the DB through a write, and writes drive this materializer — so outputs only
 *   drift when the compute SCHEMA changes or after Onyx.clear. Both are covered by the version
 *   stamp in DERIVED_SCOPED_META: a mismatch (or its absence, post-clear) triggers a chunked
 *   background sweep that rebuilds every entry.
 */

type ScopedWrite = {
    collectionKey: OnyxCollectionKey;
    key: string;
    value: unknown;
};

type ScopedMaterializerControls = {
    /** Rebuild every entry (chunked, background). For rare whole-view triggers: schema change, locale, session, real display-name renames. */
    requestSweep: (reason: string) => void;
    /** Recompute specific entries — for triggers that can be narrowed without an inverse index. */
    requestEntries: (entryIDs: Iterable<string>) => void;
};

type ScopedMaterializerSpec<TEntry> = {
    /** The derived output key this materializer maintains (used for logging and the version stamp). */
    outputKey: string;
    /** Bump when the compute's semantics change — a mismatch with the persisted stamp triggers a full sweep. */
    version: number;
    /** Collections whose member WRITES drive recomputes. Watched as write streams — never subscribed whole. */
    watchCollections: readonly OnyxCollectionKey[];
    /** Maps a batch of writes to affected entry IDs ('all' escalates to a sweep). May do targeted reads. */
    entryIDsForWrites: (writes: ScopedWrite[]) => Promise<Set<string> | 'all'>;
    /** Every entry ID, for sweeps/backfills — typically from the key index (cheap, always in cache). */
    allEntryIDs: () => Promise<string[]>;
    /** Computes ONE entry from targeted reads; `null` means the entry should be deleted. */
    computeEntry: (entryID: string) => Promise<TEntry | null>;
    /** Persists a batch of computed entries (blob fragment merge + projection members). */
    applyEntries: (entries: Map<string, TEntry | null>) => void;
    /** Registers the spec's singleton listeners (session, locale, ...) that narrow or sweep via the controls. */
    connectTriggers?: (controls: ScopedMaterializerControls) => void;
    /** Seeds/repairs the persisted outputs' shells (e.g. an empty blob) — called at start and again after Onyx.clear. */
    ensureOutputs?: () => void;
};

const COMPUTE_CONCURRENCY = 4;
const SWEEP_CHUNK_SIZE = 100;

function startScopedMaterializer<TEntry>(spec: ScopedMaterializerSpec<TEntry>): void {
    const pendingWrites: ScopedWrite[] = [];
    const pendingEntryIDs = new Set<string>();
    let isSweepRequested = false;
    let isPumpRunning = false;
    let isClearRearmScheduled = false;

    const hasWork = () => pendingWrites.length > 0 || pendingEntryIDs.size > 0 || isSweepRequested;

    async function computeAndApply(entryIDs: string[]): Promise<void> {
        const entries = new Map<string, TEntry | null>();
        let nextIndex = 0;
        const workers = Array.from({length: Math.min(COMPUTE_CONCURRENCY, entryIDs.length)}, async () => {
            while (nextIndex < entryIDs.length) {
                const entryID = entryIDs.at(nextIndex);
                nextIndex++;
                if (entryID === undefined) {
                    break;
                }
                try {
                    // eslint-disable-next-line no-await-in-loop -- the worker pool bounds concurrency; each worker is sequential by design
                    entries.set(entryID, await spec.computeEntry(entryID));
                } catch (error) {
                    // Skip the entry rather than fail the batch — the next write touching it heals it.
                    Log.alert(`[ScopedMaterializer] computeEntry threw for ${spec.outputKey}/${entryID}`, {error});
                }
            }
        });
        await Promise.all(workers);
        if (entries.size > 0) {
            spec.applyEntries(entries);
        }
    }

    async function runSweep(): Promise<void> {
        const allIDs = await spec.allEntryIDs();
        Log.info(`[ScopedMaterializer] sweeping ${allIDs.length} entries of ${spec.outputKey}`);
        for (let chunkStart = 0; chunkStart < allIDs.length; chunkStart += SWEEP_CHUNK_SIZE) {
            // A clear wipes the outputs anyway, and the post-clear version check re-sweeps.
            if (OnyxCache.hasPendingTask(TASK.CLEAR)) {
                return;
            }
            // eslint-disable-next-line no-await-in-loop -- chunks run sequentially on purpose: bounded memory, and the yield below keeps the event loop responsive
            await computeAndApply(allIDs.slice(chunkStart, chunkStart + SWEEP_CHUNK_SIZE));
            // eslint-disable-next-line no-await-in-loop -- see above
            await new Promise<void>((resolve) => {
                setTimeout(resolve, 0);
            });
        }
        Onyx.merge(ONYXKEYS.DERIVED_SCOPED_META, {[spec.outputKey]: {version: spec.version}});
    }

    const schedulePump = () => {
        queueMicrotask(() => {
            pump();
        });
    };

    // Once the clear (and its rehydration) finishes, re-seed the output shells and rebuild via a
    // sweep — the wiped version stamp would otherwise only heal on the NEXT app start.
    function rearmAfterClear(): void {
        if (isClearRearmScheduled) {
            return;
        }
        isClearRearmScheduled = true;
        OnyxCache.getTaskPromise(TASK.CLEAR)?.finally(() => {
            isClearRearmScheduled = false;
            spec.ensureOutputs?.();
            isSweepRequested = true;
            schedulePump();
        });
    }

    // Single serialized pump: write batches map to entry IDs, entries recompute with bounded
    // concurrency, applies happen in order. New work arriving mid-flight is picked up by the loop
    // (or by the re-schedule below if it lands during the final apply).
    async function pump(): Promise<void> {
        if (isPumpRunning) {
            return;
        }
        isPumpRunning = true;
        try {
            while (hasWork()) {
                // During Onyx.clear, drop everything: outputs are being wiped; the rearm rebuilds
                // once the clear finishes.
                if (OnyxCache.hasPendingTask(TASK.CLEAR)) {
                    pendingWrites.length = 0;
                    pendingEntryIDs.clear();
                    isSweepRequested = false;
                    rearmAfterClear();
                    return;
                }
                if (isSweepRequested) {
                    // A sweep supersedes any queued narrower work.
                    isSweepRequested = false;
                    pendingWrites.length = 0;
                    pendingEntryIDs.clear();
                    // eslint-disable-next-line no-await-in-loop -- the pump is a serialized work loop by design
                    await runSweep();
                    continue;
                }
                const writes = pendingWrites.splice(0);
                if (writes.length > 0) {
                    // eslint-disable-next-line no-await-in-loop -- see above
                    const affected = await spec.entryIDsForWrites(writes);
                    if (affected === 'all') {
                        isSweepRequested = true;
                        continue;
                    }
                    for (const entryID of affected) {
                        pendingEntryIDs.add(entryID);
                    }
                }
                if (pendingEntryIDs.size === 0) {
                    continue;
                }
                const batch = [...pendingEntryIDs];
                pendingEntryIDs.clear();
                // eslint-disable-next-line no-await-in-loop -- see above
                await computeAndApply(batch);
            }
        } finally {
            isPumpRunning = false;
        }
        if (hasWork()) {
            queueMicrotask(() => {
                pump();
            });
        }
    }

    spec.ensureOutputs?.();

    for (const collectionKey of spec.watchCollections) {
        registerQueryWatcher(collectionKey, (key, value) => {
            pendingWrites.push({collectionKey, key, value});
            schedulePump();
        });
    }

    spec.connectTriggers?.({
        requestSweep: (reason) => {
            Log.info(`[ScopedMaterializer] sweep requested for ${spec.outputKey}: ${reason}`);
            isSweepRequested = true;
            schedulePump();
        },
        requestEntries: (entryIDs) => {
            for (const entryID of entryIDs) {
                pendingEntryIDs.add(entryID);
            }
            schedulePump();
        },
    });

    // Version check: absent (fresh install, post-clear) or outdated (compute schema changed) stamp
    // means the persisted outputs can't be trusted — rebuild them in the background.
    OnyxUtils.get(ONYXKEYS.DERIVED_SCOPED_META).then((meta) => {
        const storedVersion = meta?.[spec.outputKey]?.version;
        if (storedVersion === spec.version) {
            return;
        }
        Log.info(`[ScopedMaterializer] version ${storedVersion ?? 'none'} != ${spec.version} for ${spec.outputKey} — backfilling`);
        isSweepRequested = true;
        schedulePump();
    });
}

export default startScopedMaterializer;
export type {ScopedMaterializerSpec, ScopedMaterializerControls, ScopedWrite};
