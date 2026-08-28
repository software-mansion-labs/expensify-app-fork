import {act, render} from '@testing-library/react-native';

import ScreenActivityWrapper, {FIRST_RENDER_FALLBACK_DELAY_MS} from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigatorComponent/ScreenActivityWrapper';
import {
    getIsWindowSizeChanging,
    subscribeToWindowSizeChange,
} from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigatorComponent/ScreenActivityWrapper/windowSizeChangeStore';

import {useIsFocused} from '@react-navigation/native';
import React from 'react';

import {drainLog, KeptEffect, PlainEffect, resetLog} from '../../../utils/ScreenActivityEffectTestUtils';
import createTransitionTrackerHarness from '../../../utils/TransitionTrackerTestUtils';

// The gate below the <Activity> picks its implementation from this flag at module load, and mocking CONFIG also keeps
// the HybridApp native module out of the import chain of the wrapper.
jest.mock('@src/CONFIG', () => ({__esModule: true, default: {USE_ACTIVITY_SCREEN_STRICT_MODE_IN_DEV: true}}));

jest.mock('@hooks/useThemeStyles', () => () => ({
    flex1: {flex: 1},
}));

jest.mock('@libs/Navigation/TransitionTracker', () => ({
    runAfterTransitions: jest.fn(),
}));

jest.mock('@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigatorComponent/ScreenActivityWrapper/windowSizeChangeStore', () => ({
    subscribeToWindowSizeChange: jest.fn(),
    getIsWindowSizeChanging: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
    const actual = jest.requireActual<Record<string, unknown>>('@react-navigation/native');
    return {
        ...actual,
        useIsFocused: jest.fn(),
    };
});

/**
 * useScreenActivityEffect only survives a cover because ScreenActivityWrapper renders the boundary outside the
 * <Activity> it serves, so these tests drive the real wrapper rather than a hand built tree, StrictMode gate and all.
 * The calls named 'plain' come from useEffect and the ones named 'kept' from the hook.
 */

const transitionTracker = createTransitionTrackerHarness();
const {firePendingCallbacks} = transitionTracker;
const mockedUseIsFocused = jest.mocked(useIsFocused);
const mockedGetIsWindowSizeChanging = jest.mocked(getIsWindowSizeChanging);
const mockedSubscribeToWindowSizeChange = jest.mocked(subscribeToWindowSizeChange);

/** One effect per hook, so every step shows what the behavior of the screen did to each of them. */
function Subjects({value}: {value: string}) {
    return (
        <>
            <PlainEffect value={value} />
            <KeptEffect value={value} />
        </>
    );
}

/** A screen on the 'activity' behavior, which is the wrapper the navigator puts around a screen that opted in. */
function activityScreen(isScreenBlurred: boolean, value = 'a') {
    return (
        <ScreenActivityWrapper isScreenBlurred={isScreenBlurred}>
            <Subjects value={value} />
        </ScreenActivityWrapper>
    );
}

/** A screen on the 'none' behavior, which wrapDescriptorsWithNonTopScreensBehavior leaves unwrapped. */
function liveScreen(value = 'a') {
    return <Subjects value={value} />;
}

/** The wrapper keeps a freshly mounted screen visible until a frame was painted, so a test flushes that window first. */
function completeFirstRender() {
    act(() => {
        jest.advanceTimersByTime(FIRST_RENDER_FALLBACK_DELAY_MS);
    });
}

beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    transitionTracker.install();
    mockedUseIsFocused.mockReturnValue(true);
    mockedSubscribeToWindowSizeChange.mockImplementation(() => () => {});
    mockedGetIsWindowSizeChanging.mockReturnValue(false);
    resetLog();
});

afterEach(() => {
    jest.useRealTimers();
});

describe('ScreenActivityWrapper and useScreenActivityEffect', () => {
    it('shows what the two non-top screen behaviors cost the effects of one screen', () => {
        // Given the same two effects on a screen left on the 'none' behavior and on a screen wrapped for 'activity'
        const runCoverAndReveal = (isWrapped: boolean) => {
            resetLog();
            const screen = (isScreenBlurred: boolean) => (isWrapped ? activityScreen(isScreenBlurred) : liveScreen());
            const {rerender, unmount} = render(screen(false));
            completeFirstRender();
            const commits = [drainLog()];

            rerender(screen(true));
            commits.push(drainLog());

            rerender(screen(false));
            firePendingCallbacks();
            commits.push(drainLog());

            unmount();
            commits.push(drainLog());
            return commits;
        };

        // When another screen covers each of them and is then popped again
        // Then 'none' keeps both effects live from the mount until the screen leaves the stack
        expect(runCoverAndReveal(false)).toEqual([['setup:plain:a', 'setup:kept:a'], [], [], ['cleanup:plain:a', 'cleanup:kept:a']]);

        // And 'activity' adds the remount cycle of the gate for both, plus a release and a setup per cycle for the plain one
        expect(runCoverAndReveal(true)).toEqual([
            ['setup:plain:a', 'setup:kept:a', 'cleanup:plain:a', 'cleanup:kept:a', 'setup:plain:a', 'setup:kept:a'],
            ['cleanup:plain:a'],
            ['setup:plain:a'],
            ['cleanup:kept:a', 'cleanup:plain:a'],
        ]);
    });

    it('runs the mount effects on the first, still visible frame of a screen that mounts covered', () => {
        // Given a screen that mounts while it is already covered, which a deep link and a pre-mounted tab both do
        const {rerender} = render(activityScreen(true));
        const commits = [drainLog()];

        // When the first frame is done and the screen is revealed later
        completeFirstRender();
        commits.push(drainLog());

        rerender(activityScreen(false));
        firePendingCallbacks();
        commits.push(drainLog());

        // Then the mount work ran at mount time, because the wrapper renders that first frame visible on purpose
        expect(commits).toEqual([
            ['setup:plain:a', 'setup:kept:a', 'cleanup:plain:a', 'cleanup:kept:a', 'setup:plain:a', 'setup:kept:a'],
            // Only the plain effect is released when that frame is done and the screen finally goes hidden.
            ['cleanup:plain:a'],
            ['setup:plain:a'],
        ]);
    });

    it('runs a dependency change that landed while the screen was covered on the reveal', () => {
        // Given a covered screen whose data changes behind the cover, which is what an Onyx update does
        const {rerender, unmount} = render(activityScreen(false));
        completeFirstRender();
        const commits = [drainLog()];

        rerender(activityScreen(true));
        commits.push(drainLog());

        rerender(activityScreen(true, 'b'));
        commits.push(drainLog());

        // When the screen is revealed after the change
        rerender(activityScreen(false, 'b'));
        firePendingCallbacks();
        commits.push(drainLog());

        unmount();
        commits.push(drainLog());

        // Then the kept effect re-runs for the new value on the reveal, and the render behind the cover ran nothing
        expect(commits).toEqual([
            ['setup:plain:a', 'setup:kept:a', 'cleanup:plain:a', 'cleanup:kept:a', 'setup:plain:a', 'setup:kept:a'],
            ['cleanup:plain:a'],
            [],
            ['setup:plain:b', 'cleanup:kept:a', 'setup:kept:b'],
            ['cleanup:kept:b', 'cleanup:plain:b'],
        ]);
    });
});
