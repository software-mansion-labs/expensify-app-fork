import type {DependencyList, EffectCallback} from 'react';

import {useContext, useEffect, useInsertionEffect, useRef} from 'react';

import type {ScreenActivityEffectEntry} from './ScreenActivityEffectBoundaryContext';

import ScreenActivityEffectBoundaryContext, {
    createScreenActivityEffectEntry,
    releaseScreenActivityEffectEntry,
    reportErrors,
    setUpScreenActivityEffectEntry,
} from './ScreenActivityEffectBoundaryContext';

/**
 * useEffect, except that an <Activity> hiding the component does not run the cleanup. It runs when the dependencies
 * change, when the component itself is removed, and, for whatever is still live by then, when the screen leaves the
 * navigation stack.
 *
 * React calls the same passive cleanup for a hide, a dependency change and a removal, but it runs an insertion effect
 * for a mount, a dependency change and a removal only: a hide, a reveal and the double invocation of StrictMode never
 * reach it. The hook therefore pairs the two. The insertion effect records what the call site owes, which is a setup
 * after a mount or a change and a release after a change or a removal, and the passive effect settles it, because a
 * passive effect may set state and read refs where an insertion effect may not. A passive cleanup that finds no release
 * owed is a hide, so it leaves the setup alone, and a reveal with unchanged dependencies finds no setup owed, so it
 * leaves it alone as well.
 *
 * A component removed while hidden gets no passive cleanup, so its insertion cleanup hands the release it owes to the
 * boundary of the screen, which pays it on the reveal, before the setup of the next body of the screen that runs, or
 * when the screen is popped. The boundary also runs the releases and setups a commit that covers or reveals the screen
 * owes in the phases of one commit. Use the hook for work that has to outlive a cover. Where it differs from useEffect
 * on a screen that stays live (coalesced dependency changes, the release of a component removed while hidden, where a
 * cleanup that throws surfaces, a StrictMode that no longer double-invokes it), see "Effects that must survive a cover"
 * in contributingGuides/ACTIVITY_SCREENS.md.
 */
function useScreenActivityEffect(setup: EffectCallback, deps?: DependencyList): void {
    const boundary = useContext(ScreenActivityEffectBoundaryContext);
    // The entry is mutated from the effects, which the React Compiler allows for a ref and rejects for a state.
    const entryRef = useRef<ScreenActivityEffectEntry>(undefined);

    useInsertionEffect(() => {
        if (entryRef.current === undefined) {
            entryRef.current = createScreenActivityEffectEntry(setup);
        }
        const entry = entryRef.current;
        entry.nextSetup = setup;
        entry.owesSetup = true;
        return () => {
            entry.owesRelease = true;
            boundary?.owe(entry);
        };
    }, deps);

    useEffect(() => {
        const entry = entryRef.current;
        if (entry === undefined) {
            throw new Error('[useScreenActivityEffect] The passive effect ran before the insertion effect of the same call site.');
        }
        entry.isConnected = true;

        // The components removed while hidden release before this setup, and one of those cleanups can throw. The body
        // reports the errors after its own setup instead of throwing, because a throw would surface a bug of another
        // component through this one, and React would never receive the cleanup returned below.
        let errors: unknown[] | undefined;
        try {
            boundary?.releaseOwed();
        } catch (error) {
            errors = [error];
        }

        // On a reveal the boundary runs the work of the whole subtree in phases, so the call site hands its work over.
        if (entry.owesSetup && !(boundary?.takeOverWork(entry) ?? false)) {
            try {
                releaseScreenActivityEffectEntry(entry);
            } catch (error) {
                errors = [...(errors ?? []), error];
            }
            setUpScreenActivityEffectEntry(entry);
        }
        if (errors !== undefined) {
            reportErrors(errors);
        }

        // The cleanup is returned even when the body set nothing up, so React keeps the way to release the live setup.
        return () => {
            entry.isConnected = false;
            if (!entry.owesRelease) {
                // A hide, or the double invocation of StrictMode. The setup survives under a boundary, which releases it
                // if the component goes away behind the cover; without one nothing would, so it releases as useEffect does.
                if (boundary === null) {
                    releaseScreenActivityEffectEntry(entry);
                }
                return;
            }
            // The dependencies changed in the commit that covers the screen, so no body follows this cleanup until the
            // reveal. The boundary runs the release and the setup of the new dependencies at the cover instead.
            if (entry.owesSetup && boundary !== null && boundary.takeOverWork(entry)) {
                return;
            }
            releaseScreenActivityEffectEntry(entry);
        };
        // The call site owns the dependencies, exactly as it would with useEffect.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

export default useScreenActivityEffect;
