import React from 'react';
import {AppState} from 'react-native';

import type AppStateType from './types';
import type {UseAppStateProps} from './types';

function subscribeToAppState(onStoreChange: () => void) {
    const subscription = AppState.addEventListener('change', onStoreChange);
    // useSyncExternalStore does not re-check the snapshot when it resubscribes after an <Activity> reveal.
    onStoreChange();
    return () => subscription.remove();
}

function getAppStateSnapshot() {
    return AppState.currentState;
}

function useAppState({onAppStateChange}: UseAppStateProps = {}): AppStateType {
    const appStateStatus = React.useSyncExternalStore(subscribeToAppState, getAppStateSnapshot);

    React.useEffect(() => {
        if (!onAppStateChange) {
            return;
        }
        const subscription = AppState.addEventListener('change', onAppStateChange);
        return () => subscription.remove();
    }, [onAppStateChange]);

    return {
        isForeground: appStateStatus === 'active',
        isInactive: appStateStatus === 'inactive',
        isBackground: appStateStatus === 'background',
    };
}

export default useAppState;
