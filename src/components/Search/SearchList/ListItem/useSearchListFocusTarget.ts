/**
 * Hooks that make an element nested in a Search list row, such as an open group's expense or its "Show more" link, a
 * place the arrow keys can stop. The element registers with the list, which then scrolls it into view and runs its
 * action on Enter, and it takes the list's focus when the user clicks or tabs to it.
 */
import useIsSearchRowFocused from '@components/Search/hooks/useIsSearchRowFocused';
import {useSearchListFocusTargetContext} from '@components/Search/SearchList/BaseSearchList/SearchListFocusTargetContext';
import type {ExtendedTargetedEvent} from '@components/SelectionList/ListItem/types';

import useSyncFocus from '@hooks/useSyncFocus';

import type {ComponentRef, RefObject} from 'react';
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

    useSyncFocus(ref, isFocused, true, true);
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

export default useSearchListFocusTarget;
export {useRegisterSearchListFocusTarget};
