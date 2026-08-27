import type {DependencyList, EffectCallback} from 'react';

import {useContext, useEffect, useRef} from 'react';

import type {ScreenActivityEffectEntry} from './ScreenActivityEffectBoundaryContext';

import ScreenActivityEffectBoundaryContext, {createScreenActivityEffectEntry} from './ScreenActivityEffectBoundaryContext';

function areDepsEqual(previous: DependencyList | undefined, next: DependencyList | undefined): boolean {
    // No dependency list means the effect runs on every render, exactly as useEffect does.
    if (previous === undefined || next === undefined || previous.length !== next.length) {
        return false;
    }
    return previous.every((value, index) => Object.is(value, next.at(index)));
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
        boundary.register(entry);
        entry.isAwaitingReveal = false;

        // The setup that survived a hide is still live, so running it again for the reveal would acquire what is
        // already held. A dependency change that landed while the screen was hidden is what lands in the branch.
        if (!entry.isSetUp || !areDepsEqual(entry.deps, deps)) {
            entry.release();
            entry.cleanup = setup();
            entry.deps = deps;
            entry.isSetUp = true;
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
            entry.release();
            boundary.unregister(entry);
        };

        // The call site owns the dependencies, exactly as it would with useEffect.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

export default useScreenActivityEffect;
