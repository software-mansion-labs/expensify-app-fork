import {turnOffMobileSelectionMode} from '@libs/actions/MobileSelectionMode';

import ONYXKEYS from '@src/ONYXKEYS';

import {useEffect, useRef} from 'react';

import useOnyx from './useOnyx';
import usePrevious from './usePrevious';
import useScreenActivityEffect from './useScreenActivityEffect';

export default function useMobileSelectionMode(onTurnOffSelectionMode = () => {}) {
    const [isSelectionModeEnabled = false] = useOnyx(ONYXKEYS.RAM_ONLY_MOBILE_SELECTION_MODE);
    const initialSelectionModeValueRef = useRef(isSelectionModeEnabled);
    const prevIsSelectionModeEnabled = usePrevious(isSelectionModeEnabled);

    useScreenActivityEffect(() => {
        // in case the selection mode is already off at the start, we don't need to turn it off again
        if (!initialSelectionModeValueRef.current) {
            return;
        }
        turnOffMobileSelectionMode();
    }, []);

    useEffect(() => {
        if (!prevIsSelectionModeEnabled || isSelectionModeEnabled) {
            return;
        }
        onTurnOffSelectionMode();
    }, [prevIsSelectionModeEnabled, isSelectionModeEnabled, onTurnOffSelectionMode]);

    return !!isSelectionModeEnabled;
}
