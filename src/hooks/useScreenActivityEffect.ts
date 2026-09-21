import type {DependencyList, EffectCallback} from 'react';

import {useEffect, useInsertionEffect, useRef} from 'react';

/** The live setup of one call site and what the call site owes, written by the effects of the hook only. */
type ScreenActivityEffectEntry = {
    /** What the last run of the setup returned. */
    cleanup: ReturnType<EffectCallback>;

    /** Whether the latest render has no live setup: the component mounted, its dependencies changed, or a release ran. */
    owesSetup: boolean;

    /** Whether React still holds the passive cleanup of the call site, which a hide takes away until the next body. */
    isConnected: boolean;

    /** Whether React still holds the insertion cleanup of the call site, which only a removal or a dependency change takes away. */
    isMounted: boolean;
};

/* eslint-disable no-param-reassign */
function releaseEntry(entry: ScreenActivityEffectEntry): void {
    const {cleanup} = entry;
    entry.cleanup = undefined;
    entry.owesSetup = true;
    cleanup?.();
}
/* eslint-enable no-param-reassign */

/**
 * Runs the work and reports an error instead of throwing it, which is what React does with a cleanup that throws
 * during a commit: the error is reported, and the rest of the commit still runs.
 */
function reportAndRun(work: () => void): void {
    try {
        work();
    } catch (error) {
        console.error(error);
    }
}

/** Runs the work once the commit that queued it is over, which is when React has run every effect it was going to run. */
function afterCommit(work: () => void): void {
    Promise.resolve().then(() => reportAndRun(work));
}

/**
 * useEffect, except that an <Activity> hiding the component does not run the cleanup. It runs when the dependencies
 * change and when the component itself is removed, which includes the screen leaving the navigation stack.
 *
 * React calls the same passive cleanup for a hide, a dependency change and a removal, but it runs an insertion effect
 * for a mount, a dependency change and a removal only: a hide, a reveal and the double invocation of StrictMode never
 * reach it. The hook therefore pairs the two. The insertion effect records whether React holds the call site and
 * whether the latest render owes a setup, and the passive effect settles it, because a passive effect may set state
 * and read refs where an insertion effect may not. A passive cleanup that finds the call site mounted with its setup
 * current is a hide, so it leaves the setup alone, and a reveal with unchanged dependencies finds no setup owed, so it
 * leaves it alone as well.
 *
 * Behind a cover no passive effect runs, so the insertion cleanup is the only call the hook gets there, and it cannot
 * tell a removal from a dependency change. Once the commit is over it can: a dependency change has mounted the call
 * site again and a removal has not. The hook therefore decides right after the commit, and releases the setup of a
 * component removed while hidden itself. A dependency change behind the cover keeps the old setup live until the
 * reveal, where the body releases it and runs the setup of the latest render. Use the hook for work that has to
 * outlive a cover. Where it differs from useEffect on a screen that stays live, see "Effects that must survive a cover"
 * in contributingGuides/ACTIVITY_SCREENS.md.
 */
function useScreenActivityEffect(setup: EffectCallback, deps?: DependencyList): void {
    // The entry is mutated from the effects, which the React Compiler allows for a ref and rejects for a state.
    const entryRef = useRef<ScreenActivityEffectEntry>({cleanup: undefined, owesSetup: false, isConnected: false, isMounted: false});

    useInsertionEffect(() => {
        const entry = entryRef.current;
        entry.owesSetup = true;
        entry.isMounted = true;
        return () => {
            entry.isMounted = false;
            // The passive cleanup pays the release when React still holds it. Behind a cover it does not, and nothing
            // else of the call site runs, so the hook pays once the commit is over, unless the commit mounted the call
            // site again, which is a dependency change the reveal pays for.
            if (entry.isConnected) {
                return;
            }
            afterCommit(() => {
                if (entry.isMounted) {
                    return;
                }
                releaseEntry(entry);
            });
        };
    }, deps);

    useEffect(() => {
        const entry = entryRef.current;
        entry.isConnected = true;
        if (entry.owesSetup) {
            // The release is the one a cover deferred, and a cleanup that throws must not stop the setup that follows.
            reportAndRun(() => releaseEntry(entry));
            entry.owesSetup = false;
            entry.cleanup = setup();
        }
        // The cleanup is returned even when the body set nothing up, so React keeps the way to release the live setup.
        return () => {
            entry.isConnected = false;
            // A hide, or the double invocation of StrictMode, leaves the call site mounted with its setup current.
            if (!entry.isMounted || entry.owesSetup) {
                releaseEntry(entry);
            }
        };
        // The call site owns the dependencies, exactly as it would with useEffect.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

export default useScreenActivityEffect;
