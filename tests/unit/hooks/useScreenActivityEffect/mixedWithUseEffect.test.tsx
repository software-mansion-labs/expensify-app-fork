import useScreenActivityEffect from '@hooks/useScreenActivityEffect';

import type {ComponentType} from 'react';

import React, {useEffect} from 'react';

import type {Step} from '../../../utils/ScreenActivityEffectTestUtils';

import {ActivityScreen, hidden, KeptEffect, PlainEffect, record, resetLog, track, visible} from '../../../utils/ScreenActivityEffectTestUtils';

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
    const screen = (step: Step) => <ActivityScreen isHidden={step.isHidden}>{step.children}</ActivityScreen>;
    return record(steps.map(screen));
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

        // Then the cover and the reveal only ever touch the plain effect
        expect(commits).toEqual([['setup:plain:a', 'setup:kept:a'], ['cleanup:plain:a'], ['setup:plain:a'], ['cleanup:kept:a', 'cleanup:plain:a']]);
    });

    it('runs a dependency change that landed while hidden on the reveal for both call sites', () => {
        // Given the same component, with its dependency changing behind the cover
        const steps = [visible(<MixedEffects value="a" />), hidden(<MixedEffects value="a" />), hidden(<MixedEffects value="b" />), visible(<MixedEffects value="b" />)];

        // When the screen is revealed
        const commits = recordCovered(steps);

        // Then both end up live for the new dependency, the plain one by mounting and the kept one by re-running
        expect(commits).toEqual([['setup:plain:a', 'setup:kept:a'], ['cleanup:plain:a'], [], ['setup:plain:b', 'cleanup:kept:a', 'setup:kept:b'], ['cleanup:kept:b', 'cleanup:plain:b']]);
    });

    it('holds the kept call site of a component removed while hidden until an effect of the screen runs again', () => {
        // Given a component that goes away behind the cover, so only one of its two effects is still held
        const steps = [visible(<MixedEffects value="a" />), hidden(<MixedEffects value="a" />), hidden(null), visible(null), visible(<MixedEffects value="b" />)];

        // When the screen is revealed empty and another component mounts on it afterwards
        const commits = recordCovered(steps);

        // Then only a kept call site running again is evidence that a body which did not come back is really gone, so
        // the reveal of an empty screen sweeps nothing and the mount that follows releases what the cover left alone
        expect(commits).toEqual([['setup:plain:a', 'setup:kept:a'], ['cleanup:plain:a'], [], [], ['setup:plain:b', 'setup:kept:b', 'cleanup:kept:a'], ['cleanup:kept:b', 'cleanup:plain:b']]);
    });

    it('does not treat a plain effect on the reveal as evidence that a kept call site was removed', () => {
        // Given a mixed screen whose last kept call site is removed behind the cover while a plain sibling remains
        const steps = [visible(<MixedSiblings value="a" />), hidden(<MixedSiblings value="a" />), hidden(<PlainEffect value="a" />), visible(<PlainEffect value="a" />)];

        // When the plain sibling runs its setup on the reveal but no kept call site registers with the boundary
        const commits = recordCovered(steps);

        // Then the boundary holds the removed setup until the screen leaves the stack, because a plain effect is not
        // evidence that the part of the screen owning a kept call site was able to run
        expect(commits).toEqual([['setup:plain:a', 'setup:kept:a'], ['cleanup:plain:a'], [], ['setup:plain:a'], ['cleanup:kept:a', 'cleanup:plain:a']]);
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
