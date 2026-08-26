import type {AppStateStatus} from 'react-native';

import React from 'react';
import {AppState} from 'react-native';

import type AppStateType from './types';
import type {UseAppStateProps} from './types';

function getAppState(status: AppStateStatus): AppStateType {
    return {
        isForeground: status === 'active',
        isInactive: status === 'inactive',
        isBackground: status === 'background',
    };
}

function isSameAppState(a: AppStateType, b: AppStateType): boolean {
    return a.isForeground === b.isForeground && a.isInactive === b.isInactive && a.isBackground === b.isBackground;
}

function useAppState({onAppStateChange}: UseAppStateProps = {}) {
    const [appState, setAppState] = React.useState<AppStateType>(() => getAppState(AppState.currentState));

    React.useEffect(() => {
        function applyStatus(nextAppState: AppStateStatus) {
            const nextState = getAppState(nextAppState);
            setAppState((previousState) => (isSameAppState(previousState, nextState) ? previousState : nextState));
        }

        // The listener misses every change made while it was detached, so the current status is read back before listening again.
        applyStatus(AppState.currentState);

        function handleAppStateChange(nextAppState: AppStateStatus) {
            applyStatus(nextAppState);

            onAppStateChange?.(nextAppState);
        }
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [onAppStateChange]);

    return appState;
}

export default useAppState;
