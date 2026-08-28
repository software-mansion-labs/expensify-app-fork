import {useEffect} from 'react';

import type {ScreenState} from '../utils/ScreenActivityEffectTestUtils';

import {hidden, resetLog, runScenario, spec, visible} from '../utils/ScreenActivityEffectTestUtils';

/**
 * What React does with a plain useEffect of a screen wrapped in an <Activity>, which is the behavior every screen has
 * before it opts into useScreenActivityEffect and the reference the hook is compared to. These tests own the semantics
 * of the cover itself, so a React upgrade that changes them fails here rather than inside a feature test.
 */

const SCENARIOS = {
    lifecycle: [visible(spec('s', 'a')), visible(spec('s', 'b')), visible(), visible(spec('s', 'c'))],

    coverAndReveal: [visible(spec('s', 'a')), hidden(spec('s', 'a')), visible(spec('s', 'a'))],

    depsChangeWhileHidden: [visible(spec('s', 'a')), hidden(spec('s', 'a')), hidden(spec('s', 'b')), visible(spec('s', 'b'))],

    noDepsWhileHidden: [
        visible(spec('s', 'a', {kind: 'noDeps'})),
        hidden(spec('s', 'a', {kind: 'noDeps'})),
        hidden(spec('s', 'a', {kind: 'noDeps'})),
        visible(spec('s', 'a', {kind: 'noDeps'})),
    ],

    mountWhileHidden: [visible(), hidden(), hidden(spec('s', 'a')), visible(spec('s', 'a'))],

    removeWhileHidden: [visible(spec('s', 'a')), hidden(spec('s', 'a')), hidden(), visible()],

    coverWithoutReveal: [visible(spec('s', 'a')), hidden(spec('s', 'a'))],

    nestedScreenUnmount: [visible(spec('n', 'a', {kind: 'nested'}))],

    nestedCover: [visible(spec('n', 'a', {kind: 'nested'})), hidden(spec('n', 'a', {kind: 'nested'}))],

    siblingsScreenUnmount: [visible(spec('s1', 'a'), spec('s2', 'a'))],
} as const;

function runLive(states: readonly ScreenState[]): string[][] {
    return runScenario(useEffect, 'none', states);
}

function runCovered(states: readonly ScreenState[]): string[][] {
    return runScenario(useEffect, 'activity', states);
}

describe('useEffect under an Activity', () => {
    beforeEach(() => {
        resetLog();
    });

    it('changes nothing about a screen that never hides', () => {
        const expected = [['setup:s:a'], ['cleanup:s:a', 'setup:s:b'], ['cleanup:s:b'], ['setup:s:c'], ['cleanup:s:c']];

        expect(runLive(SCENARIOS.lifecycle)).toEqual(expected);
        expect(runCovered(SCENARIOS.lifecycle)).toEqual(expected);
    });

    it('runs the cleanup on every cover and the setup again on every reveal', () => {
        expect(runLive(SCENARIOS.coverAndReveal)).toEqual([['setup:s:a'], [], [], ['cleanup:s:a']]);
        expect(runCovered(SCENARIOS.coverAndReveal)).toEqual([['setup:s:a'], ['cleanup:s:a'], ['setup:s:a'], ['cleanup:s:a']]);
    });

    it('runs no effect at all for a render that happens while the screen is hidden', () => {
        // The dependency change is not a cleanup and a setup, because the cover already released the setup.
        expect(runCovered(SCENARIOS.depsChangeWhileHidden)).toEqual([['setup:s:a'], ['cleanup:s:a'], [], ['setup:s:b'], ['cleanup:s:b']]);
    });

    it('runs an effect with no dependency list once per reveal instead of once per render', () => {
        expect(runLive(SCENARIOS.noDepsWhileHidden)).toEqual([['setup:s:a'], ['cleanup:s:a', 'setup:s:a'], ['cleanup:s:a', 'setup:s:a'], ['cleanup:s:a', 'setup:s:a'], ['cleanup:s:a']]);
        expect(runCovered(SCENARIOS.noDepsWhileHidden)).toEqual([['setup:s:a'], ['cleanup:s:a'], [], ['setup:s:a'], ['cleanup:s:a']]);
    });

    it('defers the setup of a component mounted while the screen was hidden to the reveal', () => {
        expect(runLive(SCENARIOS.mountWhileHidden)).toEqual([[], [], ['setup:s:a'], [], ['cleanup:s:a']]);
        expect(runCovered(SCENARIOS.mountWhileHidden)).toEqual([[], [], [], ['setup:s:a'], ['cleanup:s:a']]);
    });

    it('runs nothing for a component removed while the screen was hidden, because the cover released it', () => {
        expect(runLive(SCENARIOS.removeWhileHidden)).toEqual([['setup:s:a'], [], ['cleanup:s:a'], [], []]);
        expect(runCovered(SCENARIOS.removeWhileHidden)).toEqual([['setup:s:a'], ['cleanup:s:a'], [], [], []]);
    });

    it('runs nothing when the screen leaves the stack while hidden, because the cover released it', () => {
        expect(runLive(SCENARIOS.coverWithoutReveal)).toEqual([['setup:s:a'], [], ['cleanup:s:a']]);
        expect(runCovered(SCENARIOS.coverWithoutReveal)).toEqual([['setup:s:a'], ['cleanup:s:a'], []]);
    });

    it('releases a hidden subtree and a deleted tree from the parent down', () => {
        const expected = [
            ['setup:n(child):a', 'setup:n(parent):a'],
            ['cleanup:n(parent):a', 'cleanup:n(child):a'],
        ];

        expect(runLive(SCENARIOS.nestedScreenUnmount)).toEqual(expected);
        expect(runCovered(SCENARIOS.nestedScreenUnmount)).toEqual(expected);
        expect(runCovered(SCENARIOS.nestedCover)).toEqual([['setup:n(child):a', 'setup:n(parent):a'], ['cleanup:n(parent):a', 'cleanup:n(child):a'], []]);
    });

    it('releases siblings in tree order', () => {
        const expected = [
            ['setup:s1:a', 'setup:s2:a'],
            ['cleanup:s1:a', 'cleanup:s2:a'],
        ];

        expect(runLive(SCENARIOS.siblingsScreenUnmount)).toEqual(expected);
        expect(runCovered(SCENARIOS.siblingsScreenUnmount)).toEqual(expected);
    });
});
