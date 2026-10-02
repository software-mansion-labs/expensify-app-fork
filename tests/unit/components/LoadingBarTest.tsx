import {render} from '@testing-library/react-native';

import LoadingBar from '@components/LoadingBar';

import React, {Activity, StrictMode} from 'react';
import * as Reanimated from 'react-native-reanimated';

// The component starts one infinite withRepeat for `left` and one for `width` each time it starts the loading animation.
const REPEATS_PER_START = 2;

describe('LoadingBar', () => {
    let withRepeatSpy: jest.SpyInstance;
    let withTimingSpy: jest.SpyInstance;

    beforeEach(() => {
        withRepeatSpy = jest.spyOn(Reanimated, 'withRepeat');
        withTimingSpy = jest.spyOn(Reanimated, 'withTiming');
    });

    afterEach(() => {
        withRepeatSpy.mockRestore();
        withTimingSpy.mockRestore();
    });

    // Only the fade-out passes a completion callback to withTiming, which cancels the left and width animations.
    function getFadeOutCallCount() {
        return withTimingSpy.mock.calls.filter(([toValue, , callback]) => toValue === 0 && typeof callback === 'function').length;
    }

    it('restarts the loading animation on reveal after the hide cancelled it', () => {
        // Given a loading bar that is showing inside a visible Activity
        const {rerender} = render(
            <Activity mode="visible">
                <LoadingBar shouldShow />
            </Activity>,
        );
        expect(withRepeatSpy).toHaveBeenCalledTimes(REPEATS_PER_START);

        // When the Activity hides and reveals it while loading continues
        rerender(
            <Activity mode="hidden">
                <LoadingBar shouldShow />
            </Activity>,
        );
        rerender(
            <Activity mode="visible">
                <LoadingBar shouldShow />
            </Activity>,
        );

        // Then the animation starts again, because the useSharedValue cleanup in Reanimated cancelled it on hide
        expect(withRepeatSpy).toHaveBeenCalledTimes(REPEATS_PER_START * 2);
    });

    it('restarts the fade-out on reveal after a hide during the fade-out cancelled it', () => {
        // Given a loading bar that has just stopped loading and is fading out inside a visible Activity
        const {rerender} = render(
            <Activity mode="visible">
                <LoadingBar shouldShow />
            </Activity>,
        );
        rerender(
            <Activity mode="visible">
                <LoadingBar shouldShow={false} />
            </Activity>,
        );
        expect(getFadeOutCallCount()).toBe(1);

        // When the Activity hides and reveals it before the fade-out finished
        rerender(
            <Activity mode="hidden">
                <LoadingBar shouldShow={false} />
            </Activity>,
        );
        rerender(
            <Activity mode="visible">
                <LoadingBar shouldShow={false} />
            </Activity>,
        );

        // Then the fade-out runs again, because the useSharedValue cleanup in Reanimated froze the opacity on hide
        expect(getFadeOutCallCount()).toBe(2);
    });

    it('restarts the loading animation after the StrictMode remount cancelled it on first mount', () => {
        // Given a loading bar that mounts while loading under StrictMode
        // When StrictMode runs the simulated unmount and remount of its effects
        render(
            <StrictMode>
                <LoadingBar shouldShow />
            </StrictMode>,
        );

        // Then the remount starts the animation again, because the useSharedValue cleanup in Reanimated cancelled it on the simulated unmount
        expect(withRepeatSpy).toHaveBeenCalledTimes(REPEATS_PER_START * 2);
    });
});
