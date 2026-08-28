import {act, render} from '@testing-library/react-native';

import useScreenActivityEffect from '@hooks/useScreenActivityEffect';

import ScreenActivityWrapper, {FIRST_RENDER_FALLBACK_DELAY_MS} from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigatorComponent/ScreenActivityWrapper';
import {
    getIsWindowSizeChanging,
    subscribeToWindowSizeChange,
} from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigatorComponent/ScreenActivityWrapper/windowSizeChangeStore';

import {useIsFocused} from '@react-navigation/native';
import React, {useEffect} from 'react';

import {drainLog, resetLog, Single} from '../../../utils/ScreenActivityEffectTestUtils';
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
 * The hook only survives a cover because ScreenActivityWrapper renders the boundary outside the <Activity> it serves,
 * so these tests drive the real wrapper instead of a hand built tree, StrictMode gate and all.
 */

const transitionTracker = createTransitionTrackerHarness();
const {firePendingCallbacks} = transitionTracker;
const mockedUseIsFocused = jest.mocked(useIsFocused);
const mockedGetIsWindowSizeChanging = jest.mocked(getIsWindowSizeChanging);
const mockedSubscribeToWindowSizeChange = jest.mocked(subscribeToWindowSizeChange);

/** One effect per hook, so every step shows what the cover did to each of them. */
function Subjects({value}: {value: string}) {
    return (
        <>
            <Single
                useAnyEffect={useEffect}
                id="plain"
                value={value}
            />
            <Single
                useAnyEffect={useScreenActivityEffect}
                id="kept"
                value={value}
            />
        </>
    );
}

function wrapper(isScreenBlurred: boolean, value = 'a') {
    return (
        <ScreenActivityWrapper isScreenBlurred={isScreenBlurred}>
            <Subjects value={value} />
        </ScreenActivityWrapper>
    );
}

// A screen on the 'none' behavior is not wrapped in anything, which is what wrapDescriptorsWithNonTopScreensBehavior
// leaves it as, so covering it is an ordinary render of a screen that stays live.
function unwrapped(value = 'a') {
    return <Subjects value={value} />;
}

// The wrapper keeps a freshly mounted screen visible until a frame was painted, so a test flushes that window before
// it asserts the steady state.
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
    it('keeps the setup of the hook live through a cover and reveal cycle and releases the plain effect next to it', () => {
        const {rerender, unmount} = render(wrapper(false));
        completeFirstRender();
        const steps = [drainLog()];

        rerender(wrapper(true));
        steps.push(drainLog());

        rerender(wrapper(false));
        firePendingCallbacks();
        steps.push(drainLog());

        unmount();
        steps.push(drainLog());

        expect(steps).toEqual([
            // The gate mounts the content one commit later and StrictMode puts it through a remount cycle at once.
            ['setup:plain:a', 'setup:kept:a', 'cleanup:plain:a', 'cleanup:kept:a', 'setup:plain:a', 'setup:kept:a'],
            // The cover releases the plain effect and leaves the one written for it alone.
            ['cleanup:plain:a'],
            ['setup:plain:a'],
            // The boundary releases what it holds before React tears the subtree of the screen down.
            ['cleanup:kept:a', 'cleanup:plain:a'],
        ]);
    });

    it('runs the mount effects on the first, still visible frame of a screen that mounts covered', () => {
        const {rerender} = render(wrapper(true));
        const steps = [drainLog()];

        completeFirstRender();
        steps.push(drainLog());

        rerender(wrapper(false));
        firePendingCallbacks();
        steps.push(drainLog());

        expect(steps).toEqual([
            // The first frame of a covered screen renders visible, so both effects run at mount time.
            ['setup:plain:a', 'setup:kept:a', 'cleanup:plain:a', 'cleanup:kept:a', 'setup:plain:a', 'setup:kept:a'],
            // Only the plain effect is released when that frame is done and the screen goes hidden.
            ['cleanup:plain:a'],
            ['setup:plain:a'],
        ]);
    });

    it('shows what the two behaviors cost the effects of the same screen', () => {
        const runCoverAndReveal = (isWrapped: boolean) => {
            resetLog();
            const screen = (isScreenBlurred: boolean) => (isWrapped ? wrapper(isScreenBlurred) : unwrapped());
            const {rerender, unmount} = render(screen(false));
            completeFirstRender();
            const steps = [drainLog()];

            rerender(screen(true));
            steps.push(drainLog());

            rerender(screen(false));
            firePendingCallbacks();
            steps.push(drainLog());

            unmount();
            steps.push(drainLog());
            return steps;
        };

        // The 'none' behavior keeps both effects live from the mount to the moment the screen leaves the stack.
        expect(runCoverAndReveal(false)).toEqual([['setup:plain:a', 'setup:kept:a'], [], [], ['cleanup:plain:a', 'cleanup:kept:a']]);

        // The 'activity' behavior adds the remount cycle of the gate for both hooks, and one release and setup per
        // cover and reveal cycle for the plain effect alone.
        expect(runCoverAndReveal(true)).toEqual([
            ['setup:plain:a', 'setup:kept:a', 'cleanup:plain:a', 'cleanup:kept:a', 'setup:plain:a', 'setup:kept:a'],
            ['cleanup:plain:a'],
            ['setup:plain:a'],
            ['cleanup:kept:a', 'cleanup:plain:a'],
        ]);
    });

    it('runs a dependency change that landed while the screen was covered on the reveal', () => {
        const {rerender, unmount} = render(wrapper(false));
        completeFirstRender();
        const steps = [drainLog()];

        rerender(wrapper(true));
        steps.push(drainLog());

        rerender(wrapper(true, 'b'));
        steps.push(drainLog());

        rerender(wrapper(false, 'b'));
        firePendingCallbacks();
        steps.push(drainLog());

        unmount();
        steps.push(drainLog());

        expect(steps).toEqual([
            ['setup:plain:a', 'setup:kept:a', 'cleanup:plain:a', 'cleanup:kept:a', 'setup:plain:a', 'setup:kept:a'],
            ['cleanup:plain:a'],
            // The render that changed the dependency happened while the screen was covered, so it ran no effect.
            [],
            ['setup:plain:b', 'cleanup:kept:a', 'setup:kept:b'],
            ['cleanup:kept:b', 'cleanup:plain:b'],
        ]);
    });
});
