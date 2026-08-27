import type {ReactNode} from 'react';

import React, {createContext, useLayoutEffect, useMemo, useRef} from 'react';

type ScreenActivityMode = {
    /** Whether the <Activity> above this subtree is currently hidden. Call it from an effect cleanup, never during render. */
    getIsHidden: () => boolean;
};

// Null means there is no <Activity> above this subtree, which is every screen that did not opt into the behavior.
const ScreenActivityModeContext = createContext<ScreenActivityMode | null>(null);

/**
 * Publishes the mode of the <Activity> it sits above, so a subtree can tell a cleanup caused by the cover apart from
 * one caused by its own unmount. It has to render outside the <Activity>, because a component inside it cannot
 * observe its own hiding.
 */
function ScreenActivityModeProvider({isHidden, children}: {isHidden: boolean; children: ReactNode}) {
    const isHiddenRef = useRef(isHidden);

    // The layout phase of the commit that hides the subtree runs before that subtree's passive cleanups, so a hidden
    // child already reads the new mode in its own cleanup.
    useLayoutEffect(() => {
        isHiddenRef.current = isHidden;
    }, [isHidden]);

    // The identity has to stay stable, because a new context value would re-render the whole screen on every commit.
    const value = useMemo(() => ({getIsHidden: () => isHiddenRef.current}), []);

    return <ScreenActivityModeContext.Provider value={value}>{children}</ScreenActivityModeContext.Provider>;
}

export default ScreenActivityModeContext;
export {ScreenActivityModeProvider};
export type {ScreenActivityMode};
