/**
 * Lets a focus stop nested inside a list row, such as an open group's expense, tell the list it took focus, and hand
 * the list what Enter does on it and the element to scroll into view. The list owns the arrow-key focus, but only the
 * row knows where its nested targets are.
 */
import type {ExtendedTargetedEvent} from '@components/SelectionList/ListItem/types';

import type {ComponentRef, RefObject} from 'react';
import type {NativeSyntheticEvent, View} from 'react-native';

import {createContext, useContext} from 'react';

type SearchListFocusTarget = {
    /** The element the list measures to scroll the target into view */
    ref: RefObject<ComponentRef<typeof View> | null>;

    /** What Enter does while the target has focus. Without it, Enter does nothing there. */
    activate?: () => void;
};

type SearchListFocusTargetContextValue = {
    /**
     * Moves the list's arrow-key focus to the target with this key
     * @returns whether the list has a focus stop for the key. Without one, the row around the target keeps the focus.
     */
    onFocusTarget: (keyForList: string, event: NativeSyntheticEvent<ExtendedTargetedEvent>) => boolean;

    /** @returns the function that unregisters the target */
    registerFocusTarget: (keyForList: string, target: SearchListFocusTarget) => () => void;
};

const defaultValue: SearchListFocusTargetContextValue = {
    onFocusTarget: () => false,
    registerFocusTarget: () => () => {},
};

const SearchListFocusTargetContext = createContext<SearchListFocusTargetContextValue>(defaultValue);

function useSearchListFocusTargetContext() {
    return useContext(SearchListFocusTargetContext);
}

export default SearchListFocusTargetContext;
export {useSearchListFocusTargetContext};
export type {SearchListFocusTarget, SearchListFocusTargetContextValue};
