import type {DependencyList, EffectCallback} from 'react';

import {useContext, useEffect, useRef} from 'react';

import type {ScreenActivityEffectEntry} from './ScreenActivityEffectBoundaryContext';

import ScreenActivityEffectBoundaryContext from './ScreenActivityEffectBoundaryContext';

function areDepsEqual(previous: DependencyList | undefined, next: DependencyList | undefined): boolean {
    // No dependency list means the effect runs on every render, exactly as useEffect does.
    if (previous === undefined || next === undefined || previous.length !== next.length) {
        return false;
    }
    return previous.every((value, index) => Object.is(value, next.at(index)));
}

/**
 * useEffect, except that unmounting never runs the cleanup. It runs when the dependencies change and when
 * ScreenActivityEffectBoundaryProvider unmounts, which is when the screen leaves the navigation stack.
 *
 * The guarantee is structural rather than inferred: the effect hands React no cleanup, so neither the unmount of the
 * component nor the hide of a covering <Activity> can make React run one. Because nothing was released, a reveal that
 * runs the body again with unchanged dependencies leaves the live setup alone, so the effect goes through a cover and
 * reveal cycle exactly as it goes through it on a screen that stays live in the background.
 *
 * Use it for work that belongs to the screen rather than to the component that started it, and remember that the
 * release then waits for the screen. Never use it for a resource whose lifetime is really the component's own.
 *
 * On a screen with no boundary above it there is nothing to defer to, so the hook is plain useEffect there, including
 * the cleanup at unmount.
 */
function useScreenActivityEffect(setup: EffectCallback, deps?: DependencyList): void {
    const boundary = useContext(ScreenActivityEffectBoundaryContext);
    const entryRef = useRef<ScreenActivityEffectEntry>({cleanup: undefined, deps: undefined, isSetUp: false});

    useEffect(() => {
        // The context of an instance never changes, so the boundary does not belong in the dependencies the call site
        // owns, and the branch below is settled for the whole life of the component.
        if (boundary === null) {
            return setup();
        }

        const entry = entryRef.current;
        boundary.register(entry);

        // A hide tears the body down and a reveal runs it again with the same dependencies. The setup of the previous
        // run was never cleaned up, so running it again would acquire what is already held.
        if (entry.isSetUp && areDepsEqual(entry.deps, deps)) {
            return;
        }

        entry.cleanup?.();
        entry.cleanup = setup();
        entry.deps = deps;
        entry.isSetUp = true;

        // The call site owns the dependencies, exactly as it would with useEffect.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

export default useScreenActivityEffect;
