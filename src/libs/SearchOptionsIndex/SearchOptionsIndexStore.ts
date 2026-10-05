import type {Options} from '@libs/OptionsListUtils';
import {Scheduler} from '@libs/Scheduler';
import type {IdleTask} from '@libs/Scheduler';
import {registerSessionCleanupCallback} from '@libs/SessionCleanup';

import type {BuildChunkBudget, OptionIndex} from './OptionIndex';
import type {SearchOptionsFormatConfig, SearchOptionsIndexInputs} from './types';

import createOptionIndex from './OptionIndex';
import searchOptionIndex from './searchOptionIndex';

/**
 * The option index of the signed-in account, the query it is answering and that answer.
 *
 * The index lives here rather than in the screen that reads it because it has to outlive that screen: once built,
 * it stays warm for the next time the SearchRouter is opened, and a keystroke then never rebuilds anything.
 */
let index: OptionIndex | undefined;
let indexVersion = 0;
let cachedQuery: string | undefined;
let cachedFormatConfig: SearchOptionsFormatConfig | undefined;
let cachedVersion = -1;
let cachedOptions: Options | undefined;
let warmupTask: IdleTask | undefined;

const subscribers = new Set<() => void>();

/**
 * What one background chunk of the build may take. Sized by time rather than by item count, so a chunk stays well under
 * a frame on a slow device and a fast one does not pay a scheduler round trip per few hundred cheap contacts.
 */
const BACKGROUND_CHUNK_BUDGET: BuildChunkBudget = {timeBudgetMs: 8};

function notifySubscribers() {
    indexVersion += 1;
    for (const notifySubscriber of subscribers) {
        notifySubscriber();
    }
}

/**
 * Warms the index by one chunk of `budget`, called once per idle window. Creates the index with deferred population if it
 * doesn't exist yet, and otherwise feeds it the current snapshots first, so the index does not finish on the ones it
 * started from. Returns true if the index is fully built, false if more chunks remain.
 */
function warmSearchOptionsIndexChunk(inputs: SearchOptionsIndexInputs, budget: BuildChunkBudget = BACKGROUND_CHUNK_BUDGET): boolean {
    if (!index) {
        index = createOptionIndex(inputs, {deferPopulation: true});
    } else {
        index.update(inputs);
    }
    if (index.isFullyBuilt()) {
        return true;
    }
    if (index.buildChunk(budget)) {
        notifySubscribers();
        return true;
    }
    return false;
}

/** Schedules background chunks during idle time to complete building the index before debounced query lands. */
function startSearchOptionsIndexWarmup() {
    if (!index || index.isFullyBuilt()) {
        return;
    }
    const runNext = () => {
        warmupTask = undefined;
        if (index && !index.buildChunk(BACKGROUND_CHUNK_BUDGET)) {
            warmupTask = Scheduler.scheduleWhenIdle(runNext);
            return;
        }
        notifySubscribers();
    };
    if (!warmupTask) {
        warmupTask = Scheduler.scheduleWhenIdle(runNext);
    }
}

/** Brings the index up to date with the Onyx snapshots. Feeding the snapshots it already holds costs nothing. */
function feedSearchOptionsIndex(inputs: SearchOptionsIndexInputs) {
    if (!index) {
        index = createOptionIndex(inputs, {deferPopulation: true});
        // A render may already have answered `undefined` for a prefilled query.
        notifySubscribers();
        return;
    }
    const {hasChanged} = index.update(inputs);
    // Keep a dirty drain advancing, including one these snapshots just queued: the options warmer's chunk loop stops
    // once it yields to an opening router, leaving the drain with nothing to drive it. A no-op on a fully built index.
    // A first build is left to the router's post-transition warm-up, so its chunks never run during the open animation.
    if (index.canAnswer()) {
        startSearchOptionsIndexWarmup();
    }
    if (hasChanged) {
        notifySubscribers();
    }
}

/**
 * Returns the answer to a search query from the index synchronously.
 * Caches the result by (query, formatConfig, version) to preserve referential stability across renders.
 */
function getSearchOptionsFromIndex(query: string, formatConfig: SearchOptionsFormatConfig, version: number): Options | undefined {
    if (!query.trim() || !index) {
        return undefined;
    }

    if (query === cachedQuery && formatConfig === cachedFormatConfig && version === cachedVersion) {
        return cachedOptions;
    }

    if (!index.canAnswer()) {
        // Never built (or restarting from scratch): there is nothing to answer from yet, so flushing is the only option.
        // A drain in progress after a too-large diff already answers from the rows as they are, so it is not flushed.
        index.flush();
    }

    cachedOptions = searchOptionIndex(index, query, formatConfig);
    cachedQuery = query;
    cachedFormatConfig = formatConfig;
    cachedVersion = version;

    return cachedOptions;
}

function subscribeToSearchOptions(listener: () => void): () => void {
    subscribers.add(listener);
    return () => {
        subscribers.delete(listener);
    };
}

function getSearchOptionsIndexVersion(): number {
    return indexVersion;
}

function clearSearchOptionsIndex() {
    if (warmupTask) {
        warmupTask.cancel();
        warmupTask = undefined;
    }
    index = undefined;
    cachedQuery = undefined;
    cachedFormatConfig = undefined;
    cachedVersion = -1;
    cachedOptions = undefined;
    notifySubscribers();
}

// The rows are derived from the signed-in account's data, so they must not outlive the session.
registerSessionCleanupCallback(clearSearchOptionsIndex);

export {
    clearSearchOptionsIndex,
    feedSearchOptionsIndex,
    getSearchOptionsFromIndex,
    getSearchOptionsIndexVersion,
    startSearchOptionsIndexWarmup,
    subscribeToSearchOptions,
    warmSearchOptionsIndexChunk,
};
