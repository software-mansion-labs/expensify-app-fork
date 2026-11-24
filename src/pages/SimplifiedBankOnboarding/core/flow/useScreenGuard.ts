/**
 * The screen guard of a navigation that a handler starts after an await. The navigation runs only when the awaited
 * outcome succeeded (a plain write that resolves with nothing counts as success) and the screen is still mounted, still focused and still shows the same position. So a late answer
 * never moves a screen that the user or the flow already left, and a second press while one waits does nothing.
 */
import Log from '@libs/Log';

import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/core/requests/types';

import {useIsFocused} from '@react-navigation/native';
import {useEffect, useRef} from 'react';

/**
 * @param positionKey - what the screen shows now (step, page and edit flag). A change between the start and the end of
 * the wait cancels the navigation.
 * @returns a function that waits for `outcome` and then calls `navigate` when the guard allows it
 */
function useScreenGuard(positionKey: string): (outcome: Promise<RequestOutcome | void>, navigate: () => void) => void {
    const isFocused = useIsFocused();
    const latestScreenRef = useRef({positionKey, isFocused});
    const isMountedRef = useRef(false);
    const isWaitingRef = useRef(false);

    useEffect(() => {
        latestScreenRef.current = {positionKey, isFocused};
    }, [positionKey, isFocused]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    function navigateAfter(outcome: Promise<RequestOutcome | void>, navigate: () => void) {
        if (isWaitingRef.current) {
            return;
        }
        isWaitingRef.current = true;
        const startPositionKey = positionKey;

        outcome
            .then((result) => {
                const latestScreen = latestScreenRef.current;
                if ((result && result.status !== 'succeeded') || !isMountedRef.current || !latestScreen.isFocused || latestScreen.positionKey !== startPositionKey) {
                    return;
                }
                navigate();
            })
            .catch((error: unknown) => {
                Log.warn('[SimplifiedBankOnboarding] A navigation after an await did not run', {error: String(error)});
            })
            .finally(() => {
                isWaitingRef.current = false;
            });
    }

    return navigateAfter;
}

export default useScreenGuard;
