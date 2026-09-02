import React, {useState} from 'react';

import {hidden, log, resetLog, runEveryConfig, track, useAnyEffect, visible} from '../../../utils/ScreenActivityEffectTestUtils';

/**
 * The hook keeps its own copy of the dependencies of the live setup, because a reveal has to tell a dependency change
 * that landed while the screen was hidden from the same work coming back. These tests hold that copy to what useEffect
 * does with the same dependency list.
 */

/** The mount-once effect, whose logged name comes from a value it reads without declaring it. */
function MountOnce({value}: {value: string}) {
    useAnyEffect(track(`s:${value}`), []);
    return null;
}

/** An effect that depends on a number, so a test can compare how the two hooks tell two numbers apart. */
function NumericDependency({dependency}: {dependency: number}) {
    useAnyEffect(track('s:a'), [dependency]);
    return null;
}

/** An effect whose dependency list changes size, which React itself warns about and only partly compares. */
function GrowingDependencies({first, hasSecond}: {first: string; hasSecond: boolean}) {
    useAnyEffect(track('s:a'), hasSecond ? [first, 'b'] : [first]);
    return null;
}

/** Two dependency lists that make every render a change: no list at all, and one holding a fresh object. */
function EveryRender({value}: {value: string}) {
    useAnyEffect(track(`noDeps:${value}`));
    useAnyEffect(track(`unstable:${value}`), [{}]);
    return null;
}

/** An effect that seeds its own component from its body, which is what makes a mount run two commits long. */
function StateWriter({value}: {value: string}) {
    const [step, setStep] = useState(0);
    useAnyEffect(() => {
        log(`setup:s:${value}(${step})`);
        if (step === 0) {
            setStep(1);
        }
        return () => log(`cleanup:s:${value}(${step})`);
    }, [step, value]);
    return null;
}

describe('useScreenActivityEffect dependencies', () => {
    beforeEach(() => {
        resetLog();
    });

    it('keeps a setup with an empty dependency list live through a cover and reveal cycle', () => {
        // Given a mount-once effect, which is the one a reveal would otherwise run a second time
        const steps = [visible(<MountOnce value="a" />), hidden(<MountOnce value="a" />), visible(<MountOnce value="a" />)];

        // When the screen is covered and revealed again
        const runs = runEveryConfig(steps);

        // Then it stays a mount-once effect, because an empty list is equal to the empty list of the reveal
        const expected = [['setup:s:a'], [], [], ['cleanup:s:a']];
        expect(runs.liveUseEffect).toEqual(expected);
        expect(runs.activityScreenActivityEffect).toEqual(expected);

        // And plain useEffect mounts once per reveal instead of once per screen
        expect(runs.activityUseEffect).toEqual([['setup:s:a'], ['cleanup:s:a'], ['setup:s:a'], ['cleanup:s:a']]);
    });

    it('compares the dependencies with Object.is, exactly as useEffect does', () => {
        // Given the two values whose identity is not their equality: NaN is itself, and minus zero is not zero
        const steps = [
            visible(<NumericDependency dependency={Number.NaN} />),
            hidden(<NumericDependency dependency={Number.NaN} />),
            visible(<NumericDependency dependency={Number.NaN} />),
            visible(<NumericDependency dependency={0} />),
            visible(<NumericDependency dependency={-0} />),
        ];

        // When the screen is covered and revealed with NaN, and the dependency then goes to zero and minus zero
        const runs = runEveryConfig(steps);

        // Then the reveal treats NaN as unchanged and the two zeros as a change, which is what React does
        const expected = [['setup:s:a'], [], [], ['cleanup:s:a', 'setup:s:a'], ['cleanup:s:a', 'setup:s:a'], ['cleanup:s:a']];
        expect(runs.liveUseEffect).toEqual(expected);
        expect(runs.activityScreenActivityEffect).toEqual(expected);
    });

    it('compares only the dependencies both lists have when the list changed size, exactly as useEffect does', () => {
        // Given a dependency list that grows while the screen is covered, which React only warns about
        const warning = jest.spyOn(console, 'error').mockImplementation(() => {});
        const steps = [
            visible(
                <GrowingDependencies
                    first="a"
                    hasSecond={false}
                />,
            ),
            hidden(
                <GrowingDependencies
                    first="a"
                    hasSecond={false}
                />,
            ),
            hidden(
                <GrowingDependencies
                    first="a"
                    hasSecond
                />,
            ),
            visible(
                <GrowingDependencies
                    first="a"
                    hasSecond
                />,
            ),
        ];

        // When the screen is revealed with the longer list
        const runs = runEveryConfig(steps);
        warning.mockRestore();

        // Then the size change alone runs nothing, because only the dependencies both lists have are compared
        const expected = [['setup:s:a'], [], [], [], ['cleanup:s:a']];
        expect(runs.liveUseEffect).toEqual(expected);
        expect(runs.activityScreenActivityEffect).toEqual(expected);
    });

    it('runs a dependency that changed together with the size of the list, exactly as useEffect does', () => {
        // Given a list that grows while the screen is covered and changes the dependency both lists have
        const warning = jest.spyOn(console, 'error').mockImplementation(() => {});
        const steps = [
            visible(
                <GrowingDependencies
                    first="a"
                    hasSecond={false}
                />,
            ),
            hidden(
                <GrowingDependencies
                    first="a"
                    hasSecond={false}
                />,
            ),
            hidden(
                <GrowingDependencies
                    first="b"
                    hasSecond
                />,
            ),
            visible(
                <GrowingDependencies
                    first="b"
                    hasSecond
                />,
            ),
        ];

        // When the screen is revealed with the longer list
        const runs = runEveryConfig(steps);
        warning.mockRestore();

        // Then the change of the shared dependency runs, so the size neither hides a change nor invents one
        expect(runs.liveUseEffect).toEqual([['setup:s:a'], [], ['cleanup:s:a', 'setup:s:a'], [], ['cleanup:s:a']]);
        expect(runs.activityScreenActivityEffect).toEqual([['setup:s:a'], [], [], ['cleanup:s:a', 'setup:s:a'], ['cleanup:s:a']]);
    });

    it('coalesces dependencies that change on every render into one run per reveal', () => {
        // Given an effect with no dependency list next to one holding a fresh object, so every render is a change
        const steps = [visible(<EveryRender value="a" />), hidden(<EveryRender value="a" />), hidden(<EveryRender value="a" />), visible(<EveryRender value="a" />)];

        // When two renders happen while the screen is covered
        const runs = runEveryConfig(steps);

        // Then a live screen runs both call sites for every one of those renders
        expect(runs.liveUseEffect).toEqual([
            ['setup:noDeps:a', 'setup:unstable:a'],
            ['cleanup:noDeps:a', 'cleanup:unstable:a', 'setup:noDeps:a', 'setup:unstable:a'],
            ['cleanup:noDeps:a', 'cleanup:unstable:a', 'setup:noDeps:a', 'setup:unstable:a'],
            ['cleanup:noDeps:a', 'cleanup:unstable:a', 'setup:noDeps:a', 'setup:unstable:a'],
            ['cleanup:noDeps:a', 'cleanup:unstable:a'],
        ]);

        // And the covered screen ran no effect for them, so the reveal is one release and one setup per call site,
        // every release running before any setup, which is how the phases of a live commit run
        expect(runs.activityScreenActivityEffect).toEqual([
            ['setup:noDeps:a', 'setup:unstable:a'],
            [],
            [],
            ['cleanup:noDeps:a', 'cleanup:unstable:a', 'setup:noDeps:a', 'setup:unstable:a'],
            ['cleanup:noDeps:a', 'cleanup:unstable:a'],
        ]);
    });

    it('keeps the values the surviving setup captured, exactly as the live screen does', () => {
        // Given a mount-once effect reading a value that changes twice while the screen is covered
        const steps = [visible(<MountOnce value="first" />), hidden(<MountOnce value="second" />), visible(<MountOnce value="third" />)];

        // When the screen is revealed
        const runs = runEveryConfig(steps);

        // Then the setup still holds the value of the render it ran for, because its body never ran again
        const expected = [['setup:s:first'], [], [], ['cleanup:s:first']];
        expect(runs.liveUseEffect).toEqual(expected);
        expect(runs.activityScreenActivityEffect).toEqual(expected);

        // And plain useEffect ran its body again on the reveal, so its live setup captured the value of that render
        expect(runs.activityUseEffect).toEqual([['setup:s:first'], ['cleanup:s:first'], ['setup:s:third'], ['cleanup:s:third']]);
    });

    it('runs a state update from the effect body once, exactly as the live screen does', () => {
        // Given an effect that seeds its component from its own body, so its mount takes two commits
        const steps = [visible(<StateWriter value="a" />), hidden(<StateWriter value="a" />), visible(<StateWriter value="a" />)];

        // When the screen is covered and revealed after the seeding is done
        const runs = runEveryConfig(steps);

        // Then the reveal does not seed a second time, because the dependency of the live setup is the state it wrote
        const expected = [['setup:s:a(0)', 'cleanup:s:a(0)', 'setup:s:a(1)'], [], [], ['cleanup:s:a(1)']];
        expect(runs.liveUseEffect).toEqual(expected);
        expect(runs.activityScreenActivityEffect).toEqual(expected);
    });
});
