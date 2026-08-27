import type {DependencyList, EffectCallback, ReactNode} from 'react';

import React, {createContext, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';

/** The live setup of one call site of useScreenActivityEffect, owned by the boundary from its first effect run on. */
type ScreenActivityEffectEntry = {
    /** What the last run of the effect body returned. */
    cleanup: ReturnType<EffectCallback>;

    /** The dependencies that setup was run with, so a re-run after a hide can tell whether it is the same work. */
    deps: DependencyList | undefined;

    /** Whether cleanup and deps describe a setup that is still live, which a setup returning nothing cannot show. */
    isSetUp: boolean;

    /** Whether a hide skipped this cleanup, which the reveal answers by running the body again or by not running it. */
    isAwaitingReveal: boolean;

    /** Runs the live cleanup and forgets it, so the call site and the boundary can both ask for the release. */
    release: () => void;
};

function createScreenActivityEffectEntry(): ScreenActivityEffectEntry {
    const entry: ScreenActivityEffectEntry = {
        cleanup: undefined,
        deps: undefined,
        isSetUp: false,
        isAwaitingReveal: false,
        release: () => {
            const {cleanup} = entry;
            entry.cleanup = undefined;
            entry.deps = undefined;
            entry.isSetUp = false;
            entry.isAwaitingReveal = false;
            cleanup?.();
        },
    };
    return entry;
}

type ScreenActivityEffectBoundary = {
    /** Hands the boundary an entry to release when the screen goes away. Registering the same entry twice is a no-op. */
    register: (entry: ScreenActivityEffectEntry) => void;

    /** Gives an entry back once its own cleanup has run, so a component that really went away leaves nothing behind. */
    unregister: (entry: ScreenActivityEffectEntry) => void;

    /**
     * Whether the cleanup React is running right now comes from the screen rather than from the component. It is true
     * while the <Activity> is hidden and from the moment this boundary starts unmounting.
     */
    getIsScreenTeardown: () => boolean;
};

// Null means no boundary above this subtree, which is every screen that did not opt into <Activity>.
const ScreenActivityEffectBoundaryContext = createContext<ScreenActivityEffectBoundary | null>(null);

/**
 * Tells the effects of the subtree it covers whether a cleanup belongs to them, and owns the release of the ones that
 * are left over. It has to render outside the <Activity> it serves, because a component cannot observe its own hiding,
 * and because its own unmount is the only event that means the screen is really gone.
 *
 * The flag is a layout effect. React runs the whole layout phase of a commit before its passive phase, so it is
 * already set when the passive cleanups of the hidden or deleted subtree ask about it. Everything else runs as a
 * passive effect, which is the phase the cleanups it runs were written for, and which for a deletion still comes
 * before the passive cleanups of the subtree.
 */
function ScreenActivityEffectBoundaryProvider({isHidden, children}: {isHidden: boolean; children: ReactNode}) {
    const [entries] = useState(() => new Set<ScreenActivityEffectEntry>());
    const isScreenTeardownRef = useRef(false);

    const boundary = useMemo<ScreenActivityEffectBoundary>(
        () => ({
            register: (entry) => {
                entries.add(entry);
            },
            unregister: (entry) => {
                entries.delete(entry);
            },
            getIsScreenTeardown: () => isScreenTeardownRef.current,
        }),
        [entries],
    );

    useLayoutEffect(() => {
        isScreenTeardownRef.current = isHidden;
        // The setup above runs again right after this cleanup for a change of isHidden, which leaves the flag true only
        // when no setup follows, and that is the unmount of the boundary.
        return () => {
            isScreenTeardownRef.current = true;
        };
    }, [isHidden]);

    // A reveal runs the bodies of the subtree before this effect, so an entry whose cleanup the hide skipped and which
    // did not come back with the reveal belongs to a component that is gone. Sweeping it here keeps a component that
    // was removed while the screen was covered from waiting for the screen to leave the stack.
    useEffect(() => {
        if (isHidden) {
            return;
        }
        for (const entry of entries) {
            if (!entry.isAwaitingReveal) {
                continue;
            }
            entries.delete(entry);
            entry.release();
        }
    }, [entries, isHidden]);

    useEffect(
        () => () => {
            for (const entry of entries) {
                entry.release();
            }
            entries.clear();
        },
        [entries],
    );

    return <ScreenActivityEffectBoundaryContext.Provider value={boundary}>{children}</ScreenActivityEffectBoundaryContext.Provider>;
}

export default ScreenActivityEffectBoundaryContext;
export {createScreenActivityEffectEntry, ScreenActivityEffectBoundaryProvider};
export type {ScreenActivityEffectBoundary, ScreenActivityEffectEntry};
