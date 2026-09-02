import type {DependencyList, EffectCallback, ReactNode} from 'react';

import React, {createContext, useContext, useEffect, useLayoutEffect, useRef, useState} from 'react';

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

/** The release and setup one call site owes a reveal, queued so the boundary can run the whole subtree in phases. */
type ScreenActivityRevealWork = {
    entry: ScreenActivityEffectEntry;
    setup: EffectCallback;
    deps: DependencyList | undefined;
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

/**
 * The set of one boundary together with the entry the boundary above holds for it. A boundary of a nested navigator
 * renders inside the <Activity> of the screen holding it, so the same commit that hides that screen unmounts this
 * boundary, and its own unmount therefore says nothing about the screen its effects belong to. Handing the whole set to
 * the boundary above as one entry moves that decision to the only boundary that can make it.
 */
function createBoundaryState() {
    const entries = new Set<ScreenActivityEffectEntry>();
    const revealQueue = new Map<ScreenActivityEffectEntry, ScreenActivityRevealWork>();
    const nestedEntry: ScreenActivityEffectEntry = {
        cleanup: undefined,
        deps: undefined,
        isSetUp: false,
        isAwaitingReveal: false,
        // The whole set is what this entry releases, and it stays able to release it however often it is asked, because
        // the boundary above can ask on a reveal it was not swept by and again when its own screen leaves the stack.
        release: () => {
            nestedEntry.isAwaitingReveal = false;
            releaseEntries(entries, [...entries]);
        },
    };
    return {
        entries,
        revealQueue,
        nestedEntry,
        // The mark is set through this rather than in the boundary itself, because the boundary holds the entry in state
        // and the React Compiler treats what state holds as frozen.
        markNestedEntry: (isAwaitingReveal: boolean) => {
            nestedEntry.isAwaitingReveal = isAwaitingReveal;
        },
    };
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

// Null means no boundary above this subtree, which is every screen that did not opt into <Activity>.
const ScreenActivityEffectBoundaryContext = createContext<ScreenActivityEffectBoundary | null>(null);

/**
 * Tells the effects of the subtree it covers whether a cleanup belongs to them, and owns the release of the ones that
 * are left over. It has to render outside the <Activity> it serves, because a component cannot observe its own hiding,
 * and because its own unmount is the only event that means the screen is really gone.
 *
 * A boundary nested inside the <Activity> of another screen keeps the guarantee, because the boundary above holds its
 * whole set as one entry. It is the reason nothing here reads its own unmount as the end of the screen without asking
 * the boundary above first.
 *
 * The flags are layout effects. React runs the whole layout phase of a commit before its passive phase, so they are
 * already set when the passive effects of the revealed or deleted subtree ask about them. Everything else runs as a
 * passive effect, which is the phase the cleanups it runs were written for, and which for a deletion still comes
 * before the passive cleanups of the subtree.
 */
function ScreenActivityEffectBoundaryProvider({isHidden, children}: {isHidden: boolean; children: ReactNode}) {
    const parent = useContext(ScreenActivityEffectBoundaryContext);
    const [{entries, revealQueue, nestedEntry, markNestedEntry}] = useState(createBoundaryState);
    const isScreenTeardownRef = useRef(false);
    const isRevealPendingRef = useRef(false);
    const hasRegisteredInRevealRef = useRef(false);
    const wasHiddenRef = useRef(isHidden);

    const boundary: ScreenActivityEffectBoundary = {
        register: (entry) => {
            if (__DEV__ && isScreenTeardownRef.current) {
                // A body only runs for a subtree React is rendering, so a body arriving while the flag reports a
                // hidden screen means isHidden no longer describes the <Activity> this boundary wraps.
                console.error(
                    '[useScreenActivityEffect] The boundary reports a hidden screen while its subtree is running effects. isHidden has drifted from the mode of the <Activity> it wraps.',
                );
            }
            entries.add(entry);
            if (boundary.getIsInRevealCommit()) {
                hasRegisteredInRevealRef.current = true;
                return;
            }
            boundary.releaseRemoved();
        },
        unregister: (entry) => {
            entries.delete(entry);
        },
        getIsScreenTeardown: () => isScreenTeardownRef.current,
        deferRevealWork: (entry, setup, deps) => {
            // The boundary above goes first, so the work of the whole tree gathers in the highest one revealing.
            if (parent !== null && parent.deferRevealWork(entry, setup, deps)) {
                return true;
            }
            if (!isRevealPendingRef.current) {
                return false;
            }
            revealQueue.set(entry, {entry, setup, deps});
            return true;
        },
        getIsInRevealCommit: () => isRevealPendingRef.current || (parent?.getIsInRevealCommit() ?? false),
        releaseRemoved: () => {
            // The boundary above goes first, so the entry it holds for a nested screen that went away releases before
            // anything of the new subtree sets up, and a body running anywhere below is evidence for it as well.
            parent?.releaseRemoved();
            releaseEntries(
                entries,
                [...entries].filter((entry) => entry.isAwaitingReveal),
            );
        },
    };

    useLayoutEffect(() => {
        // A change from hidden to visible starts a reveal, whose deferred work the drain below runs in phases. The
        // mark lives for that one commit only: the drain clears it, so work landing in any later commit runs inline,
        // exactly as it does on a live screen once a suspended subtree resolves.
        if (wasHiddenRef.current && !isHidden) {
            isRevealPendingRef.current = true;
        }
        wasHiddenRef.current = isHidden;
        isScreenTeardownRef.current = isHidden;
        // The setup above runs again right after this cleanup for a change of isHidden, which leaves the flag true only
        // when no setup follows, and that is the unmount of the boundary.
        return () => {
            isScreenTeardownRef.current = true;
        };
    }, [isHidden]);

    // The drain of the reveal commit. It runs after every effect of the subtree, because the effect of a parent runs
    // after the effects of its children, so by now every call site that is still there has registered and queued what
    // it owes. The phases mirror one commit of a live screen: first the entries whose cleanup the hide skipped and
    // which did not come back, because they belong to components that are gone, then every release the queue holds,
    // then every setup, so no call site of the reveal acquires before another one has released.
    //
    // A body that did not come back is only evidence of a removal once some body did come back, because a commit that
    // ran no effect of the subtree at all ran none for the component that is still there either. That is what a
    // <Suspense> below the boundary does when it suspends again on the reveal, so a reveal that registered nothing
    // sweeps nothing, and the first body that registers afterwards sweeps for it through releaseRemoved. Nothing here
    // outlives the commit: the boundary renders in the reveal commit, and a commit a leaf starts is never one.
    useEffect(() => {
        const isRevealCommit = boundary.getIsInRevealCommit();
        const hasRegistered = hasRegisteredInRevealRef.current;
        isRevealPendingRef.current = false;
        hasRegisteredInRevealRef.current = false;
        if (!isRevealCommit || !hasRegistered) {
            return;
        }

        const errors: unknown[] = [];
        releaseEntriesIntoErrors(
            entries,
            [...entries].filter((entry) => entry.isAwaitingReveal),
            errors,
        );

        const work = [...revealQueue.values()];
        revealQueue.clear();
        for (const item of work) {
            try {
                item.entry.release();
            } catch (error) {
                errors.push(error);
            }
        }
        for (const item of work) {
            try {
                item.entry.cleanup = item.setup();
                item.entry.deps = item.deps;
                item.entry.isSetUp = true;
            } catch (error) {
                errors.push(error);
            }
        }
        throwFirstAndReportRest(errors);
    });

    // Who releases what is left over when this boundary goes away. A boundary of its own screen answers for itself: its
    // unmount is the screen leaving the navigation stack. A boundary inside the <Activity> of another screen hands the
    // set to the boundary above instead, which is the one that can tell its screen being covered from it being popped.
    useEffect(() => {
        if (parent === null) {
            return () => {
                if (__DEV__ && !wasHiddenRef.current) {
                    // A visible screen only holds a mark for a component that was removed while it was hidden and
                    // whose release the sweep never got evidence for, so these cleanups ran far from their removal.
                    const deferredReleaseCount = [...entries].filter((entry) => entry.isAwaitingReveal).length;
                    if (deferredReleaseCount > 0) {
                        console.debug(
                            `[useScreenActivityEffect] The screen leaves the stack holding ${deferredReleaseCount} cleanup(s) deferred since a removal behind a cover. They run now.`,
                        );
                    }
                }
                releaseEntries(entries, [...entries]);
            };
        }

        markNestedEntry(false);
        parent.register(nestedEntry);
        return () => {
            if (parent.getIsScreenTeardown()) {
                // The screen above is being covered or popped, and it is holding the entry for this whole set. The mark
                // is what makes its reveal answer for this boundary exactly as it answers for a call site of its own:
                // either the boundary comes back and clears the mark, or it does not and the sweep releases the set.
                markNestedEntry(true);
                return;
            }
            parent.unregister(nestedEntry);
            releaseEntries(entries, [...entries]);
        };
    }, [entries, markNestedEntry, nestedEntry, parent]);

    return <ScreenActivityEffectBoundaryContext.Provider value={boundary}>{children}</ScreenActivityEffectBoundaryContext.Provider>;
}

export default ScreenActivityEffectBoundaryContext;
export {createScreenActivityEffectEntry, ScreenActivityEffectBoundaryProvider};
export type {ScreenActivityEffectBoundary, ScreenActivityEffectEntry};
