import {act, render} from '@testing-library/react-native';

import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';
import Animations from '@libs/Navigation/PlatformStackNavigation/navigationOptions/animation';
import type {NonTopScreenBehavior} from '@libs/Navigation/PlatformStackNavigation/types';

import {NavigationContainer, createNavigationContainerRef} from '@react-navigation/native';
import React, {useSyncExternalStore} from 'react';
import {View} from 'react-native';

import createTransitionTrackerHarness from './TransitionTrackerTestUtils';

/**
 * Temporary harness for the Activity rollout audit. It runs a subject through a real cover and uncover cycle on a
 * real platform stack navigator, so the subject sees the same focus transitions and the same wrapper the
 * `nonTopScreenBehavior` option picks in production.
 *
 * The behavior under test comes from the `NON_TOP_SCREEN_BEHAVIOR` environment variable and defaults to `freeze`,
 * which is what covered screens do today. Running the same suite with `NON_TOP_SCREEN_BEHAVIOR=activity` is the
 * "turn Activity on" step: every effect that cannot survive a hide and reveal cycle starts failing.
 *
 * Jest hoists mock factories per file, so a test file using this harness has to mock
 * `@libs/Navigation/TransitionTracker` with a `runAfterTransitions: jest.fn()` itself and call `install()` from its
 * `beforeEach`, after `jest.clearAllMocks()`.
 */

type CoverCycleParamList = {
    Subject: undefined;
    Cover: undefined;
};

// Long enough to cover the wrapper's first-render fallback timeout and the freeze wrapper's deferred frame.
const SETTLE_DURATION_MS = 250;

const NON_TOP_SCREEN_BEHAVIOR: NonTopScreenBehavior = process.env.NON_TOP_SCREEN_BEHAVIOR === 'activity' ? 'activity' : 'freeze';

const Stack = createPlatformStackNavigator<CoverCycleParamList>();

function CoverScreen() {
    return <View testID="coverScreen" />;
}

// The subject is held here instead of in a closure, so the screen component stays the same reference across renders
// and the navigator never remounts it.
let currentSubject: React.ReactElement | null = null;

function SubjectScreen() {
    return currentSubject;
}

/**
 * External store a probe can read, so a test can push new data into a covered screen without re-rendering the tree
 * from the outside. A covered screen does not always re-render with its parent, which would otherwise hide whether
 * the behavior under test delivers the update at all.
 */
function createSubjectStore<T>(initialValue: T) {
    let value = initialValue;
    const listeners = new Set<() => void>();

    function setValue(nextValue: T) {
        value = nextValue;
        act(() => {
            for (const listener of listeners) {
                listener();
            }
        });
    }

    function subscribe(listener: () => void) {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }

    function useValue() {
        return useSyncExternalStore(
            subscribe,
            () => value,
            () => value,
        );
    }

    return {setValue, useValue};
}

function createCoverCycleHarness() {
    const transitionTracker = createTransitionTrackerHarness();
    const navigationContainerRef = createNavigationContainerRef<CoverCycleParamList>();

    /**
     * Installs the fake timers both wrappers need to apply their covered state, next to the transition tracker stub.
     * The global setup switches to real timers, so every suite using this harness turns them back on for itself.
     */
    function install() {
        jest.useFakeTimers();
        transitionTracker.install();
    }

    /**
     * Renders the subject on the covered-capable screen and settles the mount, so later assertions measure the cover
     * and uncover cycle alone instead of the mount work StrictMode already double-invokes under Activity.
     */
    function renderSubject(subject: React.ReactElement, renderElement: (children: React.ReactElement) => React.ReactElement = (children) => children) {
        currentSubject = subject;

        const result = render(
            renderElement(
                <NavigationContainer ref={navigationContainerRef}>
                    <Stack.Navigator screenOptions={{animation: Animations.NONE}}>
                        <Stack.Screen
                            name="Subject"
                            component={SubjectScreen}
                            options={{nonTopScreenBehavior: NON_TOP_SCREEN_BEHAVIOR}}
                        />
                        <Stack.Screen
                            name="Cover"
                            component={CoverScreen}
                        />
                    </Stack.Navigator>
                </NavigationContainer>,
            ),
        );

        settle();

        return result;
    }

    /** Flushes the timers and animation frames both wrappers use to apply their covered state. */
    function settle() {
        act(() => {
            jest.advanceTimersByTime(SETTLE_DURATION_MS);
        });
    }

    /** Pushes another screen of the same navigator on top, which is what covering a screen looks like. */
    function cover() {
        act(() => {
            navigationContainerRef.navigate('Cover');
        });
        settle();
    }

    /** Pops back to the subject and lets the deferred reveal run, which Activity schedules after the transition. */
    function uncover() {
        act(() => {
            navigationContainerRef.goBack();
        });
        settle();
        transitionTracker.firePendingCallbacks();
        settle();
    }

    return {install, renderSubject, cover, uncover, settle, firePendingCallbacks: transitionTracker.firePendingCallbacks};
}

export default createCoverCycleHarness;
export {NON_TOP_SCREEN_BEHAVIOR, createSubjectStore};
