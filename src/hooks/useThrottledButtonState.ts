import {useEffect, useRef, useState} from 'react';

type ThrottledButtonState = [boolean, () => void];

const RESET_DELAY = 1800;

export default function useThrottledButtonState(onReset?: () => void): ThrottledButtonState {
    const [isButtonActive, setIsButtonActive] = useState(true);
    const resetDeadlineRef = useRef<number | null>(null);

    useEffect(() => {
        if (isButtonActive) {
            return;
        }

        // The deadline is stamped once per inactive period, so a re-run (Activity reveal, onReset change) waits only the time left.
        const resetDeadline = resetDeadlineRef.current ?? Date.now() + RESET_DELAY;
        resetDeadlineRef.current = resetDeadline;
        const remainingDelay = Math.min(Math.max(resetDeadline - Date.now(), 0), RESET_DELAY);

        const timer = setTimeout(() => {
            resetDeadlineRef.current = null;
            onReset?.();
            setIsButtonActive(true);
        }, remainingDelay);

        return () => clearTimeout(timer);
    }, [isButtonActive, onReset]);

    return [isButtonActive, () => setIsButtonActive(false)];
}
