import {useEffect, useRef, useState} from 'react';

type ThrottledButtonState = [boolean, () => void];

const RESET_DELAY = 1800;

export default function useThrottledButtonState(onReset?: () => void): ThrottledButtonState {
    const [isButtonActive, setIsButtonActive] = useState(true);
    const resetDeadlineRef = useRef(0);

    useEffect(() => {
        if (isButtonActive) {
            return;
        }

        const timer = setTimeout(
            () => {
                onReset?.();
                setIsButtonActive(true);
            },
            Math.max(resetDeadlineRef.current - Date.now(), 0),
        );

        return () => clearTimeout(timer);
    }, [isButtonActive, onReset]);

    return [
        isButtonActive,
        () => {
            resetDeadlineRef.current = Date.now() + RESET_DELAY;
            setIsButtonActive(false);
        },
    ];
}
