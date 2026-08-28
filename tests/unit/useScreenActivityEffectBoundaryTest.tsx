import {render} from '@testing-library/react-native';

import useScreenActivityEffect from '@hooks/useScreenActivityEffect';
import {ScreenActivityEffectBoundaryProvider} from '@hooks/useScreenActivityEffect/ScreenActivityEffectBoundaryContext';

import StrictModeMountGate from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigatorComponent/ScreenActivityWrapper/StrictModeMountGate';

import React, {Activity, useEffect} from 'react';

import type {AnyEffectHook, ScreenState, Tree} from '../utils/ScreenActivityEffectTestUtils';

import {drainLog, hidden, resetLog, runEveryConfig, runNestedActivityInnerHidden, Screen, Single, spec, visible} from '../utils/ScreenActivityEffectTestUtils';

// The gate picks its implementation at module load, so the flag has to be mocked before the import above runs.
jest.mock('@src/CONFIG', () => ({__esModule: true, default: {USE_ACTIVITY_SCREEN_STRICT_MODE_IN_DEV: true}}));

/**
 * The boundary owns the release of everything a cover skipped, so these tests cover the shapes the boundary itself can
 * get into: a cleanup that throws while it releases, a second boundary next to it, a boundary nested inside another
 * screen, and the StrictMode gate that every screen opting into <Activity> renders below it.
 */

const SCENARIOS = {
    throwingCleanupAtTheTeardown: [visible(spec('first', 'a', {throwsOnCleanup: true}), spec('second', 'a'))],

    throwingCleanupOnTheSweep: [
        visible(spec('first', 'a', {throwsOnCleanup: true}), spec('second', 'a'), spec('kept', 'a')),
        hidden(spec('first', 'a', {throwsOnCleanup: true}), spec('second', 'a'), spec('kept', 'a')),
        hidden(spec('kept', 'a')),
        visible(spec('kept', 'a')),
    ],

    coverAndReveal: [visible(spec('s', 'a')), hidden(spec('s', 'a')), visible(spec('s', 'a'))],

    removeWhileHidden: [visible(spec('s', 'a')), hidden(spec('s', 'a')), hidden(), visible()],

    depsChangeWhileHidden: [visible(spec('s', 'a')), hidden(spec('s', 'a')), hidden(spec('s', 'b')), visible(spec('s', 'b'))],
} as const;

/** Runs a scenario and keeps going when a step throws, which is what a cleanup that throws does to the commit. */
function runCatching(useAnyEffect: AnyEffectHook, tree: Tree, states: readonly ScreenState[]) {
    const screen = (state: ScreenState) => (
        <Screen
            useAnyEffect={useAnyEffect}
            tree={tree}
            state={state}
        />
    );

    const steps: string[][] = [];
    const errors: string[] = [];

    const [first, ...rest] = states;
    const {rerender, unmount} = render(screen(first));
    steps.push(drainLog());

    const runStep = (step: () => void) => {
        try {
            step();
        } catch (error) {
            errors.push(String(error));
        }
        steps.push(drainLog());
    };

    for (const state of rest) {
        runStep(() => rerender(screen(state)));
    }
    runStep(() => unmount());

    return {steps, errors};
}

type StrictScreenProps = {useAnyEffect: AnyEffectHook; isWrapped: boolean; state: ScreenState};

/** The screen the wrapper builds in development, where StrictMode renders below the boundary and the <Activity>. */
function StrictScreen({useAnyEffect, isWrapped, state}: StrictScreenProps) {
    const isHidden = state.isHidden ?? false;
    const content = (
        <StrictModeMountGate>
            {state.subjects.map(({id, value}) => (
                <Single
                    key={id}
                    useAnyEffect={useAnyEffect}
                    id={id}
                    value={value}
                />
            ))}
        </StrictModeMountGate>
    );

    if (!isWrapped) {
        return content;
    }

    return (
        <ScreenActivityEffectBoundaryProvider isHidden={isHidden}>
            <Activity mode={isHidden ? 'hidden' : 'visible'}>{content}</Activity>
        </ScreenActivityEffectBoundaryProvider>
    );
}

function runStrict(useAnyEffect: AnyEffectHook, isWrapped: boolean, states: readonly ScreenState[]): string[][] {
    const screen = (state: ScreenState) => (
        <StrictScreen
            useAnyEffect={useAnyEffect}
            isWrapped={isWrapped}
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

describe('ScreenActivityEffectBoundaryProvider', () => {
    beforeEach(() => {
        resetLog();
    });

    describe('a cleanup that throws', () => {
        // The boundary releases the entries of the screen in one loop, so a cleanup that throws stops it. React runs
        // every cleanup of a deleted tree instead, which is what the first test here holds it to.
        it('releases the rest of the screen when one cleanup throws at the teardown', () => {
            const live = runCatching(useEffect, 'none', SCENARIOS.throwingCleanupAtTheTeardown);
            const activity = runCatching(useScreenActivityEffect, 'activity', SCENARIOS.throwingCleanupAtTheTeardown);

            // React runs every cleanup of a deleted tree and reports the error afterwards.
            expect(live.steps).toEqual([
                ['setup:first:a', 'setup:second:a'],
                ['cleanup:first:a', 'cleanup:second:a'],
            ]);
            expect(live.errors).toEqual(['Error: cleanup of first threw']);

            expect(activity.steps).toEqual(live.steps);
            expect(activity.errors).toEqual(live.errors);
        });

        it('releases the rest of the screen when one cleanup throws on the sweep of a reveal', () => {
            const live = runCatching(useEffect, 'none', SCENARIOS.throwingCleanupOnTheSweep);
            const activity = runCatching(useScreenActivityEffect, 'activity', SCENARIOS.throwingCleanupOnTheSweep);

            // A destroy that throws takes the tree down with it, so the rest of the screen is released either way, and
            // the live screen mounts the component that survived the removal again on its next render.
            expect(live.steps).toEqual([
                ['setup:first:a', 'setup:second:a', 'setup:kept:a'],
                [],
                ['cleanup:first:a', 'cleanup:second:a', 'cleanup:kept:a'],
                ['setup:kept:a'],
                ['cleanup:kept:a'],
            ]);
            expect(activity.steps).toEqual([['setup:first:a', 'setup:second:a', 'setup:kept:a'], [], [], ['cleanup:first:a', 'cleanup:second:a', 'cleanup:kept:a'], []]);
            expect(activity.errors).toEqual(live.errors);
        });
    });

    describe('a second boundary next to it', () => {
        function TwoScreens({left, right}: {left: ScreenState; right: ScreenState}) {
            const screen = (state: ScreenState) => (
                <Screen
                    useAnyEffect={useScreenActivityEffect}
                    tree="activity"
                    state={state}
                />
            );
            return (
                <>
                    {screen(left)}
                    {screen(right)}
                </>
            );
        }

        it('keeps two screens with their own boundary independent', () => {
            const screens = (left: ScreenState, right: ScreenState) => (
                <TwoScreens
                    left={left}
                    right={right}
                />
            );
            const {rerender, unmount} = render(screens(visible(spec('left', 'a')), visible(spec('right', 'a'))));
            const steps = [drainLog()];

            // When the left screen is covered, nothing of either screen is released.
            rerender(screens(hidden(spec('left', 'a')), visible(spec('right', 'a'))));
            steps.push(drainLog());

            // When a component of the visible screen goes away while the other screen is covered, it releases at once.
            rerender(screens(hidden(spec('left', 'a')), visible()));
            steps.push(drainLog());

            rerender(screens(visible(spec('left', 'a')), visible()));
            steps.push(drainLog());

            unmount();
            steps.push(drainLog());

            expect(steps).toEqual([['setup:left:a', 'setup:right:a'], [], ['cleanup:right:a'], [], ['cleanup:left:a']]);
        });
    });

    describe('a boundary nested inside another screen', () => {
        it('keeps the setup live when the boundary of the screen itself hides it', () => {
            const runs = runEveryConfig(SCENARIOS.coverAndReveal);

            // The inner boundary is the one that hides, which is the case of a screen of a nested navigator.
            expect(runNestedActivityInnerHidden(SCENARIOS.coverAndReveal)).toEqual(runs.liveUseEffect);
        });

        it('runs the cleanup of a component removed while the inner boundary was hidden on the reveal', () => {
            const runs = runEveryConfig(SCENARIOS.removeWhileHidden);

            expect(runNestedActivityInnerHidden(SCENARIOS.removeWhileHidden)).toEqual(runs.activityScreenActivityEffect);
        });
    });

    describe('the StrictMode gate of a screen that opted into Activity', () => {
        it('puts both hooks through the remount cycle of the gate', () => {
            const live = runStrict(useEffect, false, [visible(spec('s', 'a'))]);
            const activity = runStrict(useScreenActivityEffect, true, [visible(spec('s', 'a'))]);

            expect(live).toEqual([['setup:s:a', 'cleanup:s:a', 'setup:s:a'], ['cleanup:s:a']]);
            expect(activity).toEqual(live);
        });

        it('keeps the setup live through a cover and reveal cycle below the gate', () => {
            const live = runStrict(useEffect, false, SCENARIOS.coverAndReveal);
            const activity = runStrict(useScreenActivityEffect, true, SCENARIOS.coverAndReveal);

            expect(live).toEqual([['setup:s:a', 'cleanup:s:a', 'setup:s:a'], [], [], ['cleanup:s:a']]);
            expect(activity).toEqual(live);
        });

        it('runs a dependency change that landed while hidden on the reveal below the gate', () => {
            const live = runStrict(useEffect, false, SCENARIOS.depsChangeWhileHidden);
            const activity = runStrict(useScreenActivityEffect, true, SCENARIOS.depsChangeWhileHidden);

            expect(live).toEqual([['setup:s:a', 'cleanup:s:a', 'setup:s:a'], [], ['cleanup:s:a', 'setup:s:b'], [], ['cleanup:s:b']]);
            expect(activity).toEqual([['setup:s:a', 'cleanup:s:a', 'setup:s:a'], [], [], ['cleanup:s:a', 'setup:s:b'], ['cleanup:s:b']]);
            expect(activity.flat()).toEqual(live.flat());
        });

        it('runs the cleanup of a component removed while hidden on the reveal below the gate', () => {
            const live = runStrict(useEffect, false, SCENARIOS.removeWhileHidden);
            const activity = runStrict(useScreenActivityEffect, true, SCENARIOS.removeWhileHidden);

            expect(live).toEqual([['setup:s:a', 'cleanup:s:a', 'setup:s:a'], [], ['cleanup:s:a'], [], []]);
            expect(activity).toEqual([['setup:s:a', 'cleanup:s:a', 'setup:s:a'], [], [], ['cleanup:s:a'], []]);
            expect(activity.flat()).toEqual(live.flat());
        });
    });
});
