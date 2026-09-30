import {useEffect, useEffectEvent, useRef} from 'react';

/**
 * Runs `applySign` after a caller-owned sign changes. The first render is skipped, because the root starts from the value
 * already joined with that sign.
 */
function useCallerSignChangeEffect(isNegative: boolean | undefined, applySign: (isNegative: boolean) => void) {
    const previousIsNegative = useRef(isNegative);
    const applySignEvent = useEffectEvent(applySign);

    useEffect(() => {
        if (previousIsNegative.current === isNegative) {
            return;
        }

        previousIsNegative.current = isNegative;
        if (isNegative === undefined) {
            return;
        }

        applySignEvent(isNegative);
    }, [isNegative]);
}

export default useCallerSignChangeEffect;
