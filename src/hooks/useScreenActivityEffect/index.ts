import type {DependencyList, EffectCallback} from 'react';

import {useContext, useEffect, useLayoutEffect, useRef} from 'react';

import ScreenActivityModeContext from './ScreenActivityModeContext';

/**
 * useEffect, except that the cleanup does not run when the component unmounts. It still runs when the dependencies
 * change and when a covering <Activity> hides the screen, which is the cycle the effect has to survive.
 *
 * Use it for a teardown that only exists to release what the reveal re-creates, and pair it with a terminal release
 * that the screen boundary owns. Never use it for a resource whose leak at unmount would matter on its own.
 *
 * On a screen that did not opt into <Activity> there is no cover to survive, so the hook is plain useEffect there,
 * including the cleanup at unmount.
 */
function useScreenActivityEffect(setup: EffectCallback, deps?: DependencyList): void {
    const screenActivityMode = useContext(ScreenActivityModeContext);
    const isTearingDownRef = useRef(false);
    const owedCleanupRef = useRef<ReturnType<EffectCallback>>(undefined);

    // A layout effect with no dependencies is destroyed only when the subtree's effects are destroyed, so its cleanup
    // separates a dependency change from a hide and from an unmount. It runs in the layout phase of the same commit
    // that flushes the passive cleanup below, so the flag is already set when that cleanup reads it.
    useLayoutEffect(() => {
        isTearingDownRef.current = false;
        // Reaching this setup again proves the teardown was not an unmount, so a cleanup held back by it is still owed.
        owedCleanupRef.current?.();
        owedCleanupRef.current = undefined;
        return () => {
            isTearingDownRef.current = true;
        };
    }, []);

    useEffect(() => {
        const cleanup = setup();
        return () => {
            // A teardown that is not a hide is either an unmount or a StrictMode remount, and the two are only told
            // apart by whether the layout setup above runs again, which is why the cleanup is held instead of dropped.
            if (isTearingDownRef.current && screenActivityMode !== null && !screenActivityMode.getIsHidden()) {
                owedCleanupRef.current = cleanup;
                return;
            }
            cleanup?.();
        };
        // The call site owns the dependencies, exactly as it would with useEffect.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

export default useScreenActivityEffect;
