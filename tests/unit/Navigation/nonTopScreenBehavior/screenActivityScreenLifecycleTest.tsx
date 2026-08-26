import {act, render} from '@testing-library/react-native';

import useResponsiveLayout from '@hooks/useResponsiveLayout';

import getIsNarrowLayout from '@libs/getIsNarrowLayout';
import createSplitNavigator from '@libs/Navigation/AppNavigator/createSplitNavigator';
import navigationRef from '@libs/Navigation/navigationRef';

import CONST from '@src/CONST';

import {CommonActions, NavigationContainer} from '@react-navigation/native';
import React, {useEffect, useRef, useState} from 'react';

import createTransitionTrackerHarness from '../../../utils/TransitionTrackerTestUtils';

const SIDEBAR = 'Sidebar';
const CHAT = 'Chat';
const THREAD = 'Thread';

type TestSplitNavigatorParamList = {
    [SIDEBAR]: undefined;
    [CHAT]: undefined;
    [THREAD]: undefined;
};

const Split = createSplitNavigator<TestSplitNavigatorParamList>();

jest.mock('@hooks/useResponsiveLayout', () => jest.fn());
jest.mock('@libs/getIsNarrowLayout', () => jest.fn());

jest.mock('@libs/Navigation/TransitionTracker', () => ({
    runAfterTransitions: jest.fn(),
}));

const transitionTracker = createTransitionTrackerHarness();

const mockedGetIsNarrowLayout = jest.mocked(getIsNarrowLayout);
const mockedUseResponsiveLayout = jest.mocked(useResponsiveLayout);

let lifecycle: string[] = [];
let survivingRefValues: Array<string | undefined> = [];
let stateIdentities: Array<Record<string, unknown>> = [];

/**
 * Stands in for a screen's content. It records what the effect lifecycle did, plus a ref set at mount and a state
 * value created by a lazy initializer, which is how a real screen carries a scroll position, a subscription guard or
 * a half-written draft across a cover. The initializer runs once per state creation, so an unchanged identity is
 * proof the state was carried over rather than started again.
 */
function ChatScreen() {
    const [stateIdentity] = useState<Record<string, unknown>>(() => ({}));
    const survivingRef = useRef<string | undefined>(undefined);
    if (survivingRef.current === undefined) {
        survivingRef.current = 'set-at-mount';
    }
    stateIdentities.push(stateIdentity);

    useEffect(() => {
        lifecycle.push('effect');
        survivingRefValues.push(survivingRef.current);
        return () => {
            lifecycle.push('cleanup');
        };
    }, []);

    return null;
}

function ThreadScreen() {
    return null;
}

function SidebarScreen() {
    return null;
}

function renderSplitNavigator(initialRoutes: Array<{name: keyof TestSplitNavigatorParamList}>) {
    return render(
        <NavigationContainer
            ref={navigationRef}
            initialState={{index: initialRoutes.length - 1, routes: initialRoutes}}
        >
            <Split.Navigator
                sidebarScreen={SIDEBAR}
                defaultCentralScreen={CHAT}
                parentRoute={CONST.NAVIGATION_TESTS.DEFAULT_PARENT_ROUTE}
            >
                <Split.Screen
                    name={SIDEBAR}
                    component={SidebarScreen}
                />
                <Split.Screen
                    name={CHAT}
                    component={ChatScreen}
                    options={{nonTopScreenBehavior: 'activity'}}
                />
                <Split.Screen
                    name={THREAD}
                    component={ThreadScreen}
                    options={{nonTopScreenBehavior: 'activity'}}
                />
            </Split.Navigator>
        </NavigationContainer>,
    );
}

/**
 * Flushes the two things the wrapper waits for: the frame that ends the first-render window it keeps a fresh screen
 * visible for, and the navigation transition it defers a reveal behind.
 */
function settle() {
    act(() => {
        jest.runOnlyPendingTimers();
    });
    transitionTracker.firePendingCallbacks();
    act(() => {
        jest.runOnlyPendingTimers();
    });
}

/**
 * Counts effect mounts and cleanups instead of matching the log, because the wrapper commits StrictMode for the
 * screens that opted in, so a plain mount already logs the double invocation StrictMode exists to surface.
 */
function countOf(entry: 'effect' | 'cleanup') {
    return lifecycle.filter((loggedEntry) => loggedEntry === entry).length;
}

beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    transitionTracker.install();
    lifecycle = [];
    survivingRefValues = [];
    stateIdentities = [];
    mockedGetIsNarrowLayout.mockReturnValue(false);
    mockedUseResponsiveLayout.mockReturnValue({...CONST.NAVIGATION_TESTS.DEFAULT_USE_RESPONSIVE_LAYOUT_VALUE, shouldUseNarrowLayout: false});
});

afterEach(() => {
    jest.useRealTimers();
});

/**
 * The cover/reveal cycle the screen-level suites model by toggling `<Activity>` by hand, driven here through a real
 * split navigator instead. This is what ties those suites to the behavior the navigator actually produces.
 */
describe('Screen lifecycle under the activity behavior', () => {
    it('runs the mount lifecycle of a screen that mounts already covered', () => {
        // Given a stack where the chat is already underneath a thread when the navigator first renders,
        // the way a deep link into a thread mounts the chat below it
        renderSplitNavigator([{name: SIDEBAR}, {name: CHAT}, {name: THREAD}]);

        // When the first-render window completes
        settle();

        // Then the covered screen still ran its mount work, because a screen that never mounts its effects would
        // never fetch its data and the reveal would show a loading state
        expect(lifecycle).toContain('effect');
    });

    it('cleans up the covered screen and re-runs its effects on the way back', () => {
        // Given a chat the user is looking at
        renderSplitNavigator([{name: SIDEBAR}, {name: CHAT}]);
        settle();
        const effectsAfterMount = countOf('effect');
        const cleanupsAfterMount = countOf('cleanup');
        expect(effectsAfterMount).toBeGreaterThan(0);

        // When a thread is pushed on top of it
        act(() => {
            navigationRef.current?.dispatch(CommonActions.navigate(THREAD));
        });
        settle();

        // Then the covered chat had its effects cleaned up, which is the whole difference from the freeze behavior
        expect(countOf('cleanup')).toBe(cleanupsAfterMount + 1);
        expect(countOf('effect')).toBe(effectsAfterMount);

        // When the user goes back to the chat
        act(() => {
            navigationRef.current?.dispatch(CommonActions.goBack());
        });
        settle();

        // Then its effects run again from scratch, so anything a cleanup destroyed has to be rebuilt by them
        expect(countOf('effect')).toBeGreaterThan(effectsAfterMount);
    });

    it('keeps state and refs of the covered screen across the cycle', () => {
        // Given a chat that set a ref at mount and bumped a state value from its mount effect
        renderSplitNavigator([{name: SIDEBAR}, {name: CHAT}]);
        settle();

        // When it is covered by a thread and revealed again
        act(() => {
            navigationRef.current?.dispatch(CommonActions.navigate(THREAD));
        });
        settle();
        act(() => {
            navigationRef.current?.dispatch(CommonActions.goBack());
        });
        settle();

        // Then neither the ref nor the state was reset, which is why a surviving guard can block the re-run of an
        // effect that a cleanup already undid
        expect(survivingRefValues.at(-1)).toBe('set-at-mount');
        expect(stateIdentities.at(-1)).toBe(stateIdentities.at(0));
    });
});
