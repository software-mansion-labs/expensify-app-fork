import {act, render, screen} from '@testing-library/react-native';

import ReanimatedModal from '@components/Modal/ReanimatedModal';

import type * as AndroidGetPlatformModule from '@libs/getPlatform/index.android.ts';

import type {ReactNode, Ref} from 'react';
import type {ViewProps} from 'react-native';

import React, {Activity, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {Modal, View} from 'react-native';

type MockAnimationCallback = (finished: boolean) => void;

type MockRunningAnimation = {
    settle: (finished: boolean) => void;
};

// The stock reanimated mock never runs layout animations, so it cannot show a view removed during its entering
// animation. These mocks follow the native runtime: an entering animation runs until the test finishes it, removing
// the view first cancels it with callback(false) and then starts the exiting animation.
const mockRunningEnteringAnimations = new Set<MockRunningAnimation>();
const mockPendingExitCallbacks: MockAnimationCallback[] = [];

// Module-level queue writers, because React Compiler rejects mutating a module value from inside a component.
function mockStartEnteringAnimation(callback: MockAnimationCallback): MockRunningAnimation {
    let isRunning = true;
    const runningAnimation: MockRunningAnimation = {
        settle(finished) {
            if (!isRunning) {
                return;
            }
            isRunning = false;
            mockRunningEnteringAnimations.delete(runningAnimation);
            callback(finished);
        },
    };
    mockRunningEnteringAnimations.add(runningAnimation);
    return runningAnimation;
}

function mockQueueExitCallback(callback: MockAnimationCallback) {
    mockPendingExitCallbacks.push(callback);
}

class MockKeyframe {
    callback?: MockAnimationCallback;

    duration() {
        return this;
    }

    delay() {
        return this;
    }

    reduceMotion() {
        return this;
    }

    withCallback(callback: MockAnimationCallback) {
        this.callback = callback;
        return this;
    }
}

type MockAnimatedViewProps = ViewProps & {entering?: MockKeyframe; exiting?: MockKeyframe; ref?: Ref<View>; children?: ReactNode};

// Reanimated starts the entering animation once at mount and reads the latest exiting config when the view is removed.
function MockAnimatedView({entering, exiting, ref, children, ...props}: MockAnimatedViewProps) {
    const [enteringCallbackAtMount] = useState(() => entering?.callback);
    const exitingRef = useRef(exiting);

    useEffect(() => {
        exitingRef.current = exiting;
    }, [exiting]);

    useLayoutEffect(() => {
        const runningEntering = enteringCallbackAtMount ? mockStartEnteringAnimation(enteringCallbackAtMount) : undefined;

        return () => {
            runningEntering?.settle(false);
            const exitCallback = exitingRef.current?.callback;
            if (!exitCallback) {
                return;
            }
            mockQueueExitCallback(exitCallback);
        };
    }, [enteringCallbackAtMount]);

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
    };
});

// Android reports onModalHide from the exit callback, so it shows whether a close reaches the consumer.
jest.mock('@libs/getPlatform', () => jest.requireActual<typeof AndroidGetPlatformModule>('@libs/getPlatform/index.android.ts'));

// The BaseModal default, which every app modal passes down.
const SWIPE_THRESHOLD = 150;

// The animation callbacks reach the modal through scheduleOnRN, which the worklets mock queues as a microtask.
function finishEnteringAnimations() {
    return act(async () => {
        for (const runningAnimation of [...mockRunningEnteringAnimations]) {
            runningAnimation.settle(true);
        }
        await Promise.resolve();
    });
}

function finishExitAnimations() {
    return act(async () => {
        for (const exitCallback of mockPendingExitCallbacks.splice(0)) {
            exitCallback(true);
        }
        await Promise.resolve();
    });
}

describe('native ReanimatedModal lifecycle', () => {
    beforeEach(() => {
        mockRunningEnteringAnimations.clear();
        mockPendingExitCallbacks.length = 0;
    });

    it('opens when the entering animation finishes and reports the close when the exiting animation finishes', async () => {
        // Given a modal whose entering animation is still running
        const onModalShow = jest.fn();
        const onModalHide = jest.fn();
        const modal = (isVisible: boolean) => (
            <ReanimatedModal
                swipeThreshold={SWIPE_THRESHOLD}
                isVisible={isVisible}
                onModalShow={onModalShow}
                onModalHide={onModalHide}
            >
                <View testID="modalContent" />
            </ReanimatedModal>
        );
        const {rerender} = render(modal(true));
        expect(onModalShow).not.toHaveBeenCalled();

        // When the entering animation finishes
        await finishEnteringAnimations();

        // Then the modal reports one open
        expect(screen.getByTestId('modalContent')).toBeTruthy();
        expect(onModalShow).toHaveBeenCalledTimes(1);

        // When the user closes it and the exiting animation finishes
        rerender(modal(false));
        await finishExitAnimations();

        // Then the modal reports one close and is no longer presented
        expect(onModalHide).toHaveBeenCalledTimes(1);
        expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);
    });

    it('finishes opening after Activity hides it during the entering animation and reveals it', async () => {
        // Given a modal whose entering animation is still running
        const onModalShow = jest.fn();
        const onModalWillHide = jest.fn();
        const onModalHide = jest.fn();
        const modal = (isVisible: boolean) => (
            <ReanimatedModal
                swipeThreshold={SWIPE_THRESHOLD}
                isVisible={isVisible}
                onModalShow={onModalShow}
                onModalWillHide={onModalWillHide}
                onModalHide={onModalHide}
            >
                <View testID="modalContent" />
            </ReanimatedModal>
        );
        const {rerender} = render(<Activity mode="visible">{modal(true)}</Activity>);
        expect(onModalShow).not.toHaveBeenCalled();

        // When Activity cancels the entering animation and the hidden container exits
        rerender(<Activity mode="hidden">{modal(true)}</Activity>);
        await finishExitAnimations();

        // Then the cancelled entering animation does not open a modal without content
        expect(onModalShow).not.toHaveBeenCalled();
        expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);

        // When the screen is revealed and the new entering animation finishes
        rerender(<Activity mode="visible">{modal(true)}</Activity>);
        await finishEnteringAnimations();

        // Then the modal recovers its content and opens once without treating the hide as a user close
        expect(screen.getByTestId('modalContent')).toBeTruthy();
        expect(onModalShow).toHaveBeenCalledTimes(1);
        expect(onModalWillHide).not.toHaveBeenCalled();
        expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(true);

        // When the user closes the recovered modal and its exiting animation finishes
        rerender(<Activity mode="visible">{modal(false)}</Activity>);
        await finishExitAnimations();

        // Then the recovered state also permits a real close
        expect(onModalWillHide).toHaveBeenCalledTimes(1);
        expect(onModalHide).toHaveBeenCalledTimes(1);
        expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);
    });
});
