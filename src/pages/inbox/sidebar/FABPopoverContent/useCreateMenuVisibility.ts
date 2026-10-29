import useDragoverDismiss from '@hooks/useDragoverDismiss';
import useResponsiveLayout from '@hooks/useResponsiveLayout';

import {useFocusEffect, useIsFocused} from '@react-navigation/native';
import {useRef, useState} from 'react';

/** Open state of the create menu, shared by every button that opens it so they open and close it the same way. */
function useCreateMenuVisibility() {
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const isFocused = useIsFocused();
    const [isCreateMenuActive, setIsCreateMenuActive] = useState(false);
    // Bumped on every close, so an open still waiting on `beforeShow` is dropped once the screen blurs or the menu is dismissed.
    const closeCountRef = useRef(0);

    const showCreateMenu = () => {
        if (!isFocused && shouldUseNarrowLayout) {
            return;
        }
        setIsCreateMenuActive(true);
    };

    const hideCreateMenu = () => {
        closeCountRef.current += 1;
        setIsCreateMenuActive(false);
    };

    /**
     * Closes an open menu, otherwise opens it.
     * @param beforeShow runs first when opening, e.g. to measure where the menu goes; the menu opens once it settles
     */
    const toggleCreateMenu = (beforeShow?: () => Promise<unknown>) => {
        if (isCreateMenuActive) {
            hideCreateMenu();
            return;
        }
        if (!beforeShow) {
            showCreateMenu();
            return;
        }
        const closeCountAtPress = closeCountRef.current;
        beforeShow().then(() => {
            if (closeCountRef.current !== closeCountAtPress) {
                return;
            }
            showCreateMenu();
        });
    };

    // Close the menu when the screen loses focus (e.g. navigating away)
    useFocusEffect(() => {
        return () => hideCreateMenu();
    });

    // Close menu on dragover, so the popover does not stay open during file drag
    useDragoverDismiss(isCreateMenuActive, hideCreateMenu);

    return {
        isCreateMenuActive,
        isCreateMenuVisible: isCreateMenuActive && (!shouldUseNarrowLayout || isFocused),
        showCreateMenu,
        hideCreateMenu,
        toggleCreateMenu,
    };
}

export default useCreateMenuVisibility;
