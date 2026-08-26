import type {ListItem} from '@components/SelectionList/types';

import {turnOffMobileSelectionMode, turnOnMobileSelectionMode} from '@libs/actions/MobileSelectionMode';

import {useIsFocused} from '@react-navigation/native';
import {useEffect, useRef} from 'react';

import useMobileSelectionMode from './useMobileSelectionMode';
import useResponsiveLayout from './useResponsiveLayout';

function useHandleSelectionMode<TItem extends ListItem>(selectedItems: readonly string[] | TItem[]) {
    // eslint-disable-next-line rulesdir/prefer-shouldUseNarrowLayout-instead-of-isSmallScreenWidth
    const {isSmallScreenWidth} = useResponsiveLayout();
    const isFocused = useIsFocused();

    const isMobileSelectionModeEnabled = useMobileSelectionMode();
    // Check if selection should be on when the modal is opened
    const wasSelectionOnRef = useRef(false);
    const isMobileSelectionModeEnabledRef = useRef(isMobileSelectionModeEnabled);
    const wasMobileSelectionModeOnAtCleanupRef = useRef(false);

    useEffect(() => {
        isMobileSelectionModeEnabledRef.current = isMobileSelectionModeEnabled;
        if (!isSmallScreenWidth) {
            if (selectedItems.length === 0 && isMobileSelectionModeEnabled) {
                turnOffMobileSelectionMode();
            }
            return;
        }
        if (!isFocused) {
            return;
        }
        if (!wasSelectionOnRef.current && selectedItems.length > 0) {
            wasSelectionOnRef.current = true;
        }
        if (selectedItems.length > 0 && !isMobileSelectionModeEnabled) {
            turnOnMobileSelectionMode();
        } else if (selectedItems.length === 0 && isMobileSelectionModeEnabled && !wasSelectionOnRef.current) {
            turnOffMobileSelectionMode();
        }
    }, [isMobileSelectionModeEnabled, isSmallScreenWidth, isFocused, selectedItems.length]);

    useEffect(() => {
        // A reveal puts back the global flag the matching teardown turned off, because covering the screen is not leaving it.
        if (wasMobileSelectionModeOnAtCleanupRef.current) {
            wasMobileSelectionModeOnAtCleanupRef.current = false;
            turnOnMobileSelectionMode();
        }
        return () => {
            wasMobileSelectionModeOnAtCleanupRef.current = isMobileSelectionModeEnabledRef.current;
            turnOffMobileSelectionMode();
        };
    }, []);
}

export default useHandleSelectionMode;
