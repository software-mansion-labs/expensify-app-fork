import {render} from '@testing-library/react-native';

import useScreenActivityEffect from '@hooks/useScreenActivityEffect';
import {ScreenActivityEffectBoundaryProvider} from '@hooks/useScreenActivityEffect/ScreenActivityEffectBoundaryContext';

import type {ComponentType, DependencyList, EffectCallback} from 'react';

import React, {Activity, useEffect} from 'react';

/**
 * Every test runs one scenario four times, once per configuration, and compares the effect calls commit by commit. The
 * configurations are the same structure on useEffect and on useScreenActivityEffect, each on a screen with no
 * <Activity> above it and on a screen wrapped in one:
 *
 * - liveUseEffect is the baseline, a screen that stays live in the background, which is the behavior
 *   useScreenActivityEffect promises to reproduce under a cover.
 * - liveScreenActivityEffect is the hook with no boundary above it, where it is plain useEffect.
 * - activityUseEffect is what the hook exists to avoid, so the tests of a hidden screen assert its divergence too.
 * - activityScreenActivityEffect is the hook doing its job.
 *
 * The last step of every scenario is the screen leaving the navigation stack, so each one also covers the teardown.
 */

type AnyEffectHook = (setup: EffectCallback, deps?: DependencyList) => void;

let log: string[] = [];

function drainLog(): string[] {
    const drained = log;
    log = [];
    return drained;
}

function trackedSetup(name: string, value: string, hasCleanup = true): EffectCallback {
    return () => {
        log.push(`setup:${name}:${value}`);
        if (!hasCleanup) {
            return undefined;
        }
        return () => {
            log.push(`cleanup:${name}:${value}`);
        };
    };
}

type SubjectProps = {
    /** useEffect or useScreenActivityEffect, which is the only difference between two runs of the same structure. */
    useAnyEffect: AnyEffectHook;

    /** What the effect calls of this component are named in the log. */
    id: string;

    /** The dependency of the effect, so a change of it is a dependency change. */
    value: string;
};

/** The second call site of Pair depends on its own value, which lets one of two effects of a component change alone. */
type PairSubjectProps = SubjectProps & {secondValue?: string};

function Single({useAnyEffect, id, value}: SubjectProps) {
    useAnyEffect(trackedSetup(id, value), [value]);
    return null;
}

function NoCleanup({useAnyEffect, id, value}: SubjectProps) {
    useAnyEffect(trackedSetup(id, value, false), [value]);
    return null;
}

function NoDeps({useAnyEffect, id, value}: SubjectProps) {
    useAnyEffect(trackedSetup(id, value));
    return null;
}

function Pair({useAnyEffect, id, value, secondValue = value}: PairSubjectProps) {
    useAnyEffect(trackedSetup(`${id}(1)`, value), [value]);
    useAnyEffect(trackedSetup(`${id}(2)`, secondValue), [secondValue]);
    return null;
}

function Nested({useAnyEffect, id, value}: SubjectProps) {
    useAnyEffect(trackedSetup(`${id}(parent)`, value), [value]);
    return (
        <Single
            useAnyEffect={useAnyEffect}
            id={`${id}(child)`}
            value={value}
        />
    );
}

const SUBJECTS = {single: Single, noCleanup: NoCleanup, noDeps: NoDeps, pair: Pair, nested: Nested};

type SubjectKind = keyof typeof SUBJECTS;

type SubjectSpec = {id: string; value: string; secondValue?: string; kind?: SubjectKind};

/** One rendered state of the screen: what it holds, and whether the <Activity> covers it. */
type ScreenState = {isHidden?: boolean; subjects: SubjectSpec[]};

/**
 * 'none' is the screen that stays live in the background, which never gets a boundary or an <Activity>. 'activity' is
 * the screen the wrapper builds, with the boundary outside the <Activity> it serves. 'nestedActivity' is that screen
 * inside another one, which is what a screen of a nested navigator gets.
 */
type Tree = 'none' | 'activity' | 'nestedActivity';

function Screen({useAnyEffect, tree, state}: {useAnyEffect: AnyEffectHook; tree: Tree; state: ScreenState}) {
    const content = state.subjects.map(({id, value, secondValue, kind = 'single'}) => {
        const SubjectComponent: ComponentType<PairSubjectProps> = SUBJECTS[kind];
        return (
            <SubjectComponent
                key={id}
                useAnyEffect={useAnyEffect}
                id={id}
                value={value}
                secondValue={secondValue}
            />
        );
    });

    if (tree === 'none') {
        return content;
    }

    const isHidden = state.isHidden ?? false;
    const mode = isHidden ? 'hidden' : 'visible';

    if (tree === 'nestedActivity') {
        return (
            <ScreenActivityEffectBoundaryProvider isHidden={isHidden}>
                <Activity mode={mode}>
                    <ScreenActivityEffectBoundaryProvider isHidden={false}>
                        <Activity mode="visible">{content}</Activity>
                    </ScreenActivityEffectBoundaryProvider>
                </Activity>
            </ScreenActivityEffectBoundaryProvider>
        );
    }

    return (
        <ScreenActivityEffectBoundaryProvider isHidden={isHidden}>
            <Activity mode={mode}>{content}</Activity>
        </ScreenActivityEffectBoundaryProvider>
    );
}

/** The effect calls of every step of the scenario, the last step being the screen leaving the navigation stack. */
function runScenario(useAnyEffect: AnyEffectHook, tree: Tree, states: readonly ScreenState[]): string[][] {
    const screen = (state: ScreenState) => (
        <Screen
            useAnyEffect={useAnyEffect}
            tree={tree}
            state={state}
        />
    );

    const [first, ...rest] = states;
    const {rerender, unmount} = render(screen(first));
    const steps = [drainLog()];

    for (const state of rest) {
        rerender(screen(state));
        steps.push(drainLog());
    }

    unmount();
    steps.push(drainLog());

    return steps;
}

function runEveryConfig(states: readonly ScreenState[]) {
    return {
        liveUseEffect: runScenario(useEffect, 'none', states),
        liveScreenActivityEffect: runScenario(useScreenActivityEffect, 'none', states),
        activityUseEffect: runScenario(useEffect, 'activity', states),
        activityScreenActivityEffect: runScenario(useScreenActivityEffect, 'activity', states),
    };
}

function runNestedActivity(states: readonly ScreenState[]): string[][] {
    return runScenario(useScreenActivityEffect, 'nestedActivity', states);
}

type Runs = ReturnType<typeof runEveryConfig>;

/** All four configurations run the scenario identically, which is the claim for every scenario that never hides. */
function expectEveryConfigToMatch(runs: Runs, expected: string[][]) {
    expect(runs.liveUseEffect).toEqual(expected);
    expect(runs.liveScreenActivityEffect).toEqual(expected);
    expect(runs.activityUseEffect).toEqual(expected);
    expect(runs.activityScreenActivityEffect).toEqual(expected);
}

function spec(id: string, value: string, extra: Partial<SubjectSpec> = {}): SubjectSpec {
    return {id, value, ...extra};
}

function visible(...subjects: SubjectSpec[]): ScreenState {
    return {isHidden: false, subjects};
}

function hidden(...subjects: SubjectSpec[]): ScreenState {
    return {isHidden: true, subjects};
}

const SCENARIOS = {
    lifecycle: [visible(spec('s', 'a')), visible(spec('s', 'b')), visible(), visible(spec('s', 'c'))],

    siblingsWhileVisible: [visible(spec('s1', 'a'), spec('s2', 'a')), visible(spec('s1', 'b'), spec('s2', 'b')), visible()],

    nestedWhileVisible: [visible(spec('n', 'a', {kind: 'nested'})), visible(spec('n', 'b', {kind: 'nested'})), visible()],

    pairWhileVisible: [visible(spec('p', 'a', {kind: 'pair'})), visible(spec('p', 'b', {kind: 'pair'})), visible()],

    siblingsScreenUnmount: [visible(spec('s1', 'a'), spec('s2', 'a'))],

    pairScreenUnmount: [visible(spec('p', 'a', {kind: 'pair'}))],

    nestedScreenUnmount: [visible(spec('n', 'a', {kind: 'nested'}))],

    prependSiblingWhileVisible: [visible(spec('s1', 'a')), visible(spec('s0', 'a'), spec('s1', 'a'))],

    coverAndReveal: [visible(spec('s', 'a')), hidden(spec('s', 'a')), visible(spec('s', 'a'))],

    twoCoverAndRevealCycles: [visible(spec('s', 'a')), hidden(spec('s', 'a')), visible(spec('s', 'a')), hidden(spec('s', 'a')), visible(spec('s', 'a'))],

    coverWithoutReveal: [visible(spec('s', 'a')), hidden(spec('s', 'a'))],

    coverAndRevealWithoutCleanup: [visible(spec('s', 'a', {kind: 'noCleanup'})), hidden(spec('s', 'a', {kind: 'noCleanup'})), visible(spec('s', 'a', {kind: 'noCleanup'}))],

    coverAndRevealWithoutDeps: [
        visible(spec('s', 'a', {kind: 'noDeps'})),
        hidden(spec('s', 'a', {kind: 'noDeps'})),
        hidden(spec('s', 'a', {kind: 'noDeps'})),
        visible(spec('s', 'a', {kind: 'noDeps'})),
    ],

    depsChangeWhileHidden: [visible(spec('s', 'a')), hidden(spec('s', 'a')), hidden(spec('s', 'b')), visible(spec('s', 'b'))],

    depsChangeOnCover: [visible(spec('s', 'a')), hidden(spec('s', 'b')), visible(spec('s', 'b'))],

    depsChangeOnReveal: [visible(spec('s', 'a')), hidden(spec('s', 'a')), visible(spec('s', 'b'))],

    depsChangeUndoneWhileHidden: [visible(spec('s', 'a')), hidden(spec('s', 'a')), hidden(spec('s', 'b')), hidden(spec('s', 'a')), visible(spec('s', 'a'))],

    mountedHidden: [hidden(spec('s', 'a')), visible(spec('s', 'a'))],

    mountWhileHidden: [visible(), hidden(), hidden(spec('s', 'a')), visible(spec('s', 'a'))],

    mountAndRemoveWhileHidden: [visible(), hidden(), hidden(spec('s', 'a')), hidden(), visible()],

    removeWhileVisible: [visible(spec('s', 'a')), visible()],

    removeAfterCoverAndReveal: [visible(spec('s', 'a')), hidden(spec('s', 'a')), visible(spec('s', 'a')), visible()],

    removeOnReveal: [visible(spec('s', 'a')), hidden(spec('s', 'a')), visible()],

    removeWhileHidden: [visible(spec('s', 'a')), hidden(spec('s', 'a')), hidden(), visible()],

    removeWhileHiddenWithoutReveal: [visible(spec('s', 'a')), hidden(spec('s', 'a')), hidden()],

    removeOneSiblingWhileHidden: [visible(spec('s1', 'a'), spec('s2', 'a')), hidden(spec('s1', 'a'), spec('s2', 'a')), hidden(spec('s1', 'a')), visible(spec('s1', 'a'))],

    removeOneSiblingWhileHiddenWithoutReveal: [visible(spec('s1', 'a'), spec('s2', 'a')), hidden(spec('s1', 'a'), spec('s2', 'a')), hidden(spec('s1', 'a'))],

    remountWhileHidden: [visible(spec('s', 'a')), hidden(spec('s', 'a')), hidden(), hidden(spec('s', 'a')), visible(spec('s', 'a'))],

    siblingDepsChangeWhileHidden: [
        visible(spec('s1', 'a'), spec('s2', 'a')),
        hidden(spec('s1', 'a'), spec('s2', 'a')),
        hidden(spec('s1', 'b'), spec('s2', 'b')),
        visible(spec('s1', 'b'), spec('s2', 'b')),
    ],

    pairDepsChangeWhileHidden: [
        visible(spec('p', 'a', {kind: 'pair'})),
        hidden(spec('p', 'a', {kind: 'pair'})),
        hidden(spec('p', 'b', {kind: 'pair'})),
        visible(spec('p', 'b', {kind: 'pair'})),
    ],

    nestedDepsChangeWhileHidden: [
        visible(spec('n', 'a', {kind: 'nested'})),
        hidden(spec('n', 'a', {kind: 'nested'})),
        hidden(spec('n', 'b', {kind: 'nested'})),
        visible(spec('n', 'b', {kind: 'nested'})),
    ],

    oneOfTwoCallSitesChangesWhileHidden: [
        visible(spec('p', 'a', {kind: 'pair', secondValue: 'a'})),
        hidden(spec('p', 'a', {kind: 'pair', secondValue: 'a'})),
        hidden(spec('p', 'a', {kind: 'pair', secondValue: 'b'})),
        visible(spec('p', 'a', {kind: 'pair', secondValue: 'b'})),
    ],
} as const;

describe('useScreenActivityEffect compared to useEffect', () => {
    beforeEach(() => {
        log = [];
    });

    describe('a screen with no Activity and an Activity that stays visible', () => {
        it('runs the same calls through a mount, a dependency change, a removal and a remount', () => {
            expectEveryConfigToMatch(runEveryConfig(SCENARIOS.lifecycle), [['setup:s:a'], ['cleanup:s:a', 'setup:s:b'], ['cleanup:s:b'], ['setup:s:c'], ['cleanup:s:c']]);
        });

        it('runs the same calls in the same order for two sibling components', () => {
            expectEveryConfigToMatch(runEveryConfig(SCENARIOS.siblingsWhileVisible), [
                ['setup:s1:a', 'setup:s2:a'],
                ['cleanup:s1:a', 'cleanup:s2:a', 'setup:s1:b', 'setup:s2:b'],
                ['cleanup:s1:b', 'cleanup:s2:b'],
                [],
            ]);
        });

        it('runs the same calls in the same order for a parent and its child', () => {
            expectEveryConfigToMatch(runEveryConfig(SCENARIOS.nestedWhileVisible), [
                ['setup:n(child):a', 'setup:n(parent):a'],
                ['cleanup:n(child):a', 'cleanup:n(parent):a', 'setup:n(child):b', 'setup:n(parent):b'],
                ['cleanup:n(parent):b', 'cleanup:n(child):b'],
                [],
            ]);
        });

        it('runs the same calls in the same order for two call sites of one component', () => {
            expectEveryConfigToMatch(runEveryConfig(SCENARIOS.pairWhileVisible), [
                ['setup:p(1):a', 'setup:p(2):a'],
                ['cleanup:p(1):a', 'cleanup:p(2):a', 'setup:p(1):b', 'setup:p(2):b'],
                ['cleanup:p(1):b', 'cleanup:p(2):b'],
                [],
            ]);
        });

        it('runs the same calls when the screen leaves the stack with two siblings on it', () => {
            expectEveryConfigToMatch(runEveryConfig(SCENARIOS.siblingsScreenUnmount), [
                ['setup:s1:a', 'setup:s2:a'],
                ['cleanup:s1:a', 'cleanup:s2:a'],
            ]);
        });

        it('runs the same calls when the screen leaves the stack with two call sites of one component on it', () => {
            expectEveryConfigToMatch(runEveryConfig(SCENARIOS.pairScreenUnmount), [
                ['setup:p(1):a', 'setup:p(2):a'],
                ['cleanup:p(1):a', 'cleanup:p(2):a'],
            ]);
        });
    });

    describe('an Activity that hides the screen', () => {
        it('keeps the setup of a cover and reveal cycle live, exactly as the live screen does', () => {
            const runs = runEveryConfig(SCENARIOS.coverAndReveal);
            const expected = [['setup:s:a'], [], [], ['cleanup:s:a']];

            expect(runs.liveUseEffect).toEqual(expected);
            expect(runs.liveScreenActivityEffect).toEqual(expected);
            expect(runs.activityScreenActivityEffect).toEqual(expected);

            // Plain useEffect releases on the hide and acquires again on the reveal, which is what the hook avoids.
            expect(runs.activityUseEffect).toEqual([['setup:s:a'], ['cleanup:s:a'], ['setup:s:a'], ['cleanup:s:a']]);
        });

        it('keeps the setup live through two cover and reveal cycles', () => {
            const runs = runEveryConfig(SCENARIOS.twoCoverAndRevealCycles);
            const expected = [['setup:s:a'], [], [], [], [], ['cleanup:s:a']];

            expect(runs.liveUseEffect).toEqual(expected);
            expect(runs.activityScreenActivityEffect).toEqual(expected);
            expect(runs.activityUseEffect).toEqual([['setup:s:a'], ['cleanup:s:a'], ['setup:s:a'], ['cleanup:s:a'], ['setup:s:a'], ['cleanup:s:a']]);
        });

        it('keeps a setup that returned no cleanup live through a cover and reveal cycle', () => {
            const runs = runEveryConfig(SCENARIOS.coverAndRevealWithoutCleanup);
            const expected = [['setup:s:a'], [], [], []];

            expect(runs.liveUseEffect).toEqual(expected);
            expect(runs.activityScreenActivityEffect).toEqual(expected);

            // Plain useEffect has nothing to release, so the reveal sets up a second time on top of the first setup.
            expect(runs.activityUseEffect).toEqual([['setup:s:a'], [], ['setup:s:a'], []]);
        });

        it('runs the cleanup when the screen leaves the stack while hidden', () => {
            const runs = runEveryConfig(SCENARIOS.coverWithoutReveal);
            const expected = [['setup:s:a'], [], ['cleanup:s:a']];

            expect(runs.liveUseEffect).toEqual(expected);
            expect(runs.activityScreenActivityEffect).toEqual(expected);

            // Plain useEffect released on the hide, so nothing is left for the teardown.
            expect(runs.activityUseEffect).toEqual([['setup:s:a'], ['cleanup:s:a'], []]);
        });

        it('runs a dependency change that lands together with the reveal in that same commit', () => {
            const runs = runEveryConfig(SCENARIOS.depsChangeOnReveal);
            const expected = [['setup:s:a'], [], ['cleanup:s:a', 'setup:s:b'], ['cleanup:s:b']];

            expect(runs.liveUseEffect).toEqual(expected);
            expect(runs.activityScreenActivityEffect).toEqual(expected);
            expect(runs.activityUseEffect).toEqual([['setup:s:a'], ['cleanup:s:a'], ['setup:s:b'], ['cleanup:s:b']]);
        });

        it('runs a dependency change that landed while the screen was hidden on the reveal', () => {
            const runs = runEveryConfig(SCENARIOS.depsChangeWhileHidden);

            expect(runs.liveUseEffect).toEqual([['setup:s:a'], [], ['cleanup:s:a', 'setup:s:b'], [], ['cleanup:s:b']]);

            // The same calls in the same order, moved from the commit of the change to the commit of the reveal.
            expect(runs.activityScreenActivityEffect).toEqual([['setup:s:a'], [], [], ['cleanup:s:a', 'setup:s:b'], ['cleanup:s:b']]);
            expect(runs.activityScreenActivityEffect.flat()).toEqual(runs.liveUseEffect.flat());

            expect(runs.activityUseEffect).toEqual([['setup:s:a'], ['cleanup:s:a'], [], ['setup:s:b'], ['cleanup:s:b']]);
        });

        it('runs a dependency change that lands together with the cover on the reveal', () => {
            const runs = runEveryConfig(SCENARIOS.depsChangeOnCover);

            expect(runs.liveUseEffect).toEqual([['setup:s:a'], ['cleanup:s:a', 'setup:s:b'], [], ['cleanup:s:b']]);
            expect(runs.activityScreenActivityEffect).toEqual([['setup:s:a'], [], ['cleanup:s:a', 'setup:s:b'], ['cleanup:s:b']]);
            expect(runs.activityScreenActivityEffect.flat()).toEqual(runs.liveUseEffect.flat());
        });

        it('runs the setup of a component mounted while the screen was hidden on the reveal, as plain useEffect does', () => {
            const runs = runEveryConfig(SCENARIOS.mountWhileHidden);

            expect(runs.liveUseEffect).toEqual([[], [], ['setup:s:a'], [], ['cleanup:s:a']]);

            // A hidden subtree runs no effects at all, so this deferral is the <Activity> and not the hook.
            const deferred = [[], [], [], ['setup:s:a'], ['cleanup:s:a']];
            expect(runs.activityScreenActivityEffect).toEqual(deferred);
            expect(runs.activityUseEffect).toEqual(deferred);
        });

        it('runs the setup of a screen that mounted hidden on the reveal, as plain useEffect does', () => {
            const runs = runEveryConfig(SCENARIOS.mountedHidden);

            expect(runs.liveUseEffect).toEqual([['setup:s:a'], [], ['cleanup:s:a']]);

            const deferred = [[], ['setup:s:a'], ['cleanup:s:a']];
            expect(runs.activityScreenActivityEffect).toEqual(deferred);
            expect(runs.activityUseEffect).toEqual(deferred);
        });

        it('never runs a component that mounted and was removed while the screen was hidden, as plain useEffect does', () => {
            const runs = runEveryConfig(SCENARIOS.mountAndRemoveWhileHidden);

            expect(runs.liveUseEffect).toEqual([[], [], ['setup:s:a'], ['cleanup:s:a'], [], []]);

            const emptySteps = [[], [], [], [], [], []];
            expect(runs.activityScreenActivityEffect).toEqual(emptySteps);
            expect(runs.activityUseEffect).toEqual(emptySteps);
        });
    });

    describe('removing the component', () => {
        it('runs the cleanup at once while the screen is visible', () => {
            expectEveryConfigToMatch(runEveryConfig(SCENARIOS.removeWhileVisible), [['setup:s:a'], ['cleanup:s:a'], []]);
        });

        it('runs the cleanup at once after a cover and reveal cycle', () => {
            const runs = runEveryConfig(SCENARIOS.removeAfterCoverAndReveal);
            const expected = [['setup:s:a'], [], [], ['cleanup:s:a'], []];

            expect(runs.liveUseEffect).toEqual(expected);
            expect(runs.activityScreenActivityEffect).toEqual(expected);
        });

        it('runs the cleanup at once when the removal lands together with the reveal', () => {
            const runs = runEveryConfig(SCENARIOS.removeOnReveal);
            const expected = [['setup:s:a'], [], ['cleanup:s:a'], []];

            expect(runs.liveUseEffect).toEqual(expected);
            expect(runs.activityScreenActivityEffect).toEqual(expected);
        });

        it('runs the cleanup of a component removed while the screen was hidden on the reveal', () => {
            const runs = runEveryConfig(SCENARIOS.removeWhileHidden);

            expect(runs.liveUseEffect).toEqual([['setup:s:a'], [], ['cleanup:s:a'], [], []]);

            // The same calls, moved from the commit of the removal to the commit of the reveal.
            expect(runs.activityScreenActivityEffect).toEqual([['setup:s:a'], [], [], ['cleanup:s:a'], []]);
            expect(runs.activityScreenActivityEffect.flat()).toEqual(runs.liveUseEffect.flat());

            expect(runs.activityUseEffect).toEqual([['setup:s:a'], ['cleanup:s:a'], [], [], []]);
        });

        it('runs the cleanup of a component removed while hidden when the screen leaves the stack before any reveal', () => {
            const runs = runEveryConfig(SCENARIOS.removeWhileHiddenWithoutReveal);

            expect(runs.liveUseEffect).toEqual([['setup:s:a'], [], ['cleanup:s:a'], []]);
            expect(runs.activityScreenActivityEffect).toEqual([['setup:s:a'], [], [], ['cleanup:s:a']]);
            expect(runs.activityScreenActivityEffect.flat()).toEqual(runs.liveUseEffect.flat());
        });

        it('leaves the sibling that stayed alive untouched when one of two is removed while hidden', () => {
            const runs = runEveryConfig(SCENARIOS.removeOneSiblingWhileHidden);

            expect(runs.liveUseEffect).toEqual([['setup:s1:a', 'setup:s2:a'], [], ['cleanup:s2:a'], [], ['cleanup:s1:a']]);
            expect(runs.activityScreenActivityEffect).toEqual([['setup:s1:a', 'setup:s2:a'], [], [], ['cleanup:s2:a'], ['cleanup:s1:a']]);
            expect(runs.activityScreenActivityEffect.flat()).toEqual(runs.liveUseEffect.flat());

            // Plain useEffect released both on the hide and acquired the surviving one again on the reveal.
            expect(runs.activityUseEffect).toEqual([['setup:s1:a', 'setup:s2:a'], ['cleanup:s1:a', 'cleanup:s2:a'], [], ['setup:s1:a'], ['cleanup:s1:a']]);
        });
    });

    describe('the order of the effect calls', () => {
        it('re-runs only the call site whose dependencies changed while the screen was hidden', () => {
            const runs = runEveryConfig(SCENARIOS.oneOfTwoCallSitesChangesWhileHidden);

            expect(runs.liveUseEffect).toEqual([['setup:p(1):a', 'setup:p(2):a'], [], ['cleanup:p(2):a', 'setup:p(2):b'], [], ['cleanup:p(1):a', 'cleanup:p(2):b']]);
            expect(runs.activityScreenActivityEffect).toEqual([['setup:p(1):a', 'setup:p(2):a'], [], [], ['cleanup:p(2):a', 'setup:p(2):b'], ['cleanup:p(1):a', 'cleanup:p(2):b']]);
            expect(runs.activityScreenActivityEffect.flat()).toEqual(runs.liveUseEffect.flat());

            // Plain useEffect released the call site that never changed and acquired it again.
            expect(runs.activityUseEffect).toEqual([
                ['setup:p(1):a', 'setup:p(2):a'],
                ['cleanup:p(1):a', 'cleanup:p(2):a'],
                [],
                ['setup:p(1):a', 'setup:p(2):b'],
                ['cleanup:p(1):a', 'cleanup:p(2):b'],
            ]);
        });

        it('interleaves the cleanup and the setup of two siblings on a reveal that re-runs both', () => {
            const runs = runEveryConfig(SCENARIOS.siblingDepsChangeWhileHidden);

            // A live screen releases both siblings before it sets either of them up again.
            expect(runs.liveUseEffect).toEqual([['setup:s1:a', 'setup:s2:a'], [], ['cleanup:s1:a', 'cleanup:s2:a', 'setup:s1:b', 'setup:s2:b'], [], ['cleanup:s1:b', 'cleanup:s2:b']]);

            // The hook re-runs from the setup phase, so each sibling releases right before its own setup.
            expect(runs.activityScreenActivityEffect).toEqual([
                ['setup:s1:a', 'setup:s2:a'],
                [],
                [],
                ['cleanup:s1:a', 'setup:s1:b', 'cleanup:s2:a', 'setup:s2:b'],
                ['cleanup:s1:b', 'cleanup:s2:b'],
            ]);
        });

        it('interleaves the cleanup and the setup of two call sites of one component on a reveal that re-runs both', () => {
            const runs = runEveryConfig(SCENARIOS.pairDepsChangeWhileHidden);

            expect(runs.liveUseEffect).toEqual([
                ['setup:p(1):a', 'setup:p(2):a'],
                [],
                ['cleanup:p(1):a', 'cleanup:p(2):a', 'setup:p(1):b', 'setup:p(2):b'],
                [],
                ['cleanup:p(1):b', 'cleanup:p(2):b'],
            ]);
            expect(runs.activityScreenActivityEffect).toEqual([
                ['setup:p(1):a', 'setup:p(2):a'],
                [],
                [],
                ['cleanup:p(1):a', 'setup:p(1):b', 'cleanup:p(2):a', 'setup:p(2):b'],
                ['cleanup:p(1):b', 'cleanup:p(2):b'],
            ]);
        });

        it('interleaves the cleanup and the setup of a parent and its child on a reveal that re-runs both', () => {
            const runs = runEveryConfig(SCENARIOS.nestedDepsChangeWhileHidden);

            expect(runs.liveUseEffect).toEqual([
                ['setup:n(child):a', 'setup:n(parent):a'],
                [],
                ['cleanup:n(child):a', 'cleanup:n(parent):a', 'setup:n(child):b', 'setup:n(parent):b'],
                [],
                ['cleanup:n(parent):b', 'cleanup:n(child):b'],
            ]);
            expect(runs.activityScreenActivityEffect).toEqual([
                ['setup:n(child):a', 'setup:n(parent):a'],
                [],
                [],
                ['cleanup:n(child):a', 'setup:n(child):b', 'cleanup:n(parent):a', 'setup:n(parent):b'],
                // The boundary releases in the order the effects registered in, which is the child before the parent.
                ['cleanup:n(child):b', 'cleanup:n(parent):b'],
            ]);
        });

        it('releases a parent and its child in the order they registered when the screen leaves the stack', () => {
            const runs = runEveryConfig(SCENARIOS.nestedScreenUnmount);

            // React tears a deleted tree down from the parent down, and the three configurations without a cover agree.
            const expected = [
                ['setup:n(child):a', 'setup:n(parent):a'],
                ['cleanup:n(parent):a', 'cleanup:n(child):a'],
            ];
            expect(runs.liveUseEffect).toEqual(expected);
            expect(runs.liveScreenActivityEffect).toEqual(expected);
            expect(runs.activityUseEffect).toEqual(expected);

            // The boundary owns the release, and its order is the order the effects registered in.
            expect(runs.activityScreenActivityEffect).toEqual([
                ['setup:n(child):a', 'setup:n(parent):a'],
                ['cleanup:n(child):a', 'cleanup:n(parent):a'],
            ]);
        });

        it('releases siblings in the order they registered when the screen leaves the stack', () => {
            const runs = runEveryConfig(SCENARIOS.prependSiblingWhileVisible);

            // React releases the sibling that was added in front of the first one first, because it goes in tree order.
            expect(runs.liveUseEffect).toEqual([['setup:s1:a'], ['setup:s0:a'], ['cleanup:s0:a', 'cleanup:s1:a']]);
            expect(runs.activityUseEffect).toEqual(runs.liveUseEffect);

            // The boundary releases in mount order instead, which is not the tree order here.
            expect(runs.activityScreenActivityEffect).toEqual([['setup:s1:a'], ['setup:s0:a'], ['cleanup:s1:a', 'cleanup:s0:a']]);
        });

        it('releases in mount order when the screen leaves the stack after a removal that was deferred', () => {
            const runs = runEveryConfig(SCENARIOS.removeOneSiblingWhileHiddenWithoutReveal);

            expect(runs.liveUseEffect).toEqual([['setup:s1:a', 'setup:s2:a'], [], ['cleanup:s2:a'], ['cleanup:s1:a']]);

            // Both are released at the teardown, so the sibling that went away first is released last.
            expect(runs.activityScreenActivityEffect).toEqual([['setup:s1:a', 'setup:s2:a'], [], [], ['cleanup:s1:a', 'cleanup:s2:a']]);
        });

        it('sets the new instance up before it releases the one removed while the screen was hidden', () => {
            const runs = runEveryConfig(SCENARIOS.remountWhileHidden);

            // A live screen releases the instance that went away before it sets the new one up.
            expect(runs.liveUseEffect).toEqual([['setup:s:a'], [], ['cleanup:s:a'], ['setup:s:a'], [], ['cleanup:s:a']]);

            // The reveal runs the body of the new instance first, and the boundary sweeps the old entry after it.
            expect(runs.activityScreenActivityEffect).toEqual([['setup:s:a'], [], [], [], ['setup:s:a', 'cleanup:s:a'], ['cleanup:s:a']]);
        });
    });

    describe('what a cover cannot reproduce', () => {
        it('coalesces a dependency change that was undone before the reveal', () => {
            const runs = runEveryConfig(SCENARIOS.depsChangeUndoneWhileHidden);

            expect(runs.liveUseEffect).toEqual([['setup:s:a'], [], ['cleanup:s:a', 'setup:s:b'], ['cleanup:s:b', 'setup:s:a'], [], ['cleanup:s:a']]);

            // The setup was never released, and the dependencies of the reveal are the ones it is live for.
            expect(runs.activityScreenActivityEffect).toEqual([['setup:s:a'], [], [], [], [], ['cleanup:s:a']]);
        });

        it('coalesces the renders of an effect with no dependency list into one run per reveal', () => {
            const runs = runEveryConfig(SCENARIOS.coverAndRevealWithoutDeps);

            // A live screen runs an effect with no dependency list on every render.
            expect(runs.liveUseEffect).toEqual([['setup:s:a'], ['cleanup:s:a', 'setup:s:a'], ['cleanup:s:a', 'setup:s:a'], ['cleanup:s:a', 'setup:s:a'], ['cleanup:s:a']]);

            // The renders that happened while hidden ran no effects, so the reveal is one release and one setup.
            expect(runs.activityScreenActivityEffect).toEqual([['setup:s:a'], [], [], ['cleanup:s:a', 'setup:s:a'], ['cleanup:s:a']]);
        });
    });

    describe('an Activity nested in another Activity', () => {
        it('runs the same calls as useEffect while the outer screen stays visible', () => {
            const runs = runEveryConfig(SCENARIOS.lifecycle);
            expect(runNestedActivity(SCENARIOS.lifecycle)).toEqual(runs.liveUseEffect);
        });

        it('releases the setup when the outer screen hides, because the inner boundary is hidden with it', () => {
            const runs = runEveryConfig(SCENARIOS.coverAndReveal);

            // The inner boundary sits inside the <Activity> of the outer screen, so its own terminal release runs on
            // the hide. A screen of a nested navigator therefore gets plain useEffect, not the live screen.
            expect(runNestedActivity(SCENARIOS.coverAndReveal)).toEqual(runs.activityUseEffect);
            expect(runNestedActivity(SCENARIOS.coverAndReveal)).not.toEqual(runs.liveUseEffect);
        });

        it('releases the setup of a component removed while the outer screen was hidden on the hide', () => {
            const runs = runEveryConfig(SCENARIOS.removeWhileHidden);
            expect(runNestedActivity(SCENARIOS.removeWhileHidden)).toEqual(runs.activityUseEffect);
        });
    });
});
