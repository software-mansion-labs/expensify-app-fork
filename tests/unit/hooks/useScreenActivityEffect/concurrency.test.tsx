import {act, render} from '@testing-library/react-native';

import useScreenActivityEffect from '@hooks/useScreenActivityEffect';

import type {ComponentType, ReactNode} from 'react';

import React, {startTransition, Suspense, use, useEffect} from 'react';

import type {AnyEffectHook, ScreenProps} from '../../../utils/ScreenActivityEffectTestUtils';

import {ActivityScreen, AnyEffectHookProvider, drainLog, LiveScreen, log, resetLog, Subject, track, useAnyEffect} from '../../../utils/ScreenActivityEffectTestUtils';

/**
 * Every other suite here flushes each commit before the next one. These tests are the ones where a commit does not
 * finish when it starts: a subtree below the boundary that suspends, and a cover or a reveal that lands in a transition.
 * A reveal which does not run the body of a component the cover left alone is the one thing the boundary cannot tell
 * from a component that went away, and <Suspense> is how a real screen gets there.
 */

type Resource = {promise: Promise<void>; resolve: () => void};

/** A promise the test resolves by hand, which is what makes a component below the boundary suspend on demand. */
function createResource(): Resource {
    let resolve = () => {};
    const promise = new Promise<void>((resolvePromise) => {
        resolve = () => resolvePromise();
    });
    return {promise, resolve};
}

/** The fallback of the Suspense, whose own effect is the evidence in the log that the subtree really suspended. */
function FallbackMarker() {
    useEffect(() => {
        log('fallback');
        return () => log('resumed');
    }, []);
    return null;
}

/** An effect whose own component suspends for as long as the resource it was given is pending. */
function SuspendingSubject({pending}: {pending?: Resource}) {
    if (pending) {
        use(pending.promise);
    }
    useAnyEffect(track('s:a'), []);
    return null;
}

/** An effect next to the Suspense, which is the part of the screen a reveal runs while the other part suspends. */
function Sibling() {
    useAnyEffect(track('sibling:a'), []);
    return null;
}

/**
 * Covers the screen, makes the resource of the component below it go pending behind the cover, reveals the screen onto
 * the fallback, resolves the resource and pops the screen. Every step is flushed before the next, because a commit that
 * suspends finishes in a later task than the call that started it.
 */
async function run(hook: AnyEffectHook, Screen: ComponentType<ScreenProps>, content: (pending?: Resource) => ReactNode) {
    resetLog();
    const resource = createResource();
    const tree = (isScreenHidden: boolean, pending?: Resource) => (
        <AnyEffectHookProvider hook={hook}>
            <Screen isHidden={isScreenHidden}>{content(pending)}</Screen>
        </AnyEffectHookProvider>
    );

    const {rerender, unmount} = render(tree(false));
    const commits: string[][] = [];

    const step = async (mutate?: () => void) => {
        // The mutation runs inside act, because a commit that suspends finishes in a later task than the call.
        await act(async () => {
            mutate?.();
        });
        commits.push(drainLog());
    };

    // The mount is flushed like every other step, because the first render of the screen can suspend too.
    await step();
    await step(() => rerender(tree(true)));
    await step(() => rerender(tree(true, resource)));
    await step(() => rerender(tree(false, resource)));
    await step(() => resource.resolve());
    await step(() => unmount());

    return commits;
}

describe('useScreenActivityEffect in a commit that does not finish at once', () => {
    beforeEach(() => {
        resetLog();
    });

    it('keeps the setup live when the cover and the reveal land in a transition', async () => {
        // Given a screen covered and revealed at the priority navigation gives its own updates
        const tree = (isScreenHidden: boolean) => (
            <AnyEffectHookProvider hook={useScreenActivityEffect}>
                <ActivityScreen isHidden={isScreenHidden}>
                    <Subject value="a" />
                </ActivityScreen>
            </AnyEffectHookProvider>
        );

        const {rerender, unmount} = render(tree(false));
        const commits: string[][] = [];
        const step = async (mutate?: () => void) => {
            await act(async () => {
                startTransition(() => mutate?.());
            });
            commits.push(drainLog());
        };

        // When each of those commits is a transition rather than a synchronous update
        await step();
        await step(() => rerender(tree(true)));
        await step(() => rerender(tree(false)));
        await step(() => unmount());

        // Then the boundary answers exactly as it does for a synchronous cover and reveal
        expect(commits).toEqual([['setup:s:a'], [], [], ['cleanup:s:a']]);
    });

    it('keeps the setup of a component that suspends again on the reveal', async () => {
        // Given a component whose resource goes pending behind the cover, so the reveal renders the fallback for it
        const content = (pending?: Resource) => (
            <Suspense fallback={<FallbackMarker />}>
                <SuspendingSubject pending={pending} />
            </Suspense>
        );

        // When the screen is revealed onto the fallback and the resource resolves afterwards
        const live = await run(useEffect, LiveScreen, content);
        const activity = await run(useScreenActivityEffect, ActivityScreen, content);

        // Then the live screen keeps the setup through the suspension, and the fallback shows that it really suspended
        expect(live).toEqual([['setup:s:a'], [], ['fallback'], [], ['resumed'], ['cleanup:s:a']]);

        // And the covered screen keeps it too, because a reveal that ran no effect of the subtree sweeps nothing
        expect(activity).toEqual([['setup:s:a'], [], [], ['fallback'], ['resumed'], ['cleanup:s:a']]);
        expect(activity.flat()).toEqual(live.flat());
    });

    it('releases the setup of a suspended component when another part of the screen ran on the reveal', async () => {
        // Given the same suspension next to a component that is not suspended and runs its own effect on the reveal
        const content = (pending?: Resource) => (
            <>
                <Suspense fallback={<FallbackMarker />}>
                    <SuspendingSubject pending={pending} />
                </Suspense>
                <Sibling />
            </>
        );

        // When the screen is revealed while one of its two parts is suspended
        const live = await run(useEffect, LiveScreen, content);
        const activity = await run(useScreenActivityEffect, ActivityScreen, content);

        expect(live).toEqual([['setup:s:a', 'setup:sibling:a'], [], ['fallback'], [], ['resumed'], ['cleanup:s:a', 'cleanup:sibling:a']]);

        // Then the effect of the suspended part is released and set up again, because the reveal proved that bodies run
        // and the body of a component that is gone reads exactly like the body of one that is suspended. Nothing tells
        // them apart: React never reports the deletion of a component inside a hidden subtree.
        expect(activity).toEqual([['setup:s:a', 'setup:sibling:a'], [], [], ['fallback', 'cleanup:s:a'], ['resumed', 'setup:s:a'], ['cleanup:sibling:a', 'cleanup:s:a']]);

        // And the teardown releases the two in the order they registered in, the suspended one having registered last
        expect(activity.at(-1)).toEqual([...(live.at(-1) ?? [])].reverse());
    });
});
