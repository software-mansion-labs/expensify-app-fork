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

    /**
     * Runs the live cleanup and forgets it, so the call site and the boundary can both ask for the release. A released
     * entry owes a setup, so a component the boundary swept as removed sets up again if its body does run after all.
     */
    release: () => void;

    /** Runs the latest setup and keeps what it returned. */
    setUp: () => void;
};

function createScreenActivityEffectEntry(setup: EffectCallback): ScreenActivityEffectEntry {
    const entry: ScreenActivityEffectEntry = {
        cleanup: undefined,
        nextSetup: setup,
        owesSetup: false,
        owesRelease: false,
        release: () => {
            const {cleanup} = entry;
            entry.cleanup = undefined;
            entry.owesRelease = false;
            entry.owesSetup = true;
            cleanup?.();
        },
        setUp: () => {
            entry.owesSetup = false;
            entry.cleanup = entry.nextSetup();
        },
    };
    return entry;
}

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
     * A body ran for the entry, so the entry is connected again and whatever its skipped cleanup was waiting for is
     * answered. Outside a reveal commit, the entries that were disconnected and did not come back release first, because
     * a body running is the evidence that the screen is live and they belong to components that are gone.
     */
    connect: (entry: ScreenActivityEffectEntry) => void;

    /**
     * A cleanup ran for the entry with nothing owed, which is a hide, a Suspense fallback or the double invocation of
     * StrictMode. The entry keeps its setup and the boundary keeps the entry, until a body connects it again or a reveal
     * or a pop sweeps it.
     */
    disconnect: (entry: ScreenActivityEffectEntry) => void;

    /**
     * Takes over the release and the setup an entry owes when the commit changes the mode of this boundary or of one
     * above it, so the drain of the highest boundary changing runs every release of the subtree before any setup,
     * exactly as the phases of one commit run on a live screen. Outside such a commit it takes nothing and answers
     * false, and the call site runs its work inline.
     */
    deferSetup: (entry: ScreenActivityEffectEntry) => boolean;

    /** Whether this commit reveals this boundary or one above it. */
    getIsInRevealCommit: () => boolean;

    /**
     * Releases every entry that was disconnected and not connected again, after asking the boundary above to do the
     * same. It is for commits outside a reveal: in the reveal commit the bodies that are still there have not all run
     * yet when the first one arrives, and the drain sweeps after all ran.
     */
    releaseDisconnected: () => void;
};

// Null means no boundary above this subtree, which is every screen that did not opt into <Activity>.
const ScreenActivityEffectBoundaryContext = createContext<ScreenActivityEffectBoundary | null>(null);

export default ScreenActivityEffectBoundaryContext;
export {createScreenActivityEffectEntry, reportErrors, throwFirstAndReportRest};
export type {ScreenActivityEffectBoundary, ScreenActivityEffectEntry};
