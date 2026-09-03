import useScreenActivityEffect from '@hooks/useScreenActivityEffect';

import React, {useEffect} from 'react';

import {
    ActivityScreen,
    expectEveryConfigToMatch,
    hidden,
    leaf,
    Leaf,
    LiveScreen,
    log,
    resetLog,
    runEveryConfig,
    runOn,
    Subject,
    track,
    useAnyEffect,
    visible,
} from '../../../utils/ScreenActivityEffectTestUtils';

/**
 * Every test here renders one structure on useEffect and on useScreenActivityEffect, once on a screen that stays live
 * in the background and once on a screen wrapped in an <Activity>, and compares the effect calls commit by commit. The
 * last commit of every scenario is the screen leaving the navigation stack, so every test also covers the teardown.
 *
 * runs.liveUseEffect is the baseline the hook is written to reproduce, and runs.activityUseEffect is what an effect of
 * a covered screen gets today, which is what the hook exists to avoid.
 */

/** A setup that returns nothing, so a release of it is something no log can show. */
function WithoutCleanup({value}: {value: string}) {
    useAnyEffect(() => log(`setup:s:${value}`), [value]);
    return null;
}

/** Two components with an effect each, where the second can go away without the first one remounting with it. */
function Siblings({value, hasSecond = true}: {value: string; hasSecond?: boolean}) {
    return (
        <>
            <Subject
                name="s1"
                value={value}
            />
            {hasSecond ? (
                <Subject
                    name="s2"
                    value={value}
                />
            ) : null}
        </>
    );
}

/** A parent with an effect of its own around a child with one, which is the smallest tree React orders. */
function Parent({value}: {value: string}) {
    useAnyEffect(track(`parent:${value}`), [value]);
    return (
        <Subject
            name="child"
            value={value}
        />
    );
}

let setupCount = 0;

/** A subject whose calls name the setup they came from, so a release can be tied to the instance that owns it. */
function CountedSubject({value}: {value: string}) {
    useAnyEffect(() => {
        setupCount += 1;
        const name = `s${setupCount}:${value}`;
        log(`setup:${name}`);
        return () => log(`cleanup:${name}`);
    }, [value]);
    return null;
}

/** Two call sites in one component, of which only the second depends on the value. */
function Pair({value}: {value: string}) {
    useAnyEffect(track('first:a'), []);
    useAnyEffect(track(`second:${value}`), [value]);
    return null;
}

describe('useScreenActivityEffect compared to useEffect', () => {
    beforeEach(() => {
        resetLog();
    });

    describe('a screen that never hides', () => {
        it('runs the same calls through a mount, a dependency change, a removal and a remount', () => {
            // Given one effect on a screen that is never covered, which is what most of the app renders
            const steps = [visible(<Subject value="a" />), visible(<Subject value="b" />), visible(null), visible(<Subject value="c" />)];

            // When the dependency changes, the component goes away, and a new one takes its place
            const runs = runEveryConfig(steps);

            // Then the hook is useEffect, because no cleanup of the run ever arrived during a screen teardown
            expectEveryConfigToMatch(runs, [['setup:s:a'], ['cleanup:s:a', 'setup:s:b'], ['cleanup:s:b'], ['setup:s:c'], ['cleanup:s:c']]);
        });

        it('runs the same calls in the same order for two sibling components', () => {
            // Given two components with an effect each, so the calls of one can be told from the calls of the other
            const steps = [visible(<Siblings value="a" />), visible(<Siblings value="b" />), visible(null)];

            // When the dependency of both changes and both are then removed
            const runs = runEveryConfig(steps);

            // Then both release before either sets up again, because that is the order of the phases of one commit
            expectEveryConfigToMatch(runs, [['setup:s1:a', 'setup:s2:a'], ['cleanup:s1:a', 'cleanup:s2:a', 'setup:s1:b', 'setup:s2:b'], ['cleanup:s1:b', 'cleanup:s2:b'], []]);
        });

        it('runs the same calls in the same order for a parent and its child', () => {
            // Given a parent and a child that both have an effect, which is how a screen is really built
            const steps = [visible(<Parent value="a" />), visible(<Parent value="b" />), visible(null)];

            // When the dependency of both changes and the whole subtree is then removed
            const runs = runEveryConfig(steps);

            // Then the child sets up first and the parent releases first, because React mounts up and tears down down
            expectEveryConfigToMatch(runs, [
                ['setup:child:a', 'setup:parent:a'],
                ['cleanup:child:a', 'cleanup:parent:a', 'setup:child:b', 'setup:parent:b'],
                ['cleanup:parent:b', 'cleanup:child:b'],
                [],
            ]);
        });

        it('runs the same calls when the screen leaves the stack with two components still on it', () => {
            // Given two components that are still mounted when the screen goes away, which is the ordinary pop
            const steps = [visible(<Siblings value="a" />)];

            // When the screen leaves the navigation stack
            const runs = runEveryConfig(steps);

            // Then the boundary releases what it holds in the order React would have released it in
            expectEveryConfigToMatch(runs, [
                ['setup:s1:a', 'setup:s2:a'],
                ['cleanup:s1:a', 'cleanup:s2:a'],
            ]);
        });
    });

    describe('a cover and a reveal', () => {
        it('keeps the setup live through a cover and reveal cycle, exactly as the live screen does', () => {
            // Given an effect holding something the screen still needs while another screen is on top of it
            const steps = [visible(<Subject value="a" />), hidden(<Subject value="a" />), visible(<Subject value="a" />)];

            // When the screen is covered, revealed again, and finally leaves the stack
            const runs = runEveryConfig(steps);

            // Then the cover and the reveal run nothing at all, which is what the screen that stays live does
            const expected = [['setup:s:a'], [], [], ['cleanup:s:a']];
            expect(runs.liveUseEffect).toEqual(expected);
            expect(runs.liveScreenActivityEffect).toEqual(expected);
            expect(runs.activityScreenActivityEffect).toEqual(expected);

            // And plain useEffect releases on the cover and acquires again on the reveal, which is the churn to avoid
            expect(runs.activityUseEffect).toEqual([['setup:s:a'], ['cleanup:s:a'], ['setup:s:a'], ['cleanup:s:a']]);
        });

        it('keeps the setup live through two cover and reveal cycles', () => {
            // Given an effect on a screen the user leaves and comes back to twice, which a stack does all the time
            const steps = [visible(<Subject value="a" />), hidden(<Subject value="a" />), visible(<Subject value="a" />), hidden(<Subject value="a" />), visible(<Subject value="a" />)];

            // When the screen goes through two full cover and reveal cycles
            const runs = runEveryConfig(steps);

            // Then nothing accumulates, because the reveal leaves the entry the boundary already holds alone
            const expected = [['setup:s:a'], [], [], [], [], ['cleanup:s:a']];
            expect(runs.liveUseEffect).toEqual(expected);
            expect(runs.activityScreenActivityEffect).toEqual(expected);
        });

        it('keeps a setup that returned no cleanup live through a cover and reveal cycle', () => {
            // Given an effect that returns nothing, so running its body twice is the only thing that can be seen
            const steps = [visible(<WithoutCleanup value="a" />), hidden(<WithoutCleanup value="a" />), visible(<WithoutCleanup value="a" />)];

            // When the screen is covered and revealed again
            const runs = runEveryConfig(steps);

            // Then the body runs once, because the entry the boundary holds is set up even with no cleanup to keep
            const expected = [['setup:s:a'], [], [], []];
            expect(runs.liveUseEffect).toEqual(expected);
            expect(runs.activityScreenActivityEffect).toEqual(expected);
        });

        it('runs the cleanup when the screen leaves the stack while it is still covered', () => {
            // Given an effect on a screen that is popped from under the screen covering it, which a deep link does
            const steps = [visible(<Subject value="a" />), hidden(<Subject value="a" />)];

            // When the screen leaves the stack without ever being revealed
            const runs = runEveryConfig(steps);

            // Then the boundary releases on its own unmount, so nothing is left behind by the screen that never came back
            const expected = [['setup:s:a'], [], ['cleanup:s:a']];
            expect(runs.liveUseEffect).toEqual(expected);
            expect(runs.activityScreenActivityEffect).toEqual(expected);
        });

        it('runs a dependency change that lands together with the reveal in that same commit', () => {
            // Given an effect whose dependency changes in the very commit that reveals the screen
            const steps = [visible(<Subject value="a" />), hidden(<Subject value="a" />), visible(<Subject value="b" />)];

            // When the screen is revealed with the new dependency
            const runs = runEveryConfig(steps);

            // Then the reveal releases the old setup and runs the new one, because the dependencies really did change
            const expected = [['setup:s:a'], [], ['cleanup:s:a', 'setup:s:b'], ['cleanup:s:b']];
            expect(runs.liveUseEffect).toEqual(expected);
            expect(runs.activityScreenActivityEffect).toEqual(expected);
        });

        it('runs a dependency change that landed while the screen was hidden on the reveal', () => {
            // Given an effect whose dependency changes while the screen is covered, which Onyx does behind the cover
            const steps = [visible(<Subject value="a" />), hidden(<Subject value="a" />), hidden(<Subject value="b" />), visible(<Subject value="b" />)];

            // When the screen is revealed after the change
            const runs = runEveryConfig(steps);

            expect(runs.liveUseEffect).toEqual([['setup:s:a'], [], ['cleanup:s:a', 'setup:s:b'], [], ['cleanup:s:b']]);

            // Then the same calls run in the same order, moved from the commit of the change to the commit of the reveal
            expect(runs.activityScreenActivityEffect).toEqual([['setup:s:a'], [], [], ['cleanup:s:a', 'setup:s:b'], ['cleanup:s:b']]);
        });

        it('runs a dependency change that lands together with the cover on the reveal', () => {
            // Given an effect whose dependency changes in the very commit that covers the screen
            const steps = [visible(<Subject value="a" />), hidden(<Subject value="b" />), visible(<Subject value="b" />)];

            // When the screen is covered with the new dependency and revealed later
            const runs = runEveryConfig(steps);

            // Then the change is not lost, only deferred, because the entry keeps the dependencies it is live for
            expect(runs.liveUseEffect).toEqual([['setup:s:a'], ['cleanup:s:a', 'setup:s:b'], [], ['cleanup:s:b']]);
            expect(runs.activityScreenActivityEffect).toEqual([['setup:s:a'], [], ['cleanup:s:a', 'setup:s:b'], ['cleanup:s:b']]);
        });

        it('runs the setup of a component mounted while the screen was hidden on the reveal, as plain useEffect does', () => {
            // Given a component that appears while the screen is already covered
            const steps = [visible(null), hidden(null), hidden(<Subject value="a" />), visible(<Subject value="a" />)];

            // When the screen is revealed
            const runs = runEveryConfig(steps);

            expect(runs.liveUseEffect).toEqual([[], [], ['setup:s:a'], [], ['cleanup:s:a']]);

            // Then the setup waits for the reveal, and that deferral is the <Activity> rather than the hook
            const deferred = [[], [], [], ['setup:s:a'], ['cleanup:s:a']];
            expect(runs.activityScreenActivityEffect).toEqual(deferred);
            expect(runs.activityUseEffect).toEqual(deferred);
        });

        it('runs the setup of a screen that mounted hidden on the reveal, as plain useEffect does', () => {
            // Given a screen that mounts under another one, which is what a pre-mounted destination does
            const steps = [hidden(<Subject value="a" />), visible(<Subject value="a" />)];

            // When the screen is revealed
            const runs = runEveryConfig(steps);

            // Then its mount effects run on the reveal, which is why the wrapper keeps the first frame visible
            expect(runs.liveUseEffect).toEqual([['setup:s:a'], [], ['cleanup:s:a']]);

            const deferred = [[], ['setup:s:a'], ['cleanup:s:a']];
            expect(runs.activityScreenActivityEffect).toEqual(deferred);
            expect(runs.activityUseEffect).toEqual(deferred);
        });

        it('never runs a component that mounted and was removed while the screen was hidden, as plain useEffect does', () => {
            // Given a component that appears and goes away again entirely behind the cover
            const steps = [visible(null), hidden(null), hidden(<Subject value="a" />), hidden(null), visible(null)];

            // When the screen is revealed after it is gone
            const runs = runEveryConfig(steps);

            // Then nothing ran at all, because a hidden subtree never mounted its effects in the first place
            expect(runs.liveUseEffect).toEqual([[], [], ['setup:s:a'], ['cleanup:s:a'], [], []]);

            const emptyCommits = [[], [], [], [], [], []];
            expect(runs.activityScreenActivityEffect).toEqual(emptyCommits);
            expect(runs.activityUseEffect).toEqual(emptyCommits);
        });
    });

    describe('removing the component', () => {
        it('runs the cleanup at once while the screen is visible', () => {
            // Given an effect of a component that goes away while the user is looking at the screen
            const steps = [visible(<Subject value="a" />), visible(null)];

            // When the component is removed
            const runs = runEveryConfig(steps);

            // Then the release is immediate, because a cleanup that arrives outside a screen teardown belongs to the component
            expectEveryConfigToMatch(runs, [['setup:s:a'], ['cleanup:s:a'], []]);
        });

        it('runs the cleanup at once after a cover and reveal cycle', () => {
            // Given a component that survived a cover, so the boundary is already holding its entry
            const steps = [visible(<Subject value="a" />), hidden(<Subject value="a" />), visible(<Subject value="a" />), visible(null)];

            // When the component is removed after the reveal
            const runs = runEveryConfig(steps);

            // Then it still releases at once, because the reveal registered the entry again
            const expected = [['setup:s:a'], [], [], ['cleanup:s:a'], []];
            expect(runs.liveUseEffect).toEqual(expected);
            expect(runs.activityScreenActivityEffect).toEqual(expected);
        });

        it('runs the cleanup at once when the removal lands together with the reveal', () => {
            // Given a component that is removed in the very commit that reveals the screen, next to one that stays
            const steps = [
                visible(<Siblings value="a" />),
                hidden(<Siblings value="a" />),
                visible(
                    <Siblings
                        value="a"
                        hasSecond={false}
                    />,
                ),
            ];

            // When the screen is revealed without it
            const runs = runEveryConfig(steps);

            // Then the boundary sweeps the entry no reveal claimed, so the release lands in that same commit
            const expected = [['setup:s1:a', 'setup:s2:a'], [], ['cleanup:s2:a'], ['cleanup:s1:a']];
            expect(runs.liveUseEffect).toEqual(expected);
            expect(runs.activityScreenActivityEffect).toEqual(expected);
        });

        it('defers the cleanup of a component removed while hidden until the screen runs an effect again', () => {
            // Given the only effect of the screen going away behind the cover, so the reveal runs no body of its own,
            // and a component mounting afterwards from state inside the screen, so that commit renders no boundary
            const steps = [
                visible(
                    <Leaf>
                        <Subject value="a" />
                    </Leaf>,
                ),
                hidden(
                    <Leaf>
                        <Subject value="a" />
                    </Leaf>,
                ),
                hidden(<Leaf>{null}</Leaf>),
                visible(<Leaf>{null}</Leaf>),
                leaf(<Subject value="b" />),
            ];

            // When the screen is revealed and a component with an effect mounts on it afterwards
            const runs = runEveryConfig(steps);

            expect(runs.liveUseEffect).toEqual([['setup:s:a'], [], ['cleanup:s:a'], [], ['setup:s:b'], ['cleanup:s:b']]);

            // Then the reveal itself sweeps nothing, because a commit that ran no effect of the screen says nothing
            // about the one that is gone, and the next effect that runs releases it right before its own setup
            expect(runs.activityScreenActivityEffect).toEqual([['setup:s:a'], [], [], [], ['cleanup:s:a', 'setup:s:b'], ['cleanup:s:b']]);
        });

        it('sets up a component that mounts from state inside the screen after a reveal that ran no effect', () => {
            // Given an empty screen that is covered and revealed, and a component mounting afterwards from a leaf
            const steps = [visible(<Leaf>{null}</Leaf>), hidden(<Leaf>{null}</Leaf>), visible(<Leaf>{null}</Leaf>), leaf(<Subject value="a" />)];

            // When the component mounts in a commit that renders no boundary
            const runs = runEveryConfig(steps);

            // Then its setup runs in that commit, because the reveal batched nothing past its own commit
            expectEveryConfigToMatch(runs, [[], [], [], ['setup:s:a'], ['cleanup:s:a']]);
        });

        it('leaves nothing behind for a component that mounts and goes away between two reveals that ran no effect', () => {
            // Given the same component removed again from the leaf before the screen is covered and revealed once more
            const steps = [
                visible(<Leaf>{null}</Leaf>),
                hidden(<Leaf>{null}</Leaf>),
                visible(<Leaf>{null}</Leaf>),
                leaf(<Subject value="a" />),
                leaf(null),
                hidden(<Leaf>{null}</Leaf>),
                visible(<Leaf>{null}</Leaf>),
            ];

            // When the screen goes through the second cover and reveal
            const runs = runEveryConfig(steps);

            // Then the second reveal runs nothing, because no setup of the removed component was left in any queue
            expectEveryConfigToMatch(runs, [[], [], [], ['setup:s:a'], ['cleanup:s:a'], [], [], []]);
        });

        it('runs the cleanup of a component removed while hidden when the screen leaves the stack before any reveal', () => {
            // Given a component that goes away behind the cover of a screen that is then popped
            const steps = [visible(<Subject value="a" />), hidden(<Subject value="a" />), hidden(null)];

            // When the screen leaves the stack with no reveal in between
            const runs = runEveryConfig(steps);

            // Then the terminal release of the boundary is the last chance to run the cleanup, and it takes it
            expect(runs.liveUseEffect).toEqual([['setup:s:a'], [], ['cleanup:s:a'], []]);
            expect(runs.activityScreenActivityEffect).toEqual([['setup:s:a'], [], [], ['cleanup:s:a']]);
        });

        it('leaves the sibling that stayed alive untouched when one of two is removed while hidden', () => {
            // Given two components behind a cover, of which only one goes away
            const steps = [
                visible(<Siblings value="a" />),
                hidden(<Siblings value="a" />),
                hidden(
                    <Siblings
                        value="a"
                        hasSecond={false}
                    />,
                ),
                visible(
                    <Siblings
                        value="a"
                        hasSecond={false}
                    />,
                ),
            ];

            // When the screen is revealed with only the surviving one on it
            const runs = runEveryConfig(steps);

            // Then only the entry of the component that is gone is released
            expect(runs.liveUseEffect).toEqual([['setup:s1:a', 'setup:s2:a'], [], ['cleanup:s2:a'], [], ['cleanup:s1:a']]);
            expect(runs.activityScreenActivityEffect).toEqual([['setup:s1:a', 'setup:s2:a'], [], [], ['cleanup:s2:a'], ['cleanup:s1:a']]);
        });
    });

    describe('the order of the effect calls', () => {
        it('re-runs only the call site whose dependencies changed while the screen was hidden', () => {
            // Given a component with a mount-once effect next to one that depends on a value that changes behind the cover
            const steps = [visible(<Pair value="a" />), hidden(<Pair value="a" />), hidden(<Pair value="b" />), visible(<Pair value="b" />)];

            // When the screen is revealed after the change
            const runs = runEveryConfig(steps);

            // Then the mount-once call site is left alone, because the entry knows the dependencies it is live for
            expect(runs.liveUseEffect).toEqual([['setup:first:a', 'setup:second:a'], [], ['cleanup:second:a', 'setup:second:b'], [], ['cleanup:first:a', 'cleanup:second:b']]);
            expect(runs.activityScreenActivityEffect).toEqual([['setup:first:a', 'setup:second:a'], [], [], ['cleanup:second:a', 'setup:second:b'], ['cleanup:first:a', 'cleanup:second:b']]);
        });

        it('releases both siblings before either sets up again on a reveal that re-runs both', () => {
            // Given two siblings whose dependency changes behind the cover, so the reveal has to re-run both
            const steps = [visible(<Siblings value="a" />), hidden(<Siblings value="a" />), hidden(<Siblings value="b" />), visible(<Siblings value="b" />)];

            // When the screen is revealed
            const runs = runEveryConfig(steps);

            // Then a live screen releases both siblings before it sets either of them up again
            expect(runs.liveUseEffect).toEqual([['setup:s1:a', 'setup:s2:a'], [], ['cleanup:s1:a', 'cleanup:s2:a', 'setup:s1:b', 'setup:s2:b'], [], ['cleanup:s1:b', 'cleanup:s2:b']]);

            // And the boundary runs the reveal in the same phases, so neither sibling acquires before the other released
            expect(runs.activityScreenActivityEffect).toEqual([
                ['setup:s1:a', 'setup:s2:a'],
                [],
                [],
                ['cleanup:s1:a', 'cleanup:s2:a', 'setup:s1:b', 'setup:s2:b'],
                ['cleanup:s1:b', 'cleanup:s2:b'],
            ]);
        });

        it('releases a parent and its child before either sets up again on a reveal that re-runs both', () => {
            // Given a parent and a child whose shared dependency changes behind the cover
            const steps = [visible(<Parent value="a" />), hidden(<Parent value="a" />), hidden(<Parent value="b" />), visible(<Parent value="b" />)];

            // When the screen is revealed
            const runs = runEveryConfig(steps);

            // Then the reveal commit of the hook holds the phases of the live one, the deferral aside
            expect(runs.liveUseEffect).toEqual([
                ['setup:child:a', 'setup:parent:a'],
                [],
                ['cleanup:child:a', 'cleanup:parent:a', 'setup:child:b', 'setup:parent:b'],
                [],
                ['cleanup:parent:b', 'cleanup:child:b'],
            ]);
            expect(runs.activityScreenActivityEffect).toEqual([
                ['setup:child:a', 'setup:parent:a'],
                [],
                [],
                ['cleanup:child:a', 'cleanup:parent:a', 'setup:child:b', 'setup:parent:b'],
                ['cleanup:child:b', 'cleanup:parent:b'],
            ]);
        });

        it('releases a parent and its child in the order they registered when the screen leaves the stack', () => {
            // Given a parent and a child that are both still mounted when the screen is popped
            const steps = [visible(<Parent value="a" />)];

            // When the screen leaves the navigation stack
            const runs = runEveryConfig(steps);

            // Then React tears a deleted tree down from the parent down, and every configuration without a cover agrees
            const expected = [
                ['setup:child:a', 'setup:parent:a'],
                ['cleanup:parent:a', 'cleanup:child:a'],
            ];
            expect(runs.liveUseEffect).toEqual(expected);
            expect(runs.liveScreenActivityEffect).toEqual(expected);
            expect(runs.activityUseEffect).toEqual(expected);

            // And the boundary owns that release instead, in the order the effects registered in
            expect(runs.activityScreenActivityEffect).toEqual([
                ['setup:child:a', 'setup:parent:a'],
                ['cleanup:child:a', 'cleanup:parent:a'],
            ]);
        });

        it('releases nothing on a cover where plain useEffect releases a whole subtree from the parent down', () => {
            // Given a parent and a child on a screen that gets covered, which is a hide rather than a deletion
            const steps = [visible(<Parent value="a" />), hidden(<Parent value="a" />)];

            // When the screen is covered and then leaves the stack while still covered
            const runs = runEveryConfig(steps);

            // Then plain useEffect gets the teardown of the whole subtree on the cover, parent first
            expect(runs.activityUseEffect).toEqual([['setup:child:a', 'setup:parent:a'], ['cleanup:parent:a', 'cleanup:child:a'], []]);

            // And the hook gets it once, when the screen really goes away
            expect(runs.activityScreenActivityEffect).toEqual([['setup:child:a', 'setup:parent:a'], [], ['cleanup:child:a', 'cleanup:parent:a']]);
        });

        it('releases in mount order rather than tree order when a sibling was added in front of another', () => {
            // Given a component that is added in front of one that is already mounted, so the two orders differ
            const steps = [
                visible([
                    <Subject
                        key="s2"
                        name="s2"
                        value="a"
                    />,
                ]),
                visible([
                    <Subject
                        key="s1"
                        name="s1"
                        value="a"
                    />,
                    <Subject
                        key="s2"
                        name="s2"
                        value="a"
                    />,
                ]),
            ];

            // When the screen leaves the navigation stack with both on it
            const runs = runEveryConfig(steps);

            // Then React releases in tree order, which puts the one added last first
            expect(runs.liveUseEffect).toEqual([['setup:s2:a'], ['setup:s1:a'], ['cleanup:s1:a', 'cleanup:s2:a']]);
            expect(runs.activityUseEffect).toEqual(runs.liveUseEffect);

            // And the boundary releases in the order the effects registered in, which is not the tree order here
            expect(runs.activityScreenActivityEffect).toEqual([['setup:s2:a'], ['setup:s1:a'], ['cleanup:s2:a', 'cleanup:s1:a']]);
        });

        it('releases the entry of a deferred removal last when the screen leaves the stack', () => {
            // Given one of two siblings removed behind the cover, so its entry is waiting for a reveal that never comes
            const steps = [
                visible(<Siblings value="a" />),
                hidden(<Siblings value="a" />),
                hidden(
                    <Siblings
                        value="a"
                        hasSecond={false}
                    />,
                ),
            ];

            // When the screen leaves the stack while still covered
            const runs = runEveryConfig(steps);

            // Then both are released in one commit, so the sibling that went away first is released last
            expect(runs.liveUseEffect).toEqual([['setup:s1:a', 'setup:s2:a'], [], ['cleanup:s2:a'], ['cleanup:s1:a']]);
            expect(runs.activityScreenActivityEffect).toEqual([['setup:s1:a', 'setup:s2:a'], [], [], ['cleanup:s1:a', 'cleanup:s2:a']]);
        });

        it('releases the instance removed while the screen was hidden before the reveal sets the new one up', () => {
            // Given a component that is removed and mounted again entirely behind the cover, which a remount is, with
            // every call naming the setup it belongs to so that a release cannot be read as the wrong instance
            const steps = [
                visible(<CountedSubject value="a" />),
                hidden(<CountedSubject value="a" />),
                hidden(null),
                hidden(<CountedSubject value="a" />),
                visible(<CountedSubject value="a" />),
            ];

            // When the screen is revealed
            setupCount = 0;
            const live = runOn(useEffect, LiveScreen, steps);
            setupCount = 0;
            const activity = runOn(useScreenActivityEffect, ActivityScreen, steps);

            // Then a live screen releases the instance that went away before it sets the new one up
            expect(live).toEqual([['setup:s1:a'], [], ['cleanup:s1:a'], ['setup:s2:a'], [], ['cleanup:s2:a']]);

            // And the reveal holds the same order, so a single-owner resource is never held by two instances at once
            expect(activity).toEqual([['setup:s1:a'], [], [], [], ['cleanup:s1:a', 'setup:s2:a'], ['cleanup:s2:a']]);
        });
    });

    describe('what a cover cannot reproduce', () => {
        it('coalesces a dependency change that was undone before the reveal', () => {
            // Given a dependency that changes and changes back while the screen is covered
            const steps = [visible(<Subject value="a" />), hidden(<Subject value="a" />), hidden(<Subject value="b" />), hidden(<Subject value="a" />), visible(<Subject value="a" />)];

            // When the screen is revealed with the dependency it was covered with
            const runs = runEveryConfig(steps);

            // Then a live screen ran the effect for the value nobody ever saw
            expect(runs.liveUseEffect).toEqual([['setup:s:a'], [], ['cleanup:s:a', 'setup:s:b'], ['cleanup:s:b', 'setup:s:a'], [], ['cleanup:s:a']]);

            // And the hook ran nothing, because the setup it holds is live for the dependencies of the reveal
            expect(runs.activityScreenActivityEffect).toEqual([['setup:s:a'], [], [], [], [], ['cleanup:s:a']]);
        });
    });
});
