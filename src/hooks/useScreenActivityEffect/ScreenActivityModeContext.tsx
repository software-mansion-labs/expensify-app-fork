import type {EffectCallback, ReactNode, RefObject} from 'react';

import React, {createContext, useLayoutEffect, useMemo} from 'react';

type ScreenActivityCleanupRef = RefObject<ReturnType<EffectCallback>>;

type ScreenActivityMode = {
    /** Registers a cleanup slot the boundary runs when it hides. Returns the matching unregister. */
    registerHideCleanup: (cleanupRef: ScreenActivityCleanupRef) => () => void;

    /** Runs and empties every registered cleanup slot. */
    runHideCleanups: () => void;
};

// Null means there is no <Activity> above this subtree, which is every screen that did not opt into the behavior.
const ScreenActivityModeContext = createContext<ScreenActivityMode | null>(null);

/**
 * Runs the registered cleanups of the subtree it covers at the moment the <Activity> hides it. It has to render
 * outside that <Activity>, because a component inside it cannot observe its own hiding.
 *
 * The trigger is a layout effect, not a passive one. React flushes the passive cleanups of the hidden subtree before
 * the passive effects of this component, so a passive trigger here would fire after the subtree it is meant to serve
 * has already been torn down, while the layout phase of the same commit still runs ahead of it.
 */
function ScreenActivityModeProvider({isHidden, children}: {isHidden: boolean; children: ReactNode}) {
    const value = useMemo<ScreenActivityMode>(() => {
        const cleanupRefs = new Set<ScreenActivityCleanupRef>();
        return {
            registerHideCleanup: (cleanupRef) => {
                cleanupRefs.add(cleanupRef);
                return () => {
                    cleanupRefs.delete(cleanupRef);
                };
            },
            runHideCleanups: () => {
                for (const cleanupRef of cleanupRefs) {
                    cleanupRef.current?.();
                    cleanupRef.current = undefined;
                }
            },
        };
    }, []);

    useLayoutEffect(() => {
        if (!isHidden) {
            return;
        }
        value.runHideCleanups();
    }, [isHidden, value]);

    return <ScreenActivityModeContext.Provider value={value}>{children}</ScreenActivityModeContext.Provider>;
}

export default ScreenActivityModeContext;
export {ScreenActivityModeProvider};
export type {ScreenActivityCleanupRef, ScreenActivityMode};
