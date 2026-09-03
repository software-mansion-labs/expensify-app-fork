import useScreenActivityEffect from '@hooks/useScreenActivityEffect';

import type {UseAppFocusEvent, UseAppFocusEventCallback} from './types';

/**
 * Runs the given callback when the app is focused (eg: after re-opening the app, switching tabs, or focusing the window)
 *
 * @param callback the function to run when the app is focused. This should be memoized with `useCallback`.
 */
const useAppFocusEvent: UseAppFocusEvent = (callback: UseAppFocusEventCallback) => {
    // The listener is kept while an Activity screen is covered, because a window regaining focus behind a cover is the
    // one signal nothing replays: visibilityState stays 'visible' the whole time.
    useScreenActivityEffect(() => {
        window.addEventListener('focus', callback);

        return () => {
            window.removeEventListener('focus', callback);
        };
    }, [callback]);
};

export default useAppFocusEvent;
