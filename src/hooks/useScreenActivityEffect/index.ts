import type {DependencyList, EffectCallback} from 'react';

import {useContext, useEffect, useRef} from 'react';

import type {ScreenActivityEffectEntry} from './ScreenActivityEffectBoundaryContext';

import ScreenActivityEffectBoundaryContext, {createScreenActivityEffectEntry} from './ScreenActivityEffectBoundaryContext';

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
 * The guarantee is therefore inferred from a signal rather than structural, which is the deliberate trade for the
 * component keeping the release it owns. The signal is narrow: it is only ever read from a cleanup, so no render and
 * no effect body can branch on being covered, and it only decides when a release happens, never what the effect sees.
 *
 * Use it for work that has to outlive a cover. On a screen with no boundary above it there is nothing to survive, so
 * the hook is plain useEffect there.
 *
 * The reveal commit runs its work in the phases of a live commit: the boundary releases every call site that owes a
 * release, the entries of components removed while the screen was hidden first, before it runs any setup. Work that
 * lands in a later commit runs inline, as it does on a live screen. One ordering limit remains at a call site: the
 * screen teardown releases in the order the effects registered in rather than in tree order, so two entries of one
 * commit release child before parent where React would release parent before child. Work that reads its release order
 * against a sibling has to tolerate that.
 *
 * One behavior is not the one of a live screen. A component removed while the screen was hidden is released by the
 * first effect of the screen that runs after the removal: on the reveal if the reveal runs one, otherwise right before
 * the setup of the next effect that runs, otherwise when the screen leaves the stack. That is the price of never
 * releasing the setup of a component which is only suspended, because a reveal that runs no body at all cannot tell the
 * two apart; where one part of the screen suspends while another runs, the suspended part is released and set up again
 * once it resolves.
 *
 * A cleanup or setup that throws while the boundary runs it, on the reveal or when the screen leaves the stack, reaches
 * the error boundary above the screen rather than one inside it.
 *
 * In development, a <StrictMode> above the boundary, which CONFIG.USE_REACT_STRICT_MODE_IN_DEV puts above the whole
 * app, makes React run the cleanup and the setup of every effect of a revealed <Activity> once more, and that cleanup
 * cannot be told from a removal, so the effect goes through cleanup and setup on every reveal there. The gate
 * ScreenActivityWrapper renders below the boundary does not do that, so keep the app-wide flag off when checking what
 * this hook keeps alive.
 */
function useScreenActivityEffect(setup: EffectCallback, deps?: DependencyList): void {
    const boundary = useContext(ScreenActivityEffectBoundaryContext);
    const entryRef = useRef<ScreenActivityEffectEntry>(undefined);

    useEffect(() => {
        // The context of an instance never changes, so the boundary does not belong in the dependencies the call site
        // owns, and the branch below is settled for the whole life of the component.
        if (boundary === null) {
            return setup();
        }

        // The entry is created here rather than in render, where the React Compiler rejects writing to a ref.
        if (entryRef.current === undefined) {
            entryRef.current = createScreenActivityEffectEntry();
        }
        const entry = entryRef.current;
        // The mark comes off before the boundary looks for entries that did not come back, so this one is not among them.
        entry.isAwaitingReveal = false;
        let hasReleaseFailed = false;
        let releaseError: unknown;
        // Registering releases the components removed behind the cover, and one of those cleanups can throw.
        try {
            boundary.register(entry);
        } catch (error) {
            hasReleaseFailed = true;
            releaseError = error;
        }

        // The setup that survived a hide is still live, so running it again for the reveal would acquire what is
        // already held. A dependency change that landed while the screen was hidden is what lands in the branch.
        if (!entry.isSetUp || !areDepsEqual(entry.deps, deps)) {
            // On a reveal the boundary runs the work of the whole subtree in release and setup phases, so this call
            // site hands its work over instead of running it here, where it would interleave with its neighbors.
            if (!boundary.deferRevealWork(entry, setup, deps)) {
                try {
                    entry.release();
                } catch (error) {
                    if (hasReleaseFailed) {
                        console.error(error);
                    } else {
                        hasReleaseFailed = true;
                        releaseError = error;
                    }
                }
                entry.cleanup = setup();
                entry.deps = deps;
                entry.isSetUp = true;
            }
        }
        // React reports a cleanup that throws and still runs the setup of that commit, so the setup above ran first and
        // the error surfaces after it, where React would have surfaced it.
        if (hasReleaseFailed) {
            throw releaseError;
        }

        // The cleanup is returned even when the body set nothing up, because a reveal that changed nothing still has
        // to leave React holding the way to release what the previous run set up.
        return () => {
            if (boundary.getIsScreenTeardown()) {
                // The reveal decides what this was. The body runs again for a component that is still there, and the
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
