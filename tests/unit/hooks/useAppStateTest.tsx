import {act, render, screen} from '@testing-library/react-native';

import useAppState from '@hooks/useAppState/index.native';

import type {ActivityProps, ReactNode} from 'react';
import type {AppStateStatus} from 'react-native';

import {Activity, useSyncExternalStore} from 'react';
import {AppState, View} from 'react-native';

const appStateListeners = new Set<(state: AppStateStatus) => void>();
let currentAppState: AppStateStatus = 'active';

// Stands in for any re-render with an unchanged AppState, like Lottie's setAnimationFile right after mount.
const unrelatedListeners = new Set<() => void>();
let unrelatedValue = 0;

function subscribeToUnrelated(onChange: () => void) {
    unrelatedListeners.add(onChange);
    return () => unrelatedListeners.delete(onChange);
}

function getUnrelatedSnapshot() {
    return unrelatedValue;
}

function rerenderForUnrelatedReason() {
    act(() => {
        unrelatedValue += 1;
        for (const listener of [...unrelatedListeners]) {
            listener();
        }
    });
}

function changeAppState(state: AppStateStatus) {
    act(() => {
        currentAppState = state;
        for (const listener of [...appStateListeners]) {
            listener(state);
        }
    });
}

type AppStateProbeProps = {
    onAppStateChange?: (nextAppState: AppStateStatus) => void;
};

function AppStateProbe({onAppStateChange}: AppStateProbeProps) {
    const {isBackground} = useAppState({onAppStateChange});
    useSyncExternalStore(subscribeToUnrelated, getUnrelatedSnapshot);
    return (
        <View
            testID="appStateProbe"
            accessibilityLabel={isBackground ? 'background' : 'notBackground'}
        />
    );
}

function Screen({mode, children}: {mode: ActivityProps['mode']; children: ReactNode}) {
    return <Activity mode={mode}>{children}</Activity>;
}

describe('useAppState (native)', () => {
    beforeEach(() => {
        appStateListeners.clear();
        unrelatedListeners.clear();
        currentAppState = 'active';
        jest.spyOn(AppState, 'currentState', 'get').mockImplementation(() => currentAppState);
        jest.spyOn(AppState, 'addEventListener').mockImplementation((type, listener) => {
            appStateListeners.add(listener);
            return {remove: () => appStateListeners.delete(listener)};
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('shows an AppState change made while hidden after an unrelated re-render before the hide', () => {
        // Given a visible probe that went to the background and then re-rendered for an unrelated reason
        const probe = <AppStateProbe />;
        const {rerender} = render(<Screen mode="visible">{probe}</Screen>);
        changeAppState('background');
        rerenderForUnrelatedReason();
        expect(screen.getByTestId('appStateProbe')).toHaveProp('accessibilityLabel', 'background');

        // When the app returns to the foreground while the probe is hidden, and the probe is revealed
        rerender(<Screen mode="hidden">{probe}</Screen>);
        changeAppState('active');
        rerender(<Screen mode="visible">{probe}</Screen>);

        // Then the revealed probe reads the current status instead of the one from before the hide
        expect(screen.getByTestId('appStateProbe')).toHaveProp('accessibilityLabel', 'notBackground');
    });

    it('shows the foreground status on reveal when the probe was mounted in the background and re-rendered', () => {
        // Given a probe mounted while the app is in the background, which then re-renders with the same status
        currentAppState = 'background';
        const probe = <AppStateProbe />;
        const {rerender} = render(<Screen mode="visible">{probe}</Screen>);
        rerenderForUnrelatedReason();
        expect(screen.getByTestId('appStateProbe')).toHaveProp('accessibilityLabel', 'background');

        // When the app returns to the foreground while the probe is hidden, and the probe is revealed
        rerender(<Screen mode="hidden">{probe}</Screen>);
        changeAppState('active');
        rerender(<Screen mode="visible">{probe}</Screen>);

        // Then the revealed probe no longer reports the background status
        expect(screen.getByTestId('appStateProbe')).toHaveProp('accessibilityLabel', 'notBackground');
    });

    it('fires onAppStateChange only for real AppState changes, not for the hide and reveal', () => {
        // Given a visible probe with an onAppStateChange callback
        const onAppStateChange = jest.fn();
        const probe = <AppStateProbe onAppStateChange={onAppStateChange} />;
        const {rerender} = render(<Screen mode="visible">{probe}</Screen>);

        // When the probe is hidden and revealed without any AppState change
        rerender(<Screen mode="hidden">{probe}</Screen>);
        rerender(<Screen mode="visible">{probe}</Screen>);

        // Then the callback has not fired, because resubscribing is not an AppState change
        expect(onAppStateChange).not.toHaveBeenCalled();

        // When the app goes to the background after the reveal
        changeAppState('background');

        // Then the callback fires exactly once with the new status
        expect(onAppStateChange).toHaveBeenCalledTimes(1);
        expect(onAppStateChange).toHaveBeenCalledWith('background');
    });
});
