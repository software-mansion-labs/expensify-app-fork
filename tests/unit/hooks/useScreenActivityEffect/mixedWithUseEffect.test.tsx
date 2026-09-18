import useScreenActivityEffect from '@hooks/useScreenActivityEffect';

import type {ComponentType} from 'react';

import React, {useEffect} from 'react';

import type {RenderStep, Step} from '../../../utils/ScreenActivityEffectTestUtils';

import {ActivityScreen, hidden, isLeafStep, KeptEffect, leaf, Leaf, PlainEffect, record, resetLog, track, visible} from '../../../utils/ScreenActivityEffectTestUtils';

/**
 * A screen that is being migrated runs both hooks at once, either in one component or across its components, so these
 * tests cover what a cover does to a subtree where only some of the effects are meant to survive it. The calls named
 * 'plain' come from useEffect and churn on every cover and reveal, and the ones named 'kept' do not.
 */

/** One component on both hooks, which is what a component looks like halfway through a migration. */
function MixedEffects({value}: {value: string}) {
    useEffect(() => track(`plain:${value}`)(), [value]);
    useScreenActivityEffect(() => track(`kept:${value}`)(), [value]);
    return null;
}

/** The two hooks as siblings instead, which is what a screen looks like halfway through a migration. */
function MixedSiblings({value}: {value: string}) {
    return (
        <>
            <PlainEffect value={value} />
            <KeptEffect value={value} />
        </>
    );
}

/** The steps on a screen wrapped in an <Activity>, because the components above pick their hook themselves. */
function recordCovered(steps: readonly Step[]): string[][] {
    const screen = (step: RenderStep) => <ActivityScreen isHidden={step.isHidden}>{step.children}</ActivityScreen>;
    return record(steps.map((step) => (isLeafStep(step) ? step : screen(step))));
}

describe('useScreenActivityEffect mixed with useEffect', () => {
    beforeEach(() => {
        resetLog();
    });

    it('releases only the useEffect call site on a cover and sets only that one up again on a reveal', () => {
        // Given a component whose two effects differ only in the hook they were written with
        const steps = [visible(<MixedEffects value="a" />), hidden(<MixedEffects value="a" />), visible(<MixedEffects value="a" />)];

        // When the screen is covered, revealed, and finally leaves the stack
        const commits = recordCovered(steps);

        // Then the cover and the reveal only ever touch the plain effect, and the pop releases both in tree order
        expect(commits).toEqual([['setup:plain:a', 'setup:kept:a'], ['cleanup:plain:a'], ['setup:plain:a'], ['cleanup:plain:a', 'cleanup:kept:a']]);
    });

    it('runs a dependency change that landed while hidden on the reveal for both call sites', () => {
        // Given the same component, with its dependency changing behind the cover
        const steps = [visible(<MixedEffects value="a" />), hidden(<MixedEffects value="a" />), hidden(<MixedEffects value="b" />), visible(<MixedEffects value="b" />)];

        // When the screen is revealed
        const commits = recordCovered(steps);

        // Then both end up live for the new dependency, the plain one by mounting and the kept one by re-running
        expect(commits).toEqual([['setup:plain:a', 'setup:kept:a'], ['cleanup:plain:a'], [], ['setup:plain:b', 'cleanup:kept:a', 'setup:kept:b'], ['cleanup:plain:b', 'cleanup:kept:b']]);
    });

    it('releases the kept call site of a component removed while hidden on the reveal', () => {
        // Given a component that goes away behind the cover, so only one of its two effects is still held
        const steps = [
            visible(
                <Leaf>
                    <MixedEffects value="a" />
                </Leaf>,
            ),
            hidden(
                <Leaf>
                    <MixedEffects value="a" />
                </Leaf>,
            ),
            hidden(<Leaf>{null}</Leaf>),
            visible(<Leaf>{null}</Leaf>),
            leaf(<MixedEffects value="b" />),
        ];

        // When the screen is revealed empty and another component mounts on it afterwards from state inside the screen
        const commits = recordCovered(steps);

        // Then the reveal releases the kept call site the cover left alone, because the removal reached the boundary
        // through the insertion cleanup, and the mount that follows finds nothing pending
        expect(commits).toEqual([['setup:plain:a', 'setup:kept:a'], ['cleanup:plain:a'], [], ['cleanup:kept:a'], ['setup:plain:b', 'setup:kept:b'], ['cleanup:plain:b', 'cleanup:kept:b']]);
    });

    it('releases a kept call site removed while hidden on a reveal that runs plain effects only', () => {
        // Given a mixed screen whose last kept call site is removed behind the cover while a plain sibling remains
        const steps = [visible(<MixedSiblings value="a" />), hidden(<MixedSiblings value="a" />), hidden(<PlainEffect value="a" />), visible(<PlainEffect value="a" />)];

        // When the plain sibling runs its setup on the reveal and no kept call site runs at all
        const commits = recordCovered(steps);

        // Then the boundary releases the removed setup in that commit, after the plain setup, because the effects of
        // the subtree run before the drain of the boundary above them
        expect(commits).toEqual([['setup:plain:a', 'setup:kept:a'], ['cleanup:plain:a'], [], ['setup:plain:a', 'cleanup:kept:a'], ['cleanup:plain:a']]);
    });

    it('releases the kept call site when the screen leaves the stack while it is still covered', () => {
        // Given a covered screen that is popped without ever being revealed
        const steps = [visible(<MixedEffects value="a" />), hidden(<MixedEffects value="a" />)];

        // When the screen leaves the navigation stack
        const commits = recordCovered(steps);

        // Then the terminal release of the boundary runs the one cleanup the cover skipped
        expect(commits).toEqual([['setup:plain:a', 'setup:kept:a'], ['cleanup:plain:a'], ['cleanup:kept:a']]);
    });

    it('does not care whether the two hooks sit in one component or in two', () => {
        // Given the two hooks in one component, and then the very same two as siblings
        const cycle = (Subjects: ComponentType<{value: string}>) => [visible(<Subjects value="a" />), hidden(<Subjects value="a" />), visible(<Subjects value="a" />)];

        // When both screens go through a cover and reveal cycle and then leave the stack
        const oneComponent = recordCovered(cycle(MixedEffects));
        resetLog();
        const twoComponents = recordCovered(cycle(MixedSiblings));

        // Then the calls match, because the boundary holds one entry per call site rather than per component
        expect(twoComponents).toEqual(oneComponent);
    });
});
