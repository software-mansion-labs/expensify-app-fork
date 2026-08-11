import {createContext, useContext} from 'react';

type ListItemFocusContextValue = {
    /**
     * Whether the row should render focus styling. True when the row is logically focused (keyboard index)
     * AND the highlight is allowed to show (initial highlight enabled or the user is keyboard-navigating),
     * so it can lag behind logical focus — see BaseSelectionList's isItemVisuallyFocused.
     */
    isFocusVisible?: boolean;

    /** Whether the row is hovered. Always false when the row disables hover styling (shouldDisableHoverStyle). */
    isHovered?: boolean;
};

const ListItemFocusContext = createContext<ListItemFocusContextValue>({isFocusVisible: false, isHovered: false});

function useListItemFocus() {
    return useContext(ListItemFocusContext);
}

export {ListItemFocusContext, useListItemFocus};
