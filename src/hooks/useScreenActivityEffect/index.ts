import type {DependencyList, EffectCallback} from 'react';

import {useContext, useEffect, useRef} from 'react';

import type {ScreenActivityEffectEntry} from './ScreenActivityEffectBoundaryContext';

import ScreenActivityEffectBoundaryContext, {createScreenActivityEffectEntry, throwFirstAndReportRest} from './ScreenActivityEffectBoundaryContext';

function areDepsEqual(previous: DependencyList | undefined, next: DependencyList | undefined): boolean {
    // No dependency list means the effect runs on every render, exactly as useEffect does.
    if (previous === undefined || next === undefined) {
        return false;
    }
    // A list that changed size is a mistake React warns about rather than a change it acts on: it compares the
    // dependencies both lists have and nothing else. This does the same, so the size alone never re-runs the effect.
    const shared = Math.min(previous.length, next.length);
    return previous.slice(0, shared).every((value, index) => Object.is(value, next.at(index)));
}

/**
 * useEffect, except that a covering <Activity> hiding the screen does not run the cleanup. It runs when the
 * dependencies change, when the component itself is removed, and, for whatever is still live by then, when
 * ScreenActivityEffectBoundaryProvider unmounts, which is when the screen leaves the navigation stack.
 *
 * React calls the same cleanup for all three, so the hook asks the boundary which one it is: a cleanup that arrives
 * while the boundary reports a screen teardown belongs to the screen and is skipped, and any other cleanup belongs to
 * the component and releases at once. Because a hide releases nothing, a reveal that runs the body again with
 * unchanged dependencies leaves the live setup alone, so the effect goes through a cover and reveal cycle exactly as
 * it goes through it on a screen that stays live in the background.
 *
 * The guarantee is inferred from a signal rather than structural, which is the deliberate trade for the component
 * keeping the release it owns. The signal is only ever read from a cleanup, so no render and no effect body can branch
 * on being covered, and it only decides when a release happens, never what the effect sees.
 *
 * Use it for work that has to outlive a cover. On a screen with no boundary above it there is nothing to survive, so
 * the hook is plain useEffect there. Where it differs from useEffect on a screen that stays live (coalesced dependency
 * changes, the release of a component removed while hidden, the teardown order, errors, a StrictMode above the
 * boundary), see "Effects that must survive a cover" in contributingGuides/ACTIVITY_SCREENS.md.
 */
function useScreenActivityEffect(setup: EffectCallback, deps?: DependencyList): void {
    const boundary = useContext(ScreenActivityEffectBoundaryContext);
    // The entry is mutated from the effect, which the React Compiler allows for a ref and rejects for a state.
    const entryRef = useRef<ScreenActivityEffectEntry>(undefined);

    useEffect(() => {
        // The boundary of an instance never changes, so it does not belong in the dependencies the call site owns.
        if (boundary === null) {
            return setup();
        }

        if (entryRef.current === undefined) {
            entryRef.current = createScreenActivityEffectEntry();
        }
        const entry = entryRef.current;

        // The mark comes off before the boundary looks for entries that did not come back, so this one is not among them.
        entry.isAwaitingReveal = false;
        // Registering releases the components removed behind the cover, and one of those cleanups can throw. React
        // reports a cleanup that throws and still runs the setup of that commit, so the errors surface after it.
        const errors: unknown[] = [];
        try {
            boundary.register(entry);
        } catch (error) {
            errors.push(error);
        }

        // A setup that survived a hide is live for the dependencies it ran with, so only a change runs the body. On the
        // reveal the boundary runs the work of the whole subtree in phases, so the call site hands its work over instead.
        if (!areDepsEqual(entry.deps, deps) && !boundary.deferRevealWork(entry, setup, deps)) {
            try {
                entry.release();
            } catch (error) {
                errors.push(error);
            }
            entry.setUp(setup, deps);
        }
        throwFirstAndReportRest(errors);

        // The cleanup is returned even when the body set nothing up, so React keeps the way to release the live setup.
        return () => {
            if (boundary.getIsScreenTeardown()) {
                // The reveal decides what this was: the body runs again for a component that is still there, and the
                // boundary sweeps the mark for one that is not.
                entry.isAwaitingReveal = true;
                return;
            }
            // The entry goes back first, so a cleanup that throws does not leave the boundary holding a released entry.
            boundary.unregister(entry);
            entry.release();
        };
        // The call site owns the dependencies, exactly as it would with useEffect.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

export default useScreenActivityEffect;
