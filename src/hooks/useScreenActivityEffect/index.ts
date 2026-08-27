import type {DependencyList, EffectCallback} from 'react';

import {useContext, useEffect, useRef} from 'react';

import ScreenActivityModeContext from './ScreenActivityModeContext';

/**
 * useEffect, except that the cleanup does not run when the component unmounts. It still runs when the dependencies
 * change and when a covering <Activity> hides the screen, which is the cycle the effect has to survive.
 *
 * The guarantee is structural rather than inferred: the effect hands React no cleanup, so neither an unmount nor a
 * hide can make React run one. What the cleanup would have done happens in the two places that mean the work is
 * genuinely over, the top of the next run of the body and the boundary that reports the hide.
 *
 * Use it for a teardown that only exists to release what the reveal re-creates, and pair it with a terminal release
 * that the screen boundary owns. Never use it for a resource whose leak at unmount would matter on its own.
 *
 * On a screen that did not opt into <Activity> there is no cover to survive, so the hook is plain useEffect there,
 * including the cleanup at unmount.
 */
function useScreenActivityEffect(setup: EffectCallback, deps?: DependencyList): void {
    const screenActivityMode = useContext(ScreenActivityModeContext);
    const cleanupRef = useRef<ReturnType<EffectCallback>>(undefined);

    // Registration is passive, so it outlives the layout phase in which the boundary runs the cleanups, and it is
    // dropped by the same cleanup for a hide and for an unmount, which is why neither needs to be told apart here.
    useEffect(() => {
        if (screenActivityMode === null) {
            return;
        }
        return screenActivityMode.registerHideCleanup(cleanupRef);
    }, [screenActivityMode]);

    useEffect(() => {
        // The previous run's teardown belongs at the top of this one, because the cleanup React would call is the
        // one an unmount must not reach.
        cleanupRef.current?.();
        cleanupRef.current = setup();

        // Without a boundary nothing else would ever run the teardown, so the effect keeps the ordinary contract.
        // The context of an instance never changes, so it does not belong in the dependencies the call site owns.
        if (screenActivityMode !== null) {
            return;
        }
        return () => {
            cleanupRef.current?.();
            cleanupRef.current = undefined;
        };
        // The call site owns the dependencies, exactly as it would with useEffect.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

export default useScreenActivityEffect;
