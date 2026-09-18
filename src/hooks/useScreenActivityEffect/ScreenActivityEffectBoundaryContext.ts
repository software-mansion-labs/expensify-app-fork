import type {EffectCallback} from 'react';

import {createContext} from 'react';

/**
 * The live setup of one call site of useScreenActivityEffect, together with what that call site owes. The insertion
 * effect of the hook writes the debt, because React runs an insertion effect for a mount, a change of the dependencies
 * and a removal only, never for a hide, a reveal or the double invocation of StrictMode. The passive effect of the hook
 * and the boundary settle it, because they may set state and read refs where an insertion effect may not.
 */
type ScreenActivityEffectEntry = {
    /** What the last run of the setup returned. */
    cleanup: ReturnType<EffectCallback>;

    /** The setup of the latest render, which is the one a setup that runs late has to run. */
    nextSetup: EffectCallback;

    /** Whether the latest render has no live setup: the component mounted, its dependencies changed, or a release ran. */
    owesSetup: boolean;

    /** Whether the component was removed or its dependencies changed since the cleanup last ran. */
    owesRelease: boolean;

    /** Whether React still holds the passive cleanup of the call site, which a hide takes away until the next body. */
    isConnected: boolean;
};

function createScreenActivityEffectEntry(setup: EffectCallback): ScreenActivityEffectEntry {
    return {cleanup: undefined, nextSetup: setup, owesSetup: false, owesRelease: false, isConnected: false};
}

// The entry is the mutable record of its call site, and these two are the only writers of its setup and its debt.
/* eslint-disable no-param-reassign */
/**
 * Runs the live cleanup and forgets it. A released entry owes a setup, so a call site whose body does run after all
 * sets up again.
 */
function releaseScreenActivityEffectEntry(entry: ScreenActivityEffectEntry): void {
    const {cleanup} = entry;
    entry.cleanup = undefined;
    entry.owesRelease = false;
    entry.owesSetup = true;
    cleanup?.();
}

/** Runs the latest setup and keeps what it returned. */
function setUpScreenActivityEffectEntry(entry: ScreenActivityEffectEntry): void {
    entry.owesSetup = false;
    entry.cleanup = entry.nextSetup();
}
/* eslint-enable no-param-reassign */

/**
 * What an effect body does with the errors it collected: it reports every one and rethrows none. A body that threw
 * would leave React without the cleanup it returns, so the setup it just ran would outlive the removal of its
 * component, and the errors of a body come from the cleanups of other components anyway.
 */
function reportErrors(errors: readonly unknown[]): void {
    for (const error of errors) {
        console.error(error);
    }
}

/**
 * What a batch of the boundary does with the errors it collected. React reports every error a teardown hits and still
 * runs the rest of the work, so the first error is rethrown where React would have put it and the others are reported
 * directly, rather than being swallowed by the one that came first.
 */
function throwFirstAndReportRest(errors: readonly unknown[]): void {
    reportErrors(errors.slice(1));
    if (errors.length > 0) {
        throw errors.at(0);
    }
}

type ScreenActivityEffectBoundary = {
    /**
     * The insertion cleanup of the entry ran, so the entry owes a release. Its own passive cleanup pays it when React
     * still holds that cleanup. A component removed while hidden has none, so the boundary pays for it instead.
     */
    owe: (entry: ScreenActivityEffectEntry) => void;

    /**
     * Releases every owed entry whose passive cleanup is not coming, after asking the boundary above to do the same, so
     * the entry a boundary above holds for a nested screen that went away releases before anything below sets up.
     */
    releaseOwed: () => void;

    /** Whether this commit covers or reveals this boundary or one above it. */
    getIsInModeChangeCommit: () => boolean;

    /**
     * Takes over the release and the setup an entry owes when the commit changes the mode of this boundary or of one
     * above it, so the drain of the highest boundary changing runs every release of the subtree before any setup,
     * exactly as the phases of one commit run on a live screen. Outside such a commit it takes nothing and answers
     * false, and the call site runs its work inline.
     */
    takeOverWork: (entry: ScreenActivityEffectEntry) => boolean;
};

// Null means no boundary above this subtree, which is every screen that did not opt into <Activity>.
const ScreenActivityEffectBoundaryContext = createContext<ScreenActivityEffectBoundary | null>(null);

export default ScreenActivityEffectBoundaryContext;
export {createScreenActivityEffectEntry, releaseScreenActivityEffectEntry, reportErrors, setUpScreenActivityEffectEntry, throwFirstAndReportRest};
export type {ScreenActivityEffectBoundary, ScreenActivityEffectEntry};
