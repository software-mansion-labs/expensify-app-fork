import type {ReactNode} from 'react';

import React, {useContext, useEffect, useLayoutEffect, useState} from 'react';

import type {ScreenActivityEffectBoundary, ScreenActivityEffectEntry} from './ScreenActivityEffectBoundaryContext';

import useScreenActivityEffect from '.';
import ScreenActivityEffectBoundaryContext, {throwFirstAndReportRest} from './ScreenActivityEffectBoundaryContext';

/** What the provider drives from its effects, which no call site of the hook gets to see. */
type ScreenActivityEffectBoundaryLifecycle = {
    /** Records the mode of the commit. A change marks the commit as a cover or a reveal until the drain runs. */
    syncMode: (isHidden: boolean) => void;

    /** Runs the phases of a commit that changed the mode, after every effect of the subtree ran. */
    drain: () => void;

    /** Releases every entry the boundary still holds, which is what the screen leaving the stack owes. */
    releaseAll: () => void;
};

/** Releases the entries given and collects instead of throwing, so a batch can go on. */
function releaseEntriesIntoErrors(entries: readonly ScreenActivityEffectEntry[], errors: unknown[]): void {
    for (const entry of entries) {
        try {
            entry.release();
        } catch (error) {
            errors.push(error);
        }
    }
}

/**
 * One boundary and everything it holds, created once per provider instance so that the context value never changes.
 * It holds the entries a cover disconnected, because those get no passive cleanup of their own if their component is
 * removed while hidden, and the entries whose owed work a commit that changes the mode runs in phases.
 */
function createBoundary(parent: ScreenActivityEffectBoundary | null, isHidden: boolean): ScreenActivityEffectBoundary & ScreenActivityEffectBoundaryLifecycle {
    const disconnected = new Set<ScreenActivityEffectEntry>();
    const deferred = new Set<ScreenActivityEffectEntry>();
    let pendingModeChange: 'cover' | 'reveal' | null = null;
    let hasConnectedInReveal = false;
    let wasHidden = isHidden;

    /** Takes every disconnected entry out, so the caller can release them and no later sweep sees them again. */
    const takeDisconnected = (): ScreenActivityEffectEntry[] => {
        const taken = [...disconnected];
        disconnected.clear();
        return taken;
    };

    const boundary: ScreenActivityEffectBoundary & ScreenActivityEffectBoundaryLifecycle = {
        connect: (entry) => {
            disconnected.delete(entry);
            if (boundary.getIsInRevealCommit()) {
                hasConnectedInReveal = true;
                return;
            }
            boundary.releaseDisconnected();
        },
        disconnect: (entry) => {
            disconnected.add(entry);
        },
        deferSetup: (entry) => {
            // The boundary above goes first, so the work of the whole tree gathers in the highest one changing its mode.
            if (parent !== null && parent.deferSetup(entry)) {
                return true;
            }
            if (pendingModeChange === null) {
                return false;
            }
            deferred.add(entry);
            return true;
        },
        getIsInRevealCommit: () => pendingModeChange === 'reveal' || (parent?.getIsInRevealCommit() ?? false),
        releaseDisconnected: () => {
            // The boundary above goes first, so the entry it holds for a nested screen that went away releases before
            // anything of the new subtree sets up, and a body running anywhere below is evidence for it as well.
            parent?.releaseDisconnected();
            if (disconnected.size === 0) {
                return;
            }
            const errors: unknown[] = [];
            releaseEntriesIntoErrors(takeDisconnected(), errors);
            throwFirstAndReportRest(errors);
        },

        syncMode: (isHiddenNow) => {
            // The mark lives until the drain of this commit clears it, so work landing in any later commit runs inline.
            if (wasHidden !== isHiddenNow) {
                pendingModeChange = isHiddenNow ? 'cover' : 'reveal';
            }
            wasHidden = isHiddenNow;
        },
        // The phases mirror one commit of a live screen: first the entries a cover disconnected and no body claimed
        // back, because they belong to components that are gone, then every release the deferred work owes, then every
        // setup, so no call site acquires before another one has released. An entry that did not come back is only
        // evidence of a removal once some body did come back, because a reveal that ran no body of the subtree ran none
        // for the component that is still there either, which is what a <Suspense> below the boundary does when it
        // suspends again on the reveal.
        drain: () => {
            const isRevealCommit = boundary.getIsInRevealCommit();
            const hasConnected = hasConnectedInReveal;
            pendingModeChange = null;
            hasConnectedInReveal = false;

            const errors: unknown[] = [];
            if (isRevealCommit && hasConnected) {
                releaseEntriesIntoErrors(takeDisconnected(), errors);
            }

            const work = [...deferred];
            deferred.clear();
            releaseEntriesIntoErrors(work, errors);
            for (const entry of work) {
                try {
                    entry.setUp();
                } catch (error) {
                    errors.push(error);
                }
            }
            throwFirstAndReportRest(errors);
        },
        releaseAll: () => {
            const errors: unknown[] = [];
            releaseEntriesIntoErrors(takeDisconnected(), errors);
            throwFirstAndReportRest(errors);
        },
    };
    return boundary;
}

/**
 * Keeps the entries of the subtree it covers whose cleanup a hide skipped, and runs the work a cover or a reveal owes
 * them in phases. It has to render outside the <Activity> it serves, because a component cannot observe its own hiding,
 * and because its own removal is the only event that means the screen is really gone.
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

    useScreenActivityEffect(() => boundary.releaseAll, [boundary]);

    return <ScreenActivityEffectBoundaryContext.Provider value={boundary}>{children}</ScreenActivityEffectBoundaryContext.Provider>;
}

export default ScreenActivityEffectBoundaryProvider;
