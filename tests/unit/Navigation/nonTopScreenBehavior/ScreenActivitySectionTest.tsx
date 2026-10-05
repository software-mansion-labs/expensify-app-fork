import {act, render} from '@testing-library/react-native';

import {FIRST_RENDER_FALLBACK_DELAY_MS} from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigatorComponent/ScreenActivityWrapper';
import ScreenActivitySection from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigatorComponent/ScreenActivityWrapper/ScreenActivitySection';
import {
    getIsWindowSizeChanging,
    subscribeToWindowSizeChange,
} from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigatorComponent/ScreenActivityWrapper/windowSizeChangeStore';

import {useIsFocused} from '@react-navigation/native';
import React, {useEffect} from 'react';
import {View} from 'react-native';

import createTransitionTrackerHarness from '../../../utils/TransitionTrackerTestUtils';

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

const transitionTracker = createTransitionTrackerHarness();
const mockedUseIsFocused = jest.mocked(useIsFocused);

type EffectLog = {onSetup: jest.Mock; onCleanup: jest.Mock};

function createEffectLog(): EffectLog {
    return {onSetup: jest.fn(), onCleanup: jest.fn()};
}

function countRuns({onSetup, onCleanup}: EffectLog) {
    return {setups: onSetup.mock.calls.length, cleanups: onCleanup.mock.calls.length};
}

function EffectProbe({onSetup, onCleanup, testID}: EffectLog & {testID: string}) {
    useEffect(() => {
        onSetup();
        return onCleanup;
    }, [onSetup, onCleanup]);
    return <View testID={testID} />;
}

function Screen({sectionLog, liveLog}: {sectionLog: EffectLog; liveLog: EffectLog}) {
    return (
        <View>
            <ScreenActivitySection>
                <EffectProbe
                    onSetup={sectionLog.onSetup}
                    onCleanup={sectionLog.onCleanup}
                    testID="section"
                />
            </ScreenActivitySection>
            <EffectProbe
                onSetup={liveLog.onSetup}
                onCleanup={liveLog.onCleanup}
                testID="live"
            />
        </View>
    );
}

beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    transitionTracker.install();
    mockedUseIsFocused.mockReturnValue(true);
    jest.mocked(subscribeToWindowSizeChange).mockImplementation(() => () => {});
    jest.mocked(getIsWindowSizeChanging).mockReturnValue(false);
});

afterEach(() => {
    jest.useRealTimers();
});

describe('ScreenActivitySection', () => {
    it('hides only the section while the screen is covered and brings it back after the reveal', () => {
        // Given a focused screen with one section and one live sibling
        const sectionLog = createEffectLog();
        const liveLog = createEffectLog();
        const {rerender} = render(
            <Screen
                sectionLog={sectionLog}
                liveLog={liveLog}
            />,
        );
        act(() => {
            jest.advanceTimersByTime(FIRST_RENDER_FALLBACK_DELAY_MS);
        });
        // The StrictMode gate of the section runs its mount twice, so the counts below are relative to the mounted state.
        const mounted = countRuns(sectionLog);

        // When another screen covers it
        mockedUseIsFocused.mockReturnValue(false);
        rerender(
            <Screen
                sectionLog={sectionLog}
                liveLog={liveLog}
            />,
        );

        // Then the section cleans up its effects while the sibling keeps running
        expect(countRuns(sectionLog)).toEqual({setups: mounted.setups, cleanups: mounted.cleanups + 1});
        expect(countRuns(liveLog)).toEqual({setups: 1, cleanups: 0});

        // When the cover goes away and its transition ends
        mockedUseIsFocused.mockReturnValue(true);
        rerender(
            <Screen
                sectionLog={sectionLog}
                liveLog={liveLog}
            />,
        );
        transitionTracker.firePendingCallbacks();

        // Then the section runs its effects again and the sibling was never touched
        expect(countRuns(sectionLog)).toEqual({setups: mounted.setups + 1, cleanups: mounted.cleanups + 1});
        expect(countRuns(liveLog)).toEqual({setups: 1, cleanups: 0});
    });
});
