import {render} from '@testing-library/react-native';

import useScreenActivityEffect from '@hooks/useScreenActivityEffect';
import {ScreenActivityEffectBoundaryProvider} from '@hooks/useScreenActivityEffect/ScreenActivityEffectBoundaryContext';

import StrictModeMountGate from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigatorComponent/ScreenActivityWrapper/StrictModeMountGate';

import type {ComponentType, ReactNode} from 'react';

import React, {Activity, useEffect} from 'react';

import type {AnyEffectHook, ScreenProps, Step} from '../../../utils/ScreenActivityEffectTestUtils';

import {
    ActivityScreen,
    AnyEffectHookProvider,
    drainLog,
    hidden,
    log,
    LiveScreen,
    record,
    resetLog,
    runOn,
    Subject,
    track,
    useAnyEffect,
    visible,
} from '../../../utils/ScreenActivityEffectTestUtils';

// The gate picks its implementation at module load, so the flag has to be mocked before the import above runs.
jest.mock('@src/CONFIG', () => ({__esModule: true, default: {USE_ACTIVITY_SCREEN_STRICT_MODE_IN_DEV: true}}));

/**
 * The boundary owns the release of everything a cover skipped, so these tests cover the shapes the boundary itself can
 * get into: a cleanup that throws while it releases, a second boundary next to it, a boundary nested inside another
 * screen, and the StrictMode gate that every screen opting into <Activity> renders below it.
 */

/** An effect whose cleanup throws, which is a screen effect with a bug in its own teardown. */
function ThrowingEffect() {
    useAnyEffect(() => {
        log('setup:throwing:a');
        return () => {
            log('cleanup:throwing:a');
            throw new Error('cleanup of throwing threw');
        };
    }, []);
    return null;
}

/** An effect whose first cleanup throws, so a dependency change can compare the two hooks after a live setup. */
function ThrowingChangingEffect({value}: {value: string}) {
    useAnyEffect(() => {
        log(`setup:throwingChanging:${value}`);
        return () => {
            log(`cleanup:throwingChanging:${value}`);
            if (value === 'a') {
                throw new Error('cleanup of throwingChanging:a threw');
            }
        };
    }, [value]);
    return null;
}

/** An effect whose setup throws, which is a screen effect with a bug in the work it acquires. */
function ThrowingSetup() {
    useAnyEffect(() => {
        log('setup:throwingSetup:a');
        throw new Error('setup of throwingSetup threw');
    }, []);
    return null;
}

/** An effect whose second setup throws, so a dependency change can compare the two hooks after a live setup. */
function ThrowingChangingSetup({value}: {value: string}) {
    useAnyEffect(() => {
        log(`setup:throwingSetup:${value}`);
        if (value === 'b') {
            throw new Error('setup of throwingSetup:b threw');
        }
        return () => log(`cleanup:throwingSetup:${value}`);
    }, [value]);
    return null;
}

/** Two effects that both throw from their cleanup, so a teardown has more than one error to answer for. */
function TwoThrowingCleanupsScreenContent() {
    return (
        <>
            <ThrowingEffect />
            <SecondThrowingEffect />
            <Survivor />
        </>
    );
}

function SecondThrowingEffect() {
    useAnyEffect(() => {
        log('setup:secondThrowing:a');
        return () => {
            log('cleanup:secondThrowing:a');
            throw new Error('cleanup of secondThrowing threw');
        };
    }, []);
    return null;
}

/** A screen whose first component fails to set up, leaving the rest of the screen to be released as usual. */
function ThrowingSetupScreenContent() {
    return (
        <>
            <ThrowingSetup />
            <Survivor />
        </>
    );
}

/** The mis-wiring the boundary cannot survive: it reports a hidden screen while the <Activity> it wraps is visible. */
function DriftedScreen({children}: ScreenProps) {
    return (
        <ScreenActivityEffectBoundaryProvider isHidden>
            <Activity mode="visible">{children}</Activity>
        </ScreenActivityEffectBoundaryProvider>
    );
}

/** A component that outlives the two above it, so a test can see whether the throw took the rest of the screen with it. */
function Survivor() {
    useAnyEffect(track('survivor:a'), []);
    return null;
}

/** A screen where the throwing cleanup and an ordinary one can go away together, leaving the survivor behind. */
function ThrowingScreenContent({hasThrowing = true}: {hasThrowing?: boolean}) {
    return (
        <>
            {hasThrowing ? <ThrowingEffect /> : null}
            {hasThrowing ? <Subject value="a" /> : null}
            <Survivor />
        </>
    );
}

/** A throwing dependency effect next to an ordinary one, so a failure cannot hide work another call site owes. */
function ThrowingChangingScreenContent({value}: {value: string}) {
    return (
        <>
            <ThrowingChangingEffect value={value} />
            <Subject value={value} />
            <Survivor />
        </>
    );
}

/** The screen of a nested navigator, where the boundary of the screen holding it is the one that hides. */
function OuterHiddenNestedScreen({isHidden: isOuterHidden, children}: ScreenProps) {
    return (
        <ActivityScreen isHidden={isOuterHidden}>
            <ActivityScreen isHidden={false}>{children}</ActivityScreen>
        </ActivityScreen>
    );
}

/** Two nested navigators deep, which is the shape the boundary has to keep working through unchanged. */
function TwiceNestedScreen({isHidden: isOuterHidden, children}: ScreenProps) {
    return (
        <ActivityScreen isHidden={isOuterHidden}>
            <ActivityScreen isHidden={false}>
                <ActivityScreen isHidden={false}>{children}</ActivityScreen>
            </ActivityScreen>
        </ActivityScreen>
    );
}

/** The same nesting, where the boundary of the screen itself is the one that hides. */
function InnerHiddenNestedScreen({isHidden: isInnerHidden, children}: ScreenProps) {
    return (
        <ActivityScreen isHidden={false}>
            <ActivityScreen isHidden={isInnerHidden}>{children}</ActivityScreen>
        </ActivityScreen>
    );
}

/** Two independently covered screens, which is the state overlapping navigator transitions put the boundaries in. */
function overlappingNestedScreen(isOuterHidden: boolean, isInnerHidden: boolean) {
    return (
        <AnyEffectHookProvider hook={useScreenActivityEffect}>
            <ActivityScreen isHidden={isOuterHidden}>
                <ActivityScreen isHidden={isInnerHidden}>
                    <Subject value="a" />
                </ActivityScreen>
            </ActivityScreen>
        </AnyEffectHookProvider>
    );
}

/** The screen a development build renders, with the qualification gate below the boundary and the <Activity>. */
function GatedActivityScreen({isHidden: isScreenHidden, children}: ScreenProps) {
    return (
        <ActivityScreen isHidden={isScreenHidden}>
            <StrictModeMountGate>{children}</StrictModeMountGate>
        </ActivityScreen>
    );
}

/** A live screen with the same gate, which is what the gate alone does to an effect. */
function GatedLiveScreen({children}: ScreenProps) {
    return <StrictModeMountGate>{children}</StrictModeMountGate>;
}

/** The gate above the boundary, which is what a StrictMode higher up in the tree does to the whole screen. */
function GateAboveBoundaryScreen({isHidden: isScreenHidden, children}: ScreenProps) {
    return (
        <StrictModeMountGate>
            <ActivityScreen isHidden={isScreenHidden}>{children}</ActivityScreen>
        </StrictModeMountGate>
    );
}

/** Records the steps and keeps going when one of them throws, which is what a cleanup that throws does to a commit. */
function runCatching(hook: AnyEffectHook, Screen: ComponentType<ScreenProps>, steps: readonly Step[]) {
    const tree = (step: Step) => (
        <AnyEffectHookProvider hook={hook}>
            <Screen isHidden={step.isHidden}>{step.children}</Screen>
        </AnyEffectHookProvider>
    );

    const commits: string[][] = [];
    const errors: string[] = [];
    const runStep = (step: () => void) => {
        try {
            step();
        } catch (error) {
            errors.push(String(error));
        }
        commits.push(drainLog());
    };

    // The mount is recorded like every other step, because a setup that throws throws out of the render itself.
    let controls: ReturnType<typeof render> | undefined;
    const [first, ...rest] = steps;
    runStep(() => {
        controls = render(tree(first));
    });

    const rerenderStep = (step: Step) => controls?.rerender(tree(step));
    for (const step of rest) {
        runStep(() => rerenderStep(step));
    }
    runStep(() => controls?.unmount());

    return {commits, errors};
}

describe('ScreenActivityEffectBoundaryProvider', () => {
    beforeEach(() => {
        resetLog();
    });

    describe('a cleanup that throws', () => {
        it('releases the rest of the screen when one cleanup throws at the teardown', () => {
            // Given a screen holding a cleanup that throws next to effects that have to be released too
            const steps = [visible(<ThrowingScreenContent />)];

            // When the screen leaves the navigation stack
            const live = runCatching(useEffect, LiveScreen, steps);
            const activity = runCatching(useScreenActivityEffect, ActivityScreen, steps);

            // Then React runs every cleanup of the deleted tree and reports the error afterwards
            expect(live.commits).toEqual([
                ['setup:throwing:a', 'setup:s:a', 'setup:survivor:a'],
                ['cleanup:throwing:a', 'cleanup:s:a', 'cleanup:survivor:a'],
            ]);
            expect(live.errors).toEqual(['Error: cleanup of throwing threw']);

            // And the boundary owes the screen the same, because one effect with a bug must not hold the others open
            expect(activity.commits).toEqual(live.commits);
            expect(activity.errors).toEqual(live.errors);
        });

        it('releases the rest of the screen when one cleanup throws on the sweep of a reveal', () => {
            // Given a throwing cleanup that is swept on a reveal, because its component went away behind the cover
            const steps = [
                visible(<ThrowingScreenContent />),
                hidden(<ThrowingScreenContent />),
                hidden(<ThrowingScreenContent hasThrowing={false} />),
                visible(<ThrowingScreenContent hasThrowing={false} />),
            ];

            // When the screen is revealed
            const live = runCatching(useEffect, LiveScreen, steps);
            const activity = runCatching(useScreenActivityEffect, ActivityScreen, steps);

            // Then a destroy that throws takes the tree down with it, so the rest of the screen is released either way
            expect(live.commits).toEqual([
                ['setup:throwing:a', 'setup:s:a', 'setup:survivor:a'],
                [],
                ['cleanup:throwing:a', 'cleanup:s:a', 'cleanup:survivor:a'],
                ['setup:survivor:a'],
                ['cleanup:survivor:a'],
            ]);
            expect(activity.commits).toEqual([['setup:throwing:a', 'setup:s:a', 'setup:survivor:a'], [], [], ['cleanup:throwing:a', 'cleanup:s:a', 'cleanup:survivor:a'], []]);
            expect(activity.errors).toEqual(live.errors);
        });

        it('releases the rest of the screen when a dependency cleanup throws on the reveal', () => {
            // Given a setup whose cleanup throws and a dependency change which Activity defers until the reveal
            const content = (value: string) => <ThrowingChangingScreenContent value={value} />;
            const liveSteps = [visible(content('a')), visible(content('b'))];
            const activitySteps = [visible(content('a')), hidden(content('a')), hidden(content('b')), visible(content('b'))];

            // When the same change runs on a live screen and on a screen whose previous setup survived the cover
            const live = runCatching(useEffect, LiveScreen, liveSteps);
            const activity = runCatching(useScreenActivityEffect, ActivityScreen, activitySteps);

            // Then plain useEffect runs the next setup before React takes the failed tree down
            expect(live.commits.flat()).toEqual([
                'setup:throwingChanging:a',
                'setup:s:a',
                'setup:survivor:a',
                'cleanup:throwingChanging:a',
                'cleanup:s:a',
                'setup:throwingChanging:b',
                'setup:s:b',
                'cleanup:throwingChanging:b',
                'cleanup:s:b',
                'cleanup:survivor:a',
            ]);

            // And the covered screen runs the very same calls: the error is reported after the release phase and the
            // setup of the call site whose previous cleanup threw still runs, exactly as it runs on the live screen
            expect(activity.commits.flat()).toEqual(live.commits.flat());
            expect(activity.errors).toEqual(live.errors);
        });
    });

    describe('two cleanups that throw in one batch', () => {
        it('reports every error of the teardown and rethrows only the first', () => {
            // Given a screen holding two cleanups that both throw when it leaves the stack
            const reported = jest.spyOn(console, 'error').mockImplementation(() => {});
            const steps = [visible(<TwoThrowingCleanupsScreenContent />)];

            // When the screen leaves the navigation stack
            const activity = runCatching(useScreenActivityEffect, ActivityScreen, steps);
            const reportedErrors = reported.mock.calls.map((call) => String(call.at(0)));
            reported.mockRestore();

            // Then every cleanup ran, the first error is what the teardown throws, and the second is reported rather
            // than swallowed, which is how React answers for more than one failing destroy
            expect(activity.commits).toEqual([
                ['setup:throwing:a', 'setup:secondThrowing:a', 'setup:survivor:a'],
                ['cleanup:throwing:a', 'cleanup:secondThrowing:a', 'cleanup:survivor:a'],
            ]);
            expect(activity.errors).toEqual(['Error: cleanup of throwing threw']);
            expect(reportedErrors.filter((message) => message.includes('cleanup of secondThrowing threw'))).toHaveLength(1);
        });
    });

    describe('a second boundary next to it', () => {
        function LeftEffect() {
            useAnyEffect(track('left:a'), []);
            return null;
        }

        function RightEffect() {
            useAnyEffect(track('right:a'), []);
            return null;
        }

        it('keeps two screens with a boundary each independent', () => {
            // Given two screens of one navigator, each with its own screen of the behavior under test
            const runStack = (hook: AnyEffectHook, Screen: ComponentType<ScreenProps>) => {
                resetLog();
                const stack = (left: Step, right: Step) => (
                    <AnyEffectHookProvider hook={hook}>
                        <Screen isHidden={left.isHidden}>{left.children}</Screen>
                        <Screen isHidden={right.isHidden}>{right.children}</Screen>
                    </AnyEffectHookProvider>
                );

                const {rerender, unmount} = render(stack(visible(<LeftEffect />), visible(<RightEffect />)));
                const commits = [drainLog()];

                rerender(stack(hidden(<LeftEffect />), visible(<RightEffect />)));
                commits.push(drainLog());

                rerender(stack(hidden(<LeftEffect />), visible(null)));
                commits.push(drainLog());

                rerender(stack(visible(<LeftEffect />), visible(null)));
                commits.push(drainLog());

                unmount();
                commits.push(drainLog());
                return commits;
            };

            // When the left screen is covered and a component of the visible right screen then goes away
            // Then the cover of one screen defers nothing of the other, because each boundary answers for itself alone
            expect(runStack(useScreenActivityEffect, ActivityScreen)).toEqual([['setup:left:a', 'setup:right:a'], [], ['cleanup:right:a'], [], ['cleanup:left:a']]);

            // And that is what two screens that both stay live in the background do
            expect(runStack(useEffect, LiveScreen)).toEqual(runStack(useScreenActivityEffect, ActivityScreen));
        });
    });

    describe('a boundary nested inside another screen', () => {
        const coverAndReveal = [visible(<Subject value="a" />), hidden(<Subject value="a" />), visible(<Subject value="a" />)];

        it('keeps the setup when the screen holding the nested one hides', () => {
            // Given a screen of a nested navigator, whose boundary sits inside the <Activity> of the screen holding it
            // When the outer screen is covered and revealed
            const nested = runOn(useScreenActivityEffect, OuterHiddenNestedScreen, coverAndReveal);

            // Then the inner boundary keeps the setup, because the boundary above holds its whole set as one entry
            expect(nested).toEqual(runOn(useEffect, LiveScreen, coverAndReveal));
        });

        it('keeps the setup two nested navigators deep', () => {
            // Given the same screen one navigator deeper, so two boundaries hand their set to the one above them
            // When the outermost screen is covered and revealed
            const nested = runOn(useScreenActivityEffect, TwiceNestedScreen, coverAndReveal);

            // Then the depth changes nothing, because every boundary asks the one above it the same question
            expect(nested).toEqual(runOn(useEffect, LiveScreen, coverAndReveal));
        });

        it('releases the setup when the screen holding the nested one leaves the stack while covered', () => {
            // Given a nested screen whose outer screen is popped without ever being revealed again
            const steps = [visible(<Subject value="a" />), hidden(<Subject value="a" />)];

            // When the outer screen leaves the navigation stack
            const nested = runOn(useScreenActivityEffect, OuterHiddenNestedScreen, steps);

            // Then the entry the outer boundary holds for the inner one releases the whole nested screen
            expect(nested).toEqual([['setup:s:a'], [], ['cleanup:s:a']]);
            expect(nested.flat()).toEqual(runOn(useEffect, LiveScreen, steps).flat());
        });

        it('releases a component of the nested screen that was removed while the outer screen was hidden', () => {
            // Given two components on a nested screen, of which one goes away while the outer screen is covered
            const both = (
                <>
                    <Subject value="a" />
                    <Subject value="b" />
                </>
            );
            const steps = [visible(both), hidden(both), hidden(<Subject value="a" />), visible(<Subject value="a" />)];

            // When the outer screen is revealed
            const nested = runOn(useScreenActivityEffect, OuterHiddenNestedScreen, steps);
            const live = runOn(useEffect, LiveScreen, steps);

            // Then the sweep of the inner boundary answers for it, exactly as it does on a screen of its own
            expect(live).toEqual([['setup:s:a', 'setup:s:b'], [], ['cleanup:s:b'], [], ['cleanup:s:a']]);
            expect(nested).toEqual([['setup:s:a', 'setup:s:b'], [], [], ['cleanup:s:b'], ['cleanup:s:a']]);
            expect(nested.flat()).toEqual(live.flat());
        });

        it('releases the nested screen that was removed while the screen holding it was hidden', () => {
            // Given a nested screen whose whole boundary goes away behind the cover, on an outer screen with an effect
            const content = (hasNested: boolean) => (
                <>
                    <Subject value="outer" />
                    {hasNested ? (
                        <ActivityScreen isHidden={false}>
                            <Subject value="a" />
                        </ActivityScreen>
                    ) : null}
                </>
            );
            const steps = [visible(content(true)), hidden(content(true)), hidden(content(false)), visible(content(false))];

            // When the outer screen is revealed without it
            const removed = runOn(useScreenActivityEffect, ActivityScreen, steps);
            const live = runOn(useEffect, LiveScreen, steps);

            // Then the reveal releases it, because the entry the outer boundary holds for a nested boundary is marked
            // and swept like any other entry whose cleanup a cover skipped and which did not come back
            expect(live).toEqual([['setup:s:outer', 'setup:s:a'], [], ['cleanup:s:a'], [], ['cleanup:s:outer']]);
            expect(removed).toEqual([['setup:s:outer', 'setup:s:a'], [], [], ['cleanup:s:a'], ['cleanup:s:outer']]);
            expect(removed.flat()).toEqual(live.flat());
        });

        it('releases through the boundary above before a fresh nested boundary sets its subtree up', () => {
            // Given a nested screen removed behind the cover and a new one mounting after a reveal that ran no effect,
            // so the stale entry sits in the outer boundary while the new subtree belongs to a brand new inner one
            const nested = (children: ReactNode) => <ActivityScreen isHidden={false}>{children}</ActivityScreen>;
            const steps = [visible(nested(<Subject value="a" />)), hidden(nested(<Subject value="a" />)), hidden(null), visible(null), visible(nested(<Subject value="b" />))];

            // When the new nested screen mounts
            const removed = runOn(useScreenActivityEffect, ActivityScreen, steps);
            const live = runOn(useEffect, LiveScreen, steps);

            // Then the stale entry releases before the new subtree sets up, because a fresh boundary hands its reveal
            // work to the highest boundary still revealing rather than draining it below the sweep of the outer one
            expect(live).toEqual([['setup:s:a'], [], ['cleanup:s:a'], [], ['setup:s:b'], ['cleanup:s:b']]);
            expect(removed).toEqual([['setup:s:a'], [], [], [], ['cleanup:s:a', 'setup:s:b'], ['cleanup:s:b']]);
            expect(removed.flat()).toEqual(live.flat());
        });

        it('holds a nested screen removed while hidden until the outer screen runs an effect again', () => {
            // Given the same removal on an outer screen that has no effect of its own to run on the reveal
            const nested = (
                <ActivityScreen isHidden={false}>
                    <Subject value="a" />
                </ActivityScreen>
            );
            const steps = [visible(nested), hidden(nested), hidden(null), visible(null)];

            // When the outer screen is revealed empty
            const removed = runOn(useScreenActivityEffect, ActivityScreen, steps);

            // Then the sweep waits for evidence that bodies run again, exactly as it does for a call site of its own,
            // so the release lands when the outer screen leaves the stack
            expect(removed).toEqual([['setup:s:a'], [], [], [], ['cleanup:s:a']]);
        });

        it('keeps the setup live when the boundary of the nested screen itself hides', () => {
            // Given the same nesting, with the screen holding the nested one staying visible
            // When the nested screen is covered by a screen of its own navigator and revealed again
            const nested = runOn(useScreenActivityEffect, InnerHiddenNestedScreen, coverAndReveal);

            // Then the boundary that hid is above its own <Activity>, so it keeps the setup exactly as a flat screen does
            expect(nested).toEqual(runOn(useEffect, LiveScreen, coverAndReveal));
        });

        it('keeps the setup live when the covers of the outer and inner screens overlap', () => {
            // Given two nested screens which can each be covered while the other one is already hidden
            const innerFirst = [
                overlappingNestedScreen(false, false),
                overlappingNestedScreen(false, true),
                overlappingNestedScreen(true, true),
                overlappingNestedScreen(false, true),
                overlappingNestedScreen(false, false),
            ];
            const outerFirst = [
                overlappingNestedScreen(false, false),
                overlappingNestedScreen(true, false),
                overlappingNestedScreen(true, true),
                overlappingNestedScreen(false, true),
                overlappingNestedScreen(false, false),
            ];

            // When the outer cover starts before or after the inner one and both screens are eventually revealed
            const innerFirstCalls = record(innerFirst);
            resetLog();
            const outerFirstCalls = record(outerFirst);

            // Then the boundary handoff keeps one setup alive until the outer screen leaves the stack in both orders
            const expected = [['setup:s:a'], [], [], [], [], ['cleanup:s:a']];
            expect(innerFirstCalls).toEqual(expected);
            expect(outerFirstCalls).toEqual(expected);
        });
    });

    describe('a setup that throws', () => {
        it('leaves the boundary holding nothing for the call site whose setup failed', () => {
            // Given a screen whose first effect throws while it is acquiring what it needs
            const steps = [visible(<ThrowingSetupScreenContent />)];

            // When the screen mounts and then leaves the navigation stack
            const live = runCatching(useEffect, LiveScreen, steps);
            const activity = runCatching(useScreenActivityEffect, ActivityScreen, steps);

            // Then the failed setup left no cleanup behind, and the rest of the screen is set up and released as usual
            expect(live.commits).toEqual([['setup:throwingSetup:a', 'setup:survivor:a', 'cleanup:survivor:a'], []]);
            expect(live.errors).toEqual(['Error: setup of throwingSetup threw']);

            // And the boundary is the same, because an entry only counts as set up once its body returned
            expect(activity.commits).toEqual(live.commits);
            expect(activity.errors).toEqual(live.errors);
        });

        it('runs the other setups of the reveal when one setup throws', () => {
            // Given a setup that throws for the value a dependency change moved to behind the cover
            const content = (value: string) => (
                <>
                    <ThrowingChangingSetup value={value} />
                    <Subject value={value} />
                </>
            );
            const liveSteps = [visible(content('a')), visible(content('b'))];
            const activitySteps = [visible(content('a')), hidden(content('a')), hidden(content('b')), visible(content('b'))];

            // When the same change runs on a live screen and lands on the reveal of a covered one
            const live = runCatching(useEffect, LiveScreen, liveSteps);
            const activity = runCatching(useScreenActivityEffect, ActivityScreen, activitySteps);

            // Then the reveal releases both call sites, runs the setup that fails, and still runs the other one,
            // which is what the phases of a live commit do with a create that throws
            expect(live.commits.flat()).toEqual(['setup:throwingSetup:a', 'setup:s:a', 'cleanup:throwingSetup:a', 'cleanup:s:a', 'setup:throwingSetup:b', 'setup:s:b', 'cleanup:s:b']);
            expect(activity.commits.flat()).toEqual(live.commits.flat());
            expect(activity.errors).toEqual(live.errors);
        });
    });

    describe('a boundary that reports a hidden screen over a live subtree', () => {
        it('still runs the next setup when the release it runs inline throws', () => {
            // Given the drifted shape, which is the one place a body releases inline because no destroy ran before it
            const reported = jest.spyOn(console, 'error').mockImplementation(() => {});
            const steps = [visible(<ThrowingChangingEffect value="a" />), visible(<ThrowingChangingEffect value="b" />)];

            // When the dependency changes and the release the body runs first throws
            const drifted = runCatching(useScreenActivityEffect, DriftedScreen, steps);
            reported.mockRestore();

            // Then the setup of the new dependency still ran and the error surfaced after it, and the error taking the
            // unprotected tree down releases that setup in the same commit, as it does with useEffect on a live screen
            expect(drifted.commits).toEqual([['setup:throwingChanging:a'], ['cleanup:throwingChanging:a', 'setup:throwingChanging:b', 'cleanup:throwingChanging:b'], []]);
            expect(drifted.errors).toEqual(['Error: cleanup of throwingChanging:a threw']);
        });

        it('reports the drift in development, which is the only place the mis-wiring can be seen', () => {
            // Given a boundary whose isHidden no longer describes the mode of the <Activity> it wraps
            const reported = jest.spyOn(console, 'error').mockImplementation(() => {});

            // When an effect of the subtree runs its body, which a hidden screen never does
            const drifted = runOn(useScreenActivityEffect, DriftedScreen, [visible(<Subject value="a" />), visible(null)]);
            const messages = reported.mock.calls.map((call) => String(call.at(0)));
            reported.mockRestore();

            // Then the boundary says so, because every cleanup of the subtree is deferred for as long as it lasts
            expect(messages.filter((message) => message.includes('has drifted from the mode of the <Activity>'))).toHaveLength(1);

            // And the deferred cleanup is the damage the message is about: the removal released nothing
            expect(drifted).toEqual([['setup:s:a'], [], ['cleanup:s:a']]);
        });
    });

    describe('what a development build says about deferred releases', () => {
        it('reports how many cleanups of removals behind a cover the pop of a visible screen still owed', () => {
            // Given a component removed behind the cover of a screen whose reveal ran no effect, so no sweep had
            // evidence to release it and its cleanup waits all the way to the pop
            // The spy can hand back a mock the environment already holds, so only the calls of this test count.
            const reported = jest.spyOn(console, 'debug').mockImplementation(() => {});
            reported.mockClear();
            const steps = [visible(<Subject value="a" />), hidden(<Subject value="a" />), hidden(null), visible(null)];

            // When the screen leaves the stack while visible
            runOn(useScreenActivityEffect, ActivityScreen, steps);
            const messages = reported.mock.calls.map((call) => String(call.at(0)));
            reported.mockRestore();

            // Then the boundary says how far these releases ran from their removal, because nothing else shows it
            expect(messages.filter((message) => message.includes('1 cleanup(s) deferred since a removal behind a cover'))).toHaveLength(1);
        });

        it('says nothing about the pop of a covered screen, whose deferrals are the ordinary deep link pop', () => {
            // Given a screen that leaves the stack while covered, where every entry is deferred by the cover itself
            const reported = jest.spyOn(console, 'debug').mockImplementation(() => {});
            reported.mockClear();
            const steps = [visible(<Subject value="a" />), hidden(<Subject value="a" />)];

            // When the screen leaves the stack without a reveal
            runOn(useScreenActivityEffect, ActivityScreen, steps);
            const messages = reported.mock.calls.map((call) => String(call.at(0)));
            reported.mockRestore();

            // Then the pop stays quiet, because these releases run exactly where a popped screen runs them
            expect(messages.filter((message) => message.includes('deferred since a removal'))).toHaveLength(0);
        });
    });

    describe('the StrictMode gate of a screen that opted into Activity', () => {
        it('puts both hooks through the remount cycle of the gate', () => {
            // Given the gate that qualifies a screen for <Activity> by mounting its effects twice in development
            const steps = [visible(<Subject value="a" />)];

            // When the screen mounts and then leaves the stack
            const live = runOn(useEffect, GatedLiveScreen, steps);
            const activity = runOn(useScreenActivityEffect, GatedActivityScreen, steps);

            // Then the hook goes through the cycle too, because the gate removes the component rather than covering it
            expect(live).toEqual([['setup:s:a', 'cleanup:s:a', 'setup:s:a'], ['cleanup:s:a']]);
            expect(activity).toEqual(live);
        });

        it('sets up again when the remount cycle takes the boundary with it', () => {
            // Given a StrictMode above the boundary, which remounts the boundary rather than the screen content
            const steps = [visible(<Subject value="a" />)];

            // When the screen mounts and then leaves the stack
            const live = runOn(useEffect, GatedLiveScreen, steps);
            const activity = runOn(useScreenActivityEffect, GateAboveBoundaryScreen, steps);

            // Then the effect is set up again on the second mount, because the entry went away with the first boundary
            expect(activity).toEqual([['setup:s:a', 'cleanup:s:a', 'setup:s:a'], ['cleanup:s:a']]);
            expect(activity).toEqual(live);
        });

        it('keeps the setup live through a cover and reveal cycle below the gate', () => {
            // Given an effect that has already been through the remount cycle of the gate
            const steps = [visible(<Subject value="a" />), hidden(<Subject value="a" />), visible(<Subject value="a" />)];

            // When the screen is covered and revealed
            const live = runOn(useEffect, GatedLiveScreen, steps);
            const activity = runOn(useScreenActivityEffect, GatedActivityScreen, steps);

            // Then the gate changed nothing about the cover, which is the point of qualifying a screen with it
            expect(live).toEqual([['setup:s:a', 'cleanup:s:a', 'setup:s:a'], [], [], ['cleanup:s:a']]);
            expect(activity).toEqual(live);
        });
    });
});
