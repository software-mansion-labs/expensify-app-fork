import useScreenActivityEffect from '@hooks/useScreenActivityEffect';

import type {ScreenState} from '../utils/ScreenActivityEffectTestUtils';

import {hidden, resetLog, runScenario, spec, visible} from '../utils/ScreenActivityEffectTestUtils';

/**
 * A screen being migrated runs both hooks at once, either in one component or across its components, so these tests
 * cover what a cover does to a subtree where only some of the effects are meant to survive it. The plain useEffect
 * calls churn on every cover and reveal, and the useScreenActivityEffect calls next to them do not.
 */

const MIXED = {kind: 'mixed'} as const;

const SCENARIOS = {
    coverAndReveal: [visible(spec('m', 'a', MIXED)), hidden(spec('m', 'a', MIXED)), visible(spec('m', 'a', MIXED))],

    depsChangeWhileVisible: [visible(spec('m', 'a', MIXED)), visible(spec('m', 'b', MIXED))],

    depsChangeWhileHidden: [visible(spec('m', 'a', MIXED)), hidden(spec('m', 'a', MIXED)), hidden(spec('m', 'b', MIXED)), visible(spec('m', 'b', MIXED))],

    removeWhileVisible: [visible(spec('m', 'a', MIXED)), visible()],

    removeWhileHidden: [visible(spec('m', 'a', MIXED)), hidden(spec('m', 'a', MIXED)), hidden(), visible()],

    coverWithoutReveal: [visible(spec('m', 'a', MIXED)), hidden(spec('m', 'a', MIXED))],

    siblingsCoverAndReveal: [
        visible(spec('plain', 'a', {hook: 'useEffect'}), spec('kept', 'a', {hook: 'useScreenActivityEffect'})),
        hidden(spec('plain', 'a', {hook: 'useEffect'}), spec('kept', 'a', {hook: 'useScreenActivityEffect'})),
        visible(spec('plain', 'a', {hook: 'useEffect'}), spec('kept', 'a', {hook: 'useScreenActivityEffect'})),
    ],

    siblingsDepsChangeWhileVisible: [
        visible(spec('plain', 'a', {hook: 'useEffect'}), spec('kept', 'a', {hook: 'useScreenActivityEffect'})),
        visible(spec('plain', 'b', {hook: 'useEffect'}), spec('kept', 'b', {hook: 'useScreenActivityEffect'})),
    ],

    siblingsDepsChangeWhileHidden: [
        visible(spec('plain', 'a', {hook: 'useEffect'}), spec('kept', 'a', {hook: 'useScreenActivityEffect'})),
        hidden(spec('plain', 'a', {hook: 'useEffect'}), spec('kept', 'a', {hook: 'useScreenActivityEffect'})),
        hidden(spec('plain', 'b', {hook: 'useEffect'}), spec('kept', 'b', {hook: 'useScreenActivityEffect'})),
        visible(spec('plain', 'b', {hook: 'useEffect'}), spec('kept', 'b', {hook: 'useScreenActivityEffect'})),
    ],
} as const;

function runCovered(states: readonly ScreenState[]): string[][] {
    return runScenario(useScreenActivityEffect, 'activity', states);
}

function runLive(states: readonly ScreenState[]): string[][] {
    return runScenario(useScreenActivityEffect, 'none', states);
}

describe('useScreenActivityEffect mixed with useEffect', () => {
    beforeEach(() => {
        resetLog();
    });

    describe('one component that uses both hooks', () => {
        it('releases only the useEffect call site on a cover and sets only that one up again on a reveal', () => {
            expect(runCovered(SCENARIOS.coverAndReveal)).toEqual([
                ['setup:m(effect):a', 'setup:m(activity):a'],
                ['cleanup:m(effect):a'],
                ['setup:m(effect):a'],
                ['cleanup:m(activity):a', 'cleanup:m(effect):a'],
            ]);
        });

        it('runs both call sites on a dependency change while the screen is visible', () => {
            const expected = [
                ['setup:m(effect):a', 'setup:m(activity):a'],
                ['cleanup:m(effect):a', 'cleanup:m(activity):a', 'setup:m(effect):b', 'setup:m(activity):b'],
                ['cleanup:m(activity):b', 'cleanup:m(effect):b'],
            ];

            expect(runCovered(SCENARIOS.depsChangeWhileVisible)).toEqual(expected);
            expect(runLive(SCENARIOS.depsChangeWhileVisible)).toEqual([
                ['setup:m(effect):a', 'setup:m(activity):a'],
                ['cleanup:m(effect):a', 'cleanup:m(activity):a', 'setup:m(effect):b', 'setup:m(activity):b'],
                ['cleanup:m(effect):b', 'cleanup:m(activity):b'],
            ]);
        });

        it('runs a dependency change that landed while hidden on the reveal for both call sites', () => {
            expect(runCovered(SCENARIOS.depsChangeWhileHidden)).toEqual([
                ['setup:m(effect):a', 'setup:m(activity):a'],
                ['cleanup:m(effect):a'],
                [],
                ['setup:m(effect):b', 'cleanup:m(activity):a', 'setup:m(activity):b'],
                ['cleanup:m(activity):b', 'cleanup:m(effect):b'],
            ]);
        });

        it('releases both call sites at once when the component is removed while the screen is visible', () => {
            expect(runCovered(SCENARIOS.removeWhileVisible)).toEqual([['setup:m(effect):a', 'setup:m(activity):a'], ['cleanup:m(effect):a', 'cleanup:m(activity):a'], []]);
        });

        it('releases the useScreenActivityEffect call site on the reveal when the component is removed while hidden', () => {
            expect(runCovered(SCENARIOS.removeWhileHidden)).toEqual([['setup:m(effect):a', 'setup:m(activity):a'], ['cleanup:m(effect):a'], [], ['cleanup:m(activity):a'], []]);
        });

        it('releases the useScreenActivityEffect call site when the screen leaves the stack while hidden', () => {
            expect(runCovered(SCENARIOS.coverWithoutReveal)).toEqual([['setup:m(effect):a', 'setup:m(activity):a'], ['cleanup:m(effect):a'], ['cleanup:m(activity):a']]);
        });
    });

    describe('two components, one per hook', () => {
        it('releases only the component on useEffect when the screen is covered', () => {
            expect(runCovered(SCENARIOS.siblingsCoverAndReveal)).toEqual([['setup:plain:a', 'setup:kept:a'], ['cleanup:plain:a'], ['setup:plain:a'], ['cleanup:kept:a', 'cleanup:plain:a']]);
        });

        it('keeps the order of the two components on a dependency change while the screen is visible', () => {
            expect(runCovered(SCENARIOS.siblingsDepsChangeWhileVisible)).toEqual([
                ['setup:plain:a', 'setup:kept:a'],
                ['cleanup:plain:a', 'cleanup:kept:a', 'setup:plain:b', 'setup:kept:b'],
                ['cleanup:kept:b', 'cleanup:plain:b'],
            ]);
        });

        it('runs a dependency change that landed while hidden on the reveal for both components', () => {
            expect(runCovered(SCENARIOS.siblingsDepsChangeWhileHidden)).toEqual([
                ['setup:plain:a', 'setup:kept:a'],
                ['cleanup:plain:a'],
                [],
                ['setup:plain:b', 'cleanup:kept:a', 'setup:kept:b'],
                ['cleanup:kept:b', 'cleanup:plain:b'],
            ]);
        });
    });
});
