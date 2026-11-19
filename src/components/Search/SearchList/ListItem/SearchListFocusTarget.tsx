import useIsSearchRowFocused from '@components/Search/hooks/useIsSearchRowFocused';
import {useSearchListFocusTargetContext} from '@components/Search/SearchList/BaseSearchList/SearchListFocusTargetContext';
import type {ExtendedTargetedEvent} from '@components/SelectionList/ListItem/types';

import useSyncFocus from '@hooks/useSyncFocus';

import type {ComponentRef, ReactNode, RefObject} from 'react';
import type {NativeSyntheticEvent, View} from 'react-native';

import {useLayoutEffect, useRef} from 'react';

type SearchListFocusTargetParams = {
    /** The key of the list's focus stop for this element */
    keyForList: string;

    /** What Enter does while the element has focus, which should be what a click on it does */
    activate?: () => void;
};

type SearchListFocusTargetState = {
    ref: RefObject<ComponentRef<typeof View> | null>;
    isFocused: boolean;
    onFocus: (event: NativeSyntheticEvent<ExtendedTargetedEvent>) => void;
};

type SearchListFocusTargetProps = SearchListFocusTargetParams & {
    children: (focusTarget: SearchListFocusTargetState) => ReactNode;
};

/** Registers an element the list measures for the stop with this key, without making it focusable */
function useRegisterSearchListFocusTarget(keyForList: string | undefined, ref: RefObject<ComponentRef<typeof View> | null>, activate?: () => void) {
    const {registerFocusTarget} = useSearchListFocusTargetContext();

    useLayoutEffect(() => {
        if (!keyForList) {
            return;
        }
        return registerFocusTarget(keyForList, {ref, activate});
    }, [registerFocusTarget, keyForList, ref, activate]);
}

/**
 * Makes an element nested inside a Search list row, such as an open group's expense, a stop the list's arrow keys move
 * focus to. It reads its own focus by key like a row does, and registers what Enter does on it and the element to
 * scroll into view.
 */
function useSearchListFocusTarget({keyForList, activate}: SearchListFocusTargetParams): SearchListFocusTargetState {
    const ref = useRef<ComponentRef<typeof View>>(null);
    const isFocused = useIsSearchRowFocused(keyForList);
    const {onFocusTarget} = useSearchListFocusTargetContext();

    useSyncFocus(ref, isFocused);
    useRegisterSearchListFocusTarget(keyForList, ref, activate);

    const moveListFocusToTarget = (event: NativeSyntheticEvent<ExtendedTargetedEvent>) => {
        // The row holding this element is focusable too, and would take the focus back if the event reached it. A list
        // without a stop for this element, such as the report list, leaves the focus to the row.
        if (!onFocusTarget(keyForList, event)) {
            return;
        }
        event.stopPropagation();
    };

    return {ref, isFocused, onFocus: moveListFocusToTarget};
}

/** The same as `useSearchListFocusTarget`, for elements rendered in a loop, where a hook can't be called */
function SearchListFocusTarget({keyForList, activate, children}: SearchListFocusTargetProps) {
    return children(useSearchListFocusTarget({keyForList, activate}));
}

export default SearchListFocusTarget;
export {useSearchListFocusTarget, useRegisterSearchListFocusTarget};
