import {render} from '@testing-library/react-native';

import useScreenActivityEffect from '@hooks/useScreenActivityEffect';
import {ScreenActivityEffectBoundaryProvider} from '@hooks/useScreenActivityEffect/ScreenActivityEffectBoundaryContext';

import type {ComponentType, DependencyList, EffectCallback} from 'react';

import React, {Activity, useEffect, useState} from 'react';

/**
 * Runs one structure on useEffect and on useScreenActivityEffect and records the effect calls of every commit, so a
 * test can compare the two hooks step by step. The screen that stays live in the background, which is the 'none' tree
 * on plain useEffect, is the baseline every other configuration is measured against.
 */

type AnyEffectHook = (setup: EffectCallback, deps?: DependencyList) => void;

const HOOKS = {useEffect, useScreenActivityEffect};

type HookName = keyof typeof HOOKS;

let log: string[] = [];

/** The calls recorded since the last drain, which is one commit worth of them when a test drains after every step. */
function drainLog(): string[] {
    const drained = log;
    log = [];
    return drained;
}

function resetLog() {
    log = [];
}

type TrackedSetupOptions = {hasCleanup?: boolean; throwsOnCleanup?: boolean};

function trackedSetup(name: string, value: string, {hasCleanup = true, throwsOnCleanup = false}: TrackedSetupOptions = {}): EffectCallback {
    return () => {
        log.push(`setup:${name}:${value}`);
        if (!hasCleanup) {
            return undefined;
        }
        return () => {
            log.push(`cleanup:${name}:${value}`);
            if (throwsOnCleanup) {
                throw new Error(`cleanup of ${name} threw`);
            }
        };
    };
}

type BaseSubjectProps = {
    /** useEffect or useScreenActivityEffect, which is the only difference between two runs of the same structure. */
    useAnyEffect: AnyEffectHook;

    /** What the effect calls of this component are named in the log. */
    id: string;

    /** The dependency of the effect, so a change of it is a dependency change. */
    value: string;
};

/** Every subject takes the props of every other one, so one map can render all of them. */
type AnySubjectProps = BaseSubjectProps & {secondValue?: string; deps?: DependencyList; throwsOnCleanup?: boolean};

function Single({useAnyEffect, id, value, throwsOnCleanup}: BaseSubjectProps & {throwsOnCleanup?: boolean}) {
    useAnyEffect(trackedSetup(id, value, {throwsOnCleanup}), [value]);
    return null;
}

function NoCleanup({useAnyEffect, id, value}: BaseSubjectProps) {
    useAnyEffect(trackedSetup(id, value, {hasCleanup: false}), [value]);
    return null;
}

function NoDeps({useAnyEffect, id, value}: BaseSubjectProps) {
    useAnyEffect(trackedSetup(id, value));
    return null;
}

/** Takes the dependency list from the scenario, which is how a test covers a dependency list of another shape. */
function GivenDeps({useAnyEffect, id, value, deps}: BaseSubjectProps & {deps?: DependencyList}) {
    useAnyEffect(trackedSetup(id, value), deps);
    return null;
}

/** A dependency that is a new object on every render, which makes every render a dependency change. */
function UnstableDeps({useAnyEffect, id, value}: BaseSubjectProps) {
    useAnyEffect(trackedSetup(id, value), [{}]);
    return null;
}

/** Writes state from the effect body once, which is the shape of an effect that seeds a component from a source. */
function StateWriter({useAnyEffect, id, value}: BaseSubjectProps) {
    const [step, setStep] = useState(0);
    useAnyEffect(() => {
        log.push(`setup:${id}:${value}(${step})`);
        if (step === 0) {
            setStep(1);
        }
        return () => {
            log.push(`cleanup:${id}:${value}(${step})`);
        };
    }, [step, id, value]);
    return null;
}

/** Reads a value it does not declare, so a test can tell which render the surviving setup captured. */
function Undeclared({useAnyEffect, id, value, secondValue = value}: BaseSubjectProps & {secondValue?: string}) {
    useAnyEffect(trackedSetup(id, `${value}(${secondValue})`), [value]);
    return null;
}

function Pair({useAnyEffect, id, value, secondValue = value}: BaseSubjectProps & {secondValue?: string}) {
    useAnyEffect(trackedSetup(`${id}(1)`, value), [value]);
    useAnyEffect(trackedSetup(`${id}(2)`, secondValue), [secondValue]);
    return null;
}

function Nested({useAnyEffect, id, value}: BaseSubjectProps) {
    useAnyEffect(trackedSetup(`${id}(parent)`, value), [value]);
    return (
        <Single
            useAnyEffect={useAnyEffect}
            id={`${id}(child)`}
            value={value}
        />
    );
}

/** One component on both hooks, which is what a screen looks like while its effects are being migrated. */
function Mixed({id, value}: {id: string; value: string}) {
    useEffect(() => trackedSetup(`${id}(effect)`, value)(), [id, value]);
    useScreenActivityEffect(() => trackedSetup(`${id}(activity)`, value)(), [id, value]);
    return null;
}

const SUBJECTS = {
    single: Single,
    noCleanup: NoCleanup,
    noDeps: NoDeps,
    givenDeps: GivenDeps,
    unstableDeps: UnstableDeps,
    stateWriter: StateWriter,
    undeclared: Undeclared,
    pair: Pair,
    nested: Nested,
    mixed: Mixed,
};

type SubjectKind = keyof typeof SUBJECTS;

type SubjectSpec = {
    id: string;
    value: string;
    secondValue?: string;
    deps?: DependencyList;
    throwsOnCleanup?: boolean;
    kind?: SubjectKind;

    /** Overrides the hook of the run for this subject alone, which is how a test mixes the two on one screen. */
    hook?: HookName;
};

/** One rendered state of the screen: what it holds, and whether the <Activity> covers it. */
type ScreenState = {isHidden?: boolean; subjects: SubjectSpec[]};

/**
 * 'none' is the screen that stays live in the background, which never gets a boundary or an <Activity>. 'activity' is
 * the screen the wrapper builds, with the boundary outside the <Activity> it serves. The nested trees are that screen
 * inside another one, which is what a screen of a nested navigator gets: 'nestedActivity' hides the outer screen and
 * 'nestedActivityInnerHidden' hides the inner one.
 */
type Tree = 'none' | 'activity' | 'nestedActivity' | 'nestedActivityInnerHidden';

function Screen({useAnyEffect, tree, state}: {useAnyEffect: AnyEffectHook; tree: Tree; state: ScreenState}) {
    const content = state.subjects.map(({id, value, secondValue, deps, throwsOnCleanup, kind = 'single', hook}) => {
        const SubjectComponent: ComponentType<AnySubjectProps> = SUBJECTS[kind];
        return (
            <SubjectComponent
                key={id}
                useAnyEffect={hook ? HOOKS[hook] : useAnyEffect}
                id={id}
                value={value}
                secondValue={secondValue}
                deps={deps}
                throwsOnCleanup={throwsOnCleanup}
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

    if (tree === 'nestedActivityInnerHidden') {
        return (
            <ScreenActivityEffectBoundaryProvider isHidden={false}>
                <Activity mode="visible">
                    <ScreenActivityEffectBoundaryProvider isHidden={isHidden}>
                        <Activity mode={mode}>{content}</Activity>
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

/**
 * The same scenario on both hooks, on a screen with no <Activity> above it and on a screen wrapped in one.
 * liveUseEffect is the baseline, liveScreenActivityEffect is the hook with no boundary above it, activityUseEffect is
 * what the hook exists to avoid, and activityScreenActivityEffect is the hook doing its job.
 */
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

function runNestedActivityInnerHidden(states: readonly ScreenState[]): string[][] {
    return runScenario(useScreenActivityEffect, 'nestedActivityInnerHidden', states);
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

export {drainLog, expectEveryConfigToMatch, hidden, resetLog, runEveryConfig, runNestedActivity, runNestedActivityInnerHidden, runScenario, Screen, Single, spec, trackedSetup, visible};
export type {AnyEffectHook, Runs, ScreenState, SubjectSpec, Tree};
