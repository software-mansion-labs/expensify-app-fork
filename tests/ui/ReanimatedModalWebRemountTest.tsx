import {act, render, screen} from '@testing-library/react-native';

import ReanimatedModal from '@components/Modal/ReanimatedModal';
import type * as WebContainerModule from '@components/Modal/ReanimatedModal/Container/index.web.tsx';

import type * as WebGetPlatformModule from '@libs/getPlatform/index.ts';

import type {ReactNode, Ref} from 'react';
import type {ViewProps} from 'react-native';

import React, {StrictMode, useEffect, useLayoutEffect, useState} from 'react';
import {Modal, View} from 'react-native';

type MockAnimationCallback = (finished: boolean) => void;

type MockAnimation = {
    toValue: number;
    callback?: MockAnimationCallback;
};

type MockSharedValue = {
    get: () => number;
    set: (next: number | MockAnimation) => void;
};

// The stock reanimated mock finishes withTiming synchronously and never cancels it, so it cannot show a remount
// that cancels the open animation. These mocks follow the web runtime: an animation runs until the test finishes it,
// and a newer value or the useSharedValue cleanup cancels it with callback(false).
const mockRunningAnimationFinishers: Array<() => void> = [];
const mockPendingExitCallbacks: Array<() => void> = [];
const mockAnimatedStyleUpdaters: Array<() => unknown> = [];

// Module-level queue writers, because React Compiler rejects mutating a module value from inside a component.
function mockQueueRunningAnimation(finishAnimation: () => void) {
    mockRunningAnimationFinishers.push(finishAnimation);
}

function mockQueueExitCallback(callback: () => void) {
    mockPendingExitCallbacks.push(callback);
}

function mockRecordAnimatedStyleUpdater(updater: () => unknown) {
    mockAnimatedStyleUpdaters.push(updater);
}

function mockCreateSharedValue(initialValue: number): MockSharedValue {
    let value = initialValue;
    let runningAnimation: MockAnimation | undefined;

    return {
        get: () => value,
        set: (next) => {
            const previousAnimation = runningAnimation;
            runningAnimation = undefined;
            previousAnimation?.callback?.(false);

            if (typeof next === 'number') {
                value = next;
                return;
            }
            // Reanimated finishes an animation at once when the value already sits at its target.
            if (next.toValue === value) {
                next.callback?.(true);
                return;
            }
            runningAnimation = next;
            mockQueueRunningAnimation(() => {
                if (runningAnimation !== next) {
                    return;
                }
                runningAnimation = undefined;
                value = next.toValue;
                next.callback?.(true);
            });
        },
    };
}

// Declared at module level with the real React imports, so React Compiler recognizes the hooks; the factory only returns them.
function useMockSharedValue(initialValue: number) {
    const [sharedValue] = useState(() => mockCreateSharedValue(initialValue));

    // Reanimated's web cancelAnimation writes the current value back, which cancels the running animation.
    useEffect(() => () => sharedValue.set(sharedValue.get()), [sharedValue]);

    return sharedValue;
}

function useMockAnimatedStyle(updater: () => unknown) {
    mockRecordAnimatedStyleUpdater(updater);
    return {};
}

// The jest.mock factory may only reference names that start with "mock", and hook names must start with "use".
const mockHooks = {useSharedValue: useMockSharedValue, useAnimatedStyle: useMockAnimatedStyle};

function mockWithTiming(toValue: number, config: unknown, callback?: MockAnimationCallback): MockAnimation {
    return {toValue, callback};
}

class MockKeyframe {
    exitCallback?: () => void;

    duration() {
        return this;
    }

    delay() {
        return this;
    }

    reduceMotion() {
        return this;
    }

    withCallback(callback: () => void) {
        this.exitCallback = callback;
        return this;
    }
}

// Reanimated starts the exiting animation when the view unmounts, which a StrictMode remount also does.
function MockAnimatedView({exiting, ref, children, ...props}: ViewProps & {exiting?: MockKeyframe; ref?: Ref<View>; children?: ReactNode}) {
    const exitCallback = exiting?.exitCallback;
    useLayoutEffect(
        () => () => {
            if (!exitCallback) {
                return;
            }
            mockQueueExitCallback(exitCallback);
        },
        [exitCallback],
    );

    return (
        <View
            ref={ref}
            {...props}
        >
            {children}
        </View>
    );
}

jest.mock('react-native-reanimated', () => {
    const actual = jest.requireActual<{default: Record<string, unknown>}>('react-native-reanimated/mock');
    return {
        ...actual,
        default: {...actual.default, View: MockAnimatedView},
        LayoutAnimationConfig: ({children}: {children: ReactNode}) => children,
        // A getter, because the module is first required by the imports above, before this class is initialized.
        get Keyframe() {
            return MockKeyframe;
        },
        useSharedValue: (initialValue: number) => mockHooks.useSharedValue(initialValue),
        useAnimatedStyle: (updater: () => unknown) => mockHooks.useAnimatedStyle(updater),
        withTiming: mockWithTiming,
    };
});

// The explicit extensions skip the jest platform resolution, which picks the native files for a bare path.
jest.mock('@components/Modal/ReanimatedModal/Container', () => jest.requireActual<typeof WebContainerModule>('@components/Modal/ReanimatedModal/Container/index.web.tsx'));

jest.mock('@libs/getPlatform', () => jest.requireActual<typeof WebGetPlatformModule>('@libs/getPlatform/index.ts'));

// The BaseModal default, which every app modal passes down.
const SWIPE_THRESHOLD = 150;

function finishRunningAnimations() {
    act(() => {
        for (const finishAnimation of mockRunningAnimationFinishers.splice(0)) {
            finishAnimation();
        }
    });
}

function finishExitAnimations() {
    act(() => {
        for (const exitCallback of mockPendingExitCallbacks.splice(0)) {
            exitCallback();
        }
    });
}

function readLatestContainerStyle() {
    return mockAnimatedStyleUpdaters.at(-1)?.();
}

describe('web ReanimatedModal across a StrictMode remount', () => {
    beforeEach(() => {
        mockRunningAnimationFinishers.length = 0;
        mockPendingExitCallbacks.length = 0;
        mockAnimatedStyleUpdaters.length = 0;
    });

    it('opens once and to full progress when the remount cancelled the first open animation', () => {
        // Given a closed modal in a StrictMode tree
        const onModalShow = jest.fn();
        const {rerender} = render(
            <StrictMode>
                <ReanimatedModal
                    swipeThreshold={SWIPE_THRESHOLD}
                    isVisible={false}
                    onModalShow={onModalShow}
                >
                    <View testID="modalContent" />
                </ReanimatedModal>
            </StrictMode>,
        );

        // When it opens, StrictMode remounts the new container, and the open animation finishes
        rerender(
            <StrictMode>
                <ReanimatedModal
                    swipeThreshold={SWIPE_THRESHOLD}
                    isVisible
                    onModalShow={onModalShow}
                >
                    <View testID="modalContent" />
                </ReanimatedModal>
            </StrictMode>,
        );
        finishRunningAnimations();

        // Then the container reaches full opacity and onModalShow fires once, for the animation that finished
        expect(readLatestContainerStyle()).toEqual({opacity: 1});
        expect(onModalShow).toHaveBeenCalledTimes(1);
    });

    it('ignores the exit the remount replays and still closes on a real close', () => {
        // Given a modal opened in a StrictMode tree, whose remount replayed the container exit animation
        const onModalWillShow = jest.fn();
        const onModalWillHide = jest.fn();
        const {rerender} = render(
            <StrictMode>
                <ReanimatedModal
                    swipeThreshold={SWIPE_THRESHOLD}
                    isVisible={false}
                    onModalWillShow={onModalWillShow}
                    onModalWillHide={onModalWillHide}
                >
                    <View testID="modalContent" />
                </ReanimatedModal>
            </StrictMode>,
        );
        rerender(
            <StrictMode>
                <ReanimatedModal
                    swipeThreshold={SWIPE_THRESHOLD}
                    isVisible
                    onModalWillShow={onModalWillShow}
                    onModalWillHide={onModalWillHide}
                >
                    <View testID="modalContent" />
                </ReanimatedModal>
            </StrictMode>,
        );
        finishRunningAnimations();

        // When the replayed exit finishes while the modal is still meant to be open
        finishExitAnimations();

        // Then the modal does not start opening again
        expect(onModalWillShow).toHaveBeenCalledTimes(1);

        // When the user closes it and the real exit animation finishes
        rerender(
            <StrictMode>
                <ReanimatedModal
                    swipeThreshold={SWIPE_THRESHOLD}
                    isVisible={false}
                    onModalWillShow={onModalWillShow}
                    onModalWillHide={onModalWillHide}
                >
                    <View testID="modalContent" />
                </ReanimatedModal>
            </StrictMode>,
        );
        finishExitAnimations();

        // Then the close goes through once and the native modal is no longer visible
        expect(onModalWillHide).toHaveBeenCalledTimes(1);
        expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);
    });
});
