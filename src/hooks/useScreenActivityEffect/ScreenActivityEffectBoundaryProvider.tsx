import type {ReactNode} from 'react';

import React, {useContext, useEffect, useLayoutEffect, useState} from 'react';

import type {ScreenActivityEffectBoundary, ScreenActivityEffectEntry} from './ScreenActivityEffectBoundaryContext';

import useScreenActivityEffect from '.';
import ScreenActivityEffectBoundaryContext, {releaseScreenActivityEffectEntry, setUpScreenActivityEffectEntry, throwFirstAndReportRest} from './ScreenActivityEffectBoundaryContext';

/** What the provider drives from its effects, which no call site of the hook gets to see. */
type ScreenActivityEffectBoundaryLifecycle = {
    /** Records the mode of the commit. A change marks the commit as one that covers or reveals until the drain runs. */
    syncMode: (isHidden: boolean) => void;

    /** Runs the phases of a commit that changed the mode, after every effect of the subtree ran. */
    drain: () => void;
};

/**
 * One boundary and everything it holds, created once per provider instance so that the context value never changes.
 * It holds the entries that owe a release, until their own passive cleanup pays it or the boundary pays for the ones
 * removed while hidden, and the entries whose owed work a commit that changes the mode runs in phases.
 */
function createBoundary(parent: ScreenActivityEffectBoundary | null, isHidden: boolean): ScreenActivityEffectBoundary & ScreenActivityEffectBoundaryLifecycle {
    const owed = new Set<ScreenActivityEffectEntry>();
    const deferred = new Set<ScreenActivityEffectEntry>();
    let isModeChangeCommit = false;
    let wasHidden = isHidden;

    /** Releases what is owed and not held by React any more, collecting instead of throwing so the batch can go on. */
    const releaseOwedInto = (errors: unknown[]) => {
        // The set empties before the first release, so a release that asks this boundary again finds nothing to repeat.
        const entries = [...owed];
        owed.clear();
        for (const entry of entries) {
            if (!entry.owesRelease || entry.isConnected) {
                continue;
            }
            try {
                releaseScreenActivityEffectEntry(entry);
            } catch (error) {
                errors.push(error);
            }
        }
    };

    const boundary: ScreenActivityEffectBoundary & ScreenActivityEffectBoundaryLifecycle = {
        owe: (entry) => {
            owed.add(entry);
        },
        releaseOwed: () => {
            // The boundary above goes first, so the entry it holds for a nested screen that went away releases before
            // anything of the new subtree sets up.
            parent?.releaseOwed();
            // In a commit that covers or reveals, the bodies of the subtree have not all run yet when the first one asks,
            // and an entry whose dependencies changed behind the cover is owed until its body runs. The drain of that
            // commit sweeps after all of them ran, in the release phase, so the tree order of the releases holds.
            if (boundary.getIsInModeChangeCommit()) {
                return;
            }
            const errors: unknown[] = [];
            releaseOwedInto(errors);
            throwFirstAndReportRest(errors);
        },
        getIsInModeChangeCommit: () => isModeChangeCommit || (parent?.getIsInModeChangeCommit() ?? false),
        takeOverWork: (entry) => {
            // The boundary above goes first, so the work of the whole tree gathers in the highest one changing its mode.
            if (parent?.takeOverWork(entry) ?? false) {
                return true;
            }
            if (!isModeChangeCommit) {
                return false;
            }
            deferred.add(entry);
            return true;
        },

        syncMode: (isHiddenNow) => {
            // The mark lives until the drain of this commit clears it, so work landing in any later commit runs inline.
            isModeChangeCommit = wasHidden !== isHiddenNow;
            wasHidden = isHiddenNow;
        },
        // The phases mirror one commit of a live screen: first the components removed while hidden, then every release
        // the deferred work owes, then every setup, so no call site acquires before another one has released.
        drain: () => {
            isModeChangeCommit = false;
            const errors: unknown[] = [];
            try {
                parent?.releaseOwed();
            } catch (error) {
                errors.push(error);
            }
            releaseOwedInto(errors);

            const work = [...deferred];
            deferred.clear();
            for (const entry of work) {
                try {
                    releaseScreenActivityEffectEntry(entry);
                } catch (error) {
                    errors.push(error);
                }
            }
            for (const entry of work) {
                try {
                    setUpScreenActivityEffectEntry(entry);
                } catch (error) {
                    errors.push(error);
                }
            }
            throwFirstAndReportRest(errors);
        },
    };
    return boundary;
}

/**
 * Pays the releases of the subtree it covers that React never asks for, and runs the work a cover or a reveal owes in
 * phases. It has to render outside the <Activity> it serves, because a component cannot observe its own hiding, and
 * because its own removal is the only event that means the screen is really gone.
 *
 * The mode is recorded from a layout effect. React runs the whole layout phase of a commit before its passive phase, so
 * it is already recorded when the passive effects of the covered or revealed subtree ask about it. The drain runs as a
 * passive effect of the commits that change the mode, after every effect of the subtree, because the effect of a parent
 * runs after the effects of its children. A reveal of a boundary above runs it as well, because a revealed <Activity>
 * runs every effect of its subtree again whatever their dependencies.
 *
 * The release of what is left over is a screen activity effect of its own, taken in the scope of the boundary above. A
 * boundary of a nested navigator renders inside the <Activity> of the screen holding it, so the same commit that hides
 * that screen runs the passive cleanup of this one, and the hook is what tells that hide from the screen being popped.
 */
function ScreenActivityEffectBoundaryProvider({isHidden, children}: {isHidden: boolean; children: ReactNode}) {
    const parent = useContext(ScreenActivityEffectBoundaryContext);
    const [boundary] = useState(() => createBoundary(parent, isHidden));

    useLayoutEffect(() => {
        boundary.syncMode(isHidden);
    }, [boundary, isHidden]);

    useEffect(() => {
        boundary.drain();
    }, [boundary, isHidden]);

    useScreenActivityEffect(() => boundary.releaseOwed, [boundary]);

    return <ScreenActivityEffectBoundaryContext.Provider value={boundary}>{children}</ScreenActivityEffectBoundaryContext.Provider>;
}

export default ScreenActivityEffectBoundaryProvider;
