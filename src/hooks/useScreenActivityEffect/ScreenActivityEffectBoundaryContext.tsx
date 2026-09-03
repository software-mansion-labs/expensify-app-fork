import type {DependencyList, EffectCallback, ReactNode} from 'react';

import React, {createContext, useContext, useEffect, useLayoutEffect, useState} from 'react';

/** The live setup of one call site of useScreenActivityEffect, owned by the boundary from its first effect run on. */
type ScreenActivityEffectEntry = {
    /** What the last run of the effect body returned. */
    cleanup: ReturnType<EffectCallback>;

    /** The dependencies that setup was run with, so a re-run after a hide can tell whether it is the same work. */
    deps: DependencyList | undefined;

    /** Whether a hide skipped this cleanup, which the reveal answers by running the body again or by not running it. */
    isAwaitingReveal: boolean;

    /** Runs the live cleanup and forgets it, so the call site and the boundary can both ask for the release. */
    release: () => void;

    /** Runs the setup and keeps what it returned together with the dependencies it ran for. */
    setUp: (setup: EffectCallback, deps: DependencyList | undefined) => void;
};

/** The release and setup one call site owes a reveal, queued so the boundary can run the whole subtree in phases. */
type ScreenActivityRevealWork = {
    setup: EffectCallback;
    deps: DependencyList | undefined;
};

function createScreenActivityEffectEntry(): ScreenActivityEffectEntry {
    const entry: ScreenActivityEffectEntry = {
        cleanup: undefined,
        deps: undefined,
        isAwaitingReveal: false,
        release: () => {
            const {cleanup} = entry;
            entry.cleanup = undefined;
            entry.deps = undefined;
            entry.isAwaitingReveal = false;
            cleanup?.();
        },
        setUp: (setup, deps) => {
            entry.cleanup = setup();
            entry.deps = deps;
        },
    };
    return entry;
}

/** Releases the entries given, takes them out of the set, and collects instead of throwing, so a batch can go on. */
function releaseEntriesIntoErrors(entries: Set<ScreenActivityEffectEntry>, released: readonly ScreenActivityEffectEntry[], errors: unknown[]): void {
    for (const entry of released) {
        entries.delete(entry);
        try {
            entry.release();
        } catch (error) {
            errors.push(error);
        }
    }
}

/**
 * What a batch does with the errors it collected. React reports every error a teardown hits and still runs the rest of
 * the work, so the first error is rethrown where React would have put it and the others are reported directly, rather
 * than being swallowed by the one that came first.
 */
function throwFirstAndReportRest(errors: readonly unknown[]): void {
    for (const error of errors.slice(1)) {
        console.error(error);
    }
    if (errors.length > 0) {
        throw errors.at(0);
    }
}

/** Releases the entries given and takes them out of the set, reporting every failure and rethrowing the first. */
function releaseEntries(entries: Set<ScreenActivityEffectEntry>, released: readonly ScreenActivityEffectEntry[]): void {
    const errors: unknown[] = [];
    releaseEntriesIntoErrors(entries, released, errors);
    throwFirstAndReportRest(errors);
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

    /**
     * Takes over the release and setup of a call site for the reveal commit, so the boundary can run every release of
     * the subtree before any setup, exactly as the phases of one commit run on a live screen. The work travels to the
     * highest boundary with a reveal under way, because that is the one whose drain runs after everything below it,
     * including the sweep of what a boundary between them left behind. Outside the reveal commit it takes nothing and
     * answers false, and the call site runs its work inline.
     */
    deferRevealWork: (entry: ScreenActivityEffectEntry, setup: EffectCallback, deps: DependencyList | undefined) => boolean;

    /**
     * Whether this commit reveals this boundary or one above it. Every boundary inside a revealing <Activity> runs its
     * effects again in that commit, so each one batches the work of its own subtree in its own drain, and a body that
     * registers anywhere below counts as evidence for all of them.
     */
    getIsInRevealCommit: () => boolean;

    /**
     * Releases every entry whose cleanup a cover skipped and which no body claimed back, after asking the boundary
     * above to do the same. A body registering is the evidence that the subtree is live again, so the entries still
     * marked belong to components that are gone. It is for commits outside a reveal: in the reveal commit the bodies
     * that are still there have not all registered yet when the first one arrives, and the drain sweeps after all ran.
     */
    releaseRemoved: () => void;
};

/** What the provider drives from its effects, which no call site of the hook gets to see. */
type ScreenActivityEffectBoundaryLifecycle = {
    /** Records the mode of the commit. A change from hidden to visible marks the commit as the reveal. */
    syncMode: (isHidden: boolean) => void;

    /** Marks the cleanups of the commit as belonging to the screen, which is the unmount of the boundary. */
    startTeardown: () => void;

    /** Runs the phases of the reveal commit, after every effect of the subtree ran. Does nothing in any other commit. */
    drain: () => void;

    /** Attaches the boundary to the one above it, or to nothing, and answers with the release of what it holds. */
    attach: () => () => void;
};

/**
 * One boundary and everything it holds, created once per provider instance so that the context value never changes
 * and a nested boundary keeps the same parent for its whole life. A boundary of a nested navigator renders inside the
 * <Activity> of the screen holding it, so the same commit that hides that screen unmounts this boundary, and its own
 * unmount therefore says nothing about the screen its effects belong to. Handing the whole set to the boundary above as
 * one entry moves that decision to the only boundary that can make it.
 */
function createBoundary(parent: ScreenActivityEffectBoundary | null, isHidden: boolean): ScreenActivityEffectBoundary & ScreenActivityEffectBoundaryLifecycle {
    const entries = new Set<ScreenActivityEffectEntry>();
    const revealQueue = new Map<ScreenActivityEffectEntry, ScreenActivityRevealWork>();
    let isScreenTeardown = false;
    let isRevealPending = false;
    let hasRegisteredInReveal = false;
    let wasHidden = isHidden;

    const nestedEntry: ScreenActivityEffectEntry = {
        cleanup: undefined,
        deps: undefined,
        isAwaitingReveal: false,
        setUp: () => {},
        // The whole set is what this entry releases, and it stays able to release it however often it is asked, because
        // the boundary above can ask on a reveal it was not swept by and again when its own screen leaves the stack.
        release: () => {
            nestedEntry.isAwaitingReveal = false;
            releaseEntries(entries, [...entries]);
        },
    };

    const awaitingReveal = () => [...entries].filter((entry) => entry.isAwaitingReveal);

    const boundary: ScreenActivityEffectBoundary & ScreenActivityEffectBoundaryLifecycle = {
        register: (entry) => {
            if (__DEV__ && isScreenTeardown) {
                // A body only runs for a subtree React is rendering, so a body arriving while the flag reports a
                // hidden screen means isHidden no longer describes the <Activity> this boundary wraps.
                console.error(
                    '[useScreenActivityEffect] The boundary reports a hidden screen while its subtree is running effects. isHidden has drifted from the mode of the <Activity> it wraps.',
                );
            }
            entries.add(entry);
            if (boundary.getIsInRevealCommit()) {
                hasRegisteredInReveal = true;
                return;
            }
            boundary.releaseRemoved();
        },
        unregister: (entry) => {
            entries.delete(entry);
        },
        getIsScreenTeardown: () => isScreenTeardown,
        deferRevealWork: (entry, setup, deps) => {
            // The boundary above goes first, so the work of the whole tree gathers in the highest one revealing.
            if (parent !== null && parent.deferRevealWork(entry, setup, deps)) {
                return true;
            }
            if (!isRevealPending) {
                return false;
            }
            revealQueue.set(entry, {setup, deps});
            return true;
        },
        getIsInRevealCommit: () => isRevealPending || (parent?.getIsInRevealCommit() ?? false),
        releaseRemoved: () => {
            // The boundary above goes first, so the entry it holds for a nested screen that went away releases before
            // anything of the new subtree sets up, and a body running anywhere below is evidence for it as well.
            parent?.releaseRemoved();
            releaseEntries(entries, awaitingReveal());
        },

        syncMode: (isHiddenNow) => {
            // A change from hidden to visible starts a reveal, whose deferred work the drain runs in phases. The mark
            // lives for that one commit only: the drain clears it, so work landing in any later commit runs inline.
            if (wasHidden && !isHiddenNow) {
                isRevealPending = true;
            }
            wasHidden = isHiddenNow;
            isScreenTeardown = isHiddenNow;
        },
        startTeardown: () => {
            isScreenTeardown = true;
        },
        // The phases mirror one commit of a live screen: first the entries whose cleanup the hide skipped and which did
        // not come back, because they belong to components that are gone, then every release the queue holds, then
        // every setup, so no call site of the reveal acquires before another one has released. A body that did not come
        // back is only evidence of a removal once some body did come back, because a commit that ran no effect of the
        // subtree at all ran none for the component that is still there either, which is what a <Suspense> below the
        // boundary does when it suspends again on the reveal.
        drain: () => {
            const isRevealCommit = boundary.getIsInRevealCommit();
            const hasRegistered = hasRegisteredInReveal;
            isRevealPending = false;
            hasRegisteredInReveal = false;
            if (!isRevealCommit || !hasRegistered) {
                return;
            }

            const errors: unknown[] = [];
            releaseEntriesIntoErrors(entries, awaitingReveal(), errors);

            const work = [...revealQueue];
            revealQueue.clear();
            for (const [entry] of work) {
                try {
                    entry.release();
                } catch (error) {
                    errors.push(error);
                }
            }
            for (const [entry, item] of work) {
                try {
                    entry.setUp(item.setup, item.deps);
                } catch (error) {
                    errors.push(error);
                }
            }
            throwFirstAndReportRest(errors);
        },
        // Who releases what is left over when this boundary goes away. A boundary of its own screen answers for itself:
        // its unmount is the screen leaving the navigation stack. A boundary inside the <Activity> of another screen
        // hands the set to the boundary above instead, which is the one that can tell its screen being covered from it
        // being popped.
        attach: () => {
            if (parent === null) {
                return () => {
                    if (__DEV__ && !wasHidden) {
                        // A visible screen only holds a mark for a component that was removed while it was hidden and
                        // whose release the sweep never got evidence for, so these cleanups ran far from their removal.
                        const deferredReleaseCount = awaitingReveal().length;
                        if (deferredReleaseCount > 0) {
                            console.debug(
                                `[useScreenActivityEffect] The screen leaves the stack holding ${deferredReleaseCount} cleanup(s) deferred since a removal behind a cover. They run now.`,
                            );
                        }
                    }
                    releaseEntries(entries, [...entries]);
                };
            }

            nestedEntry.isAwaitingReveal = false;
            parent.register(nestedEntry);
            return () => {
                if (parent.getIsScreenTeardown()) {
                    // The screen above is being covered or popped, and it is holding the entry for this whole set. The
                    // mark is what makes its reveal answer for this boundary exactly as it answers for a call site of
                    // its own: either the boundary comes back and clears the mark, or it does not and the sweep
                    // releases the set.
                    nestedEntry.isAwaitingReveal = true;
                    return;
                }
                parent.unregister(nestedEntry);
                releaseEntries(entries, [...entries]);
            };
        },
    };
    return boundary;
}

// Null means no boundary above this subtree, which is every screen that did not opt into <Activity>.
const ScreenActivityEffectBoundaryContext = createContext<ScreenActivityEffectBoundary | null>(null);

/**
 * Tells the effects of the subtree it covers whether a cleanup belongs to them, and owns the release of the ones that
 * are left over. It has to render outside the <Activity> it serves, because a component cannot observe its own hiding,
 * and because its own unmount is the only event that means the screen is really gone.
 *
 * The flags are set from a layout effect. React runs the whole layout phase of a commit before its passive phase, so
 * they are already set when the passive effects of the revealed or deleted subtree ask about them. The drain runs as a
 * passive effect of every commit, after every effect of the subtree, because the effect of a parent runs after the
 * effects of its children.
 */
function ScreenActivityEffectBoundaryProvider({isHidden, children}: {isHidden: boolean; children: ReactNode}) {
    const parent = useContext(ScreenActivityEffectBoundaryContext);
    const [boundary] = useState(() => createBoundary(parent, isHidden));

    useLayoutEffect(() => {
        boundary.syncMode(isHidden);
        // The setup above runs again right after this cleanup for a change of isHidden, which leaves the flag true only
        // when no setup follows, and that is the unmount of the boundary.
        return boundary.startTeardown;
    }, [boundary, isHidden]);

    useEffect(() => {
        boundary.drain();
    });

    useEffect(() => boundary.attach(), [boundary]);

    return <ScreenActivityEffectBoundaryContext.Provider value={boundary}>{children}</ScreenActivityEffectBoundaryContext.Provider>;
}

export default ScreenActivityEffectBoundaryContext;
export {createScreenActivityEffectEntry, ScreenActivityEffectBoundaryProvider, throwFirstAndReportRest};
export type {ScreenActivityEffectBoundary, ScreenActivityEffectEntry};
