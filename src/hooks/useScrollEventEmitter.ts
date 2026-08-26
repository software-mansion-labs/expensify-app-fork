import CONST from '@src/CONST';

import {useCallback, useEffect, useRef} from 'react';
import {DeviceEventEmitter} from 'react-native';

/**
 * This hook tracks scroll events and emits a "scrolling" event when scrolling starts and ends.
 */
const useScrollEventEmitter = () => {
    const isScrollingRef = useRef<boolean>(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const triggerScrollEvent = useCallback(() => {
        const emitScrolling = (isScrolling: boolean) => {
            DeviceEventEmitter.emit(CONST.EVENTS.SCROLLING, isScrolling);
        };

        // Start emitting the scrolling event when the scroll begins
        if (!isScrollingRef.current) {
            emitScrolling(true);
            isScrollingRef.current = true;
        }

        // End the scroll and emit after a brief timeout to detect the end of scrolling
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            emitScrolling(false);
            isScrollingRef.current = false;
        }, 250);
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (!timeoutRef.current) {
                return;
            }
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;

            // The pending timeout was the only thing that would have ended the scroll, so the listeners are told here instead.
            isScrollingRef.current = false;
            DeviceEventEmitter.emit(CONST.EVENTS.SCROLLING, false);
        };
    }, []);

    return triggerScrollEvent;
};

export default useScrollEventEmitter;
