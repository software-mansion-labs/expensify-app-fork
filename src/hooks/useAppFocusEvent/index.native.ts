import useScreenActivityEffect from '@hooks/useScreenActivityEffect';

import {AppState} from 'react-native';

import type {UseAppFocusEvent, UseAppFocusEventCallback} from './types';

const useAppFocusEvent: UseAppFocusEvent = (callback: UseAppFocusEventCallback) => {
    // The listener is kept while an Activity screen is covered, so a background to foreground cycle behind the cover
    // still reaches the callback instead of being lost.
    useScreenActivityEffect(() => {
        const subscription = AppState.addEventListener('change', (appState) => {
            if (appState !== 'active') {
                return;
            }
            callback();
        });

        return () => {
            subscription.remove();
        };
    }, [callback]);
};

export default useAppFocusEvent;
