import type {DependencyList, EffectCallback, ReactNode} from 'react';

import React, {createContext, useEffect, useMemo, useState} from 'react';

/** The live setup of one call site of useScreenActivityEffect, owned by the boundary from its first effect run on. */
type ScreenActivityEffectEntry = {
    /** What the last run of the effect body returned. */
    cleanup: ReturnType<EffectCallback>;

    /** The dependencies that setup was run with, so a re-run after a hide can tell whether it is the same work. */
    deps: DependencyList | undefined;

    /** Whether cleanup and deps describe a setup that is still live, which a setup returning nothing cannot show. */
    isSetUp: boolean;
};

type ScreenActivityEffectBoundary = {
    /** Hands the boundary an entry to release when the screen goes away. Registering the same entry twice is a no-op. */
    register: (entry: ScreenActivityEffectEntry) => void;
};

// Null means no boundary above this subtree, which is every screen that did not opt into <Activity>.
const ScreenActivityEffectBoundaryContext = createContext<ScreenActivityEffectBoundary | null>(null);

/**
 * Owns the terminal release of the effects that useScreenActivityEffect keeps alive across a cover. It has to render
 * outside the <Activity> it serves, because its own unmount is the only event that means the screen is really gone.
 * A hide unmounts the subtree without unmounting this component, and that is precisely the case where nothing is
 * released.
 */
function ScreenActivityEffectBoundaryProvider({children}: {children: ReactNode}) {
    const [entries] = useState(() => new Set<ScreenActivityEffectEntry>());

    const boundary = useMemo<ScreenActivityEffectBoundary>(
        () => ({
            register: (entry) => {
                entries.add(entry);
            },
        }),
        [entries],
    );

    // The cleanup of a passive effect is what the registered cleanups themselves are, so they run in the phase they
    // were written for. React runs it before the passive cleanups of the subtree, which owns nothing of theirs anyway.
    useEffect(
        () => () => {
            for (const entry of entries) {
                const {cleanup} = entry;
                entry.cleanup = undefined;
                entry.deps = undefined;
                entry.isSetUp = false;
                cleanup?.();
            }
            entries.clear();
        },
        [entries],
    );

    return <ScreenActivityEffectBoundaryContext.Provider value={boundary}>{children}</ScreenActivityEffectBoundaryContext.Provider>;
}

export default ScreenActivityEffectBoundaryContext;
export {ScreenActivityEffectBoundaryProvider};
export type {ScreenActivityEffectBoundary, ScreenActivityEffectEntry};
