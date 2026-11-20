/**
 * The Search list's keyboard focus: where the arrow keys move it, what Enter does on the focused row or nested target,
 * how a click or Tab moves it, and how it follows a stop that moved when groups open, close and load.
 */
import {useEditingCellState} from '@components/EditableCell';
import useTabBarCoveredHeight from '@components/Navigation/TabBarBottomContent/useTabBarCoveredHeight';
import type {ExtendedTargetedEvent} from '@components/SelectionList/ListItem/types';

import useArrowKeyFocusManager from '@hooks/useArrowKeyFocusManager';
import useKeyboardShortcut from '@hooks/useKeyboardShortcut';
import useOnyx from '@hooks/useOnyx';
import useStableIndexedHandler from '@hooks/useStableIndexedHandler';

import setSearchRowFocused from '@libs/actions/SearchRowFocus';
import {isMobileChrome} from '@libs/Browser';
import {addKeyDownPressListener, removeKeyDownPressListener} from '@libs/KeyboardShortcut/KeyDownPressListener';
import {isFocusRestoreInProgress} from '@libs/NavigationFocusReturn';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import {isModalActiveSelector} from '@src/selectors/Modal';

import type {GestureResponderEvent, NativeSyntheticEvent} from 'react-native';

import {useIsFocused} from '@react-navigation/native';
import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {StyleSheet} from 'react-native';

import type {SearchListFocusTarget, SearchListFocusTargetContextValue} from './SearchListFocusTargetContext';
import type BaseSearchListProps from './types';
import type {SearchListFocusStop} from './types';

import useRevealFocusStop from './useRevealFocusStop';

type UseSearchListFocusParams = Pick<
    BaseSearchListProps,
    'data' | 'onSelectRow' | 'ref' | 'contentContainerStyle' | 'flattenedItemsLength' | 'focusStops' | 'resolveFocusStopIndex' | 'onSelectFocusStop'
>;

type UseSearchListFocus = {
    /** The focus handler for the row at an index, which stays the same between renders */
    getOnFocus: (index: number) => (event: NativeSyntheticEvent<ExtendedTargetedEvent>) => void;

    /** What the list provides to targets nested in its rows */
    focusTargetContextValue: SearchListFocusTargetContextValue;
};

function useSearchListFocus({
    data,
    onSelectRow,
    ref,
    contentContainerStyle,
    flattenedItemsLength,
    focusStops,
    resolveFocusStopIndex,
    onSelectFocusStop,
}: UseSearchListFocusParams): UseSearchListFocus {
    const hasKeyBeenPressed = useRef(false);
    const isFocused = useIsFocused();
    const {focusedCellId, isEditingCell, wasRecentlyEditingCell} = useEditingCellState();

    const [isModalVisible] = useOnyx(ONYXKEYS.MODAL, {selector: isModalActiveSelector});

    // Focus handlers run after render, and read these instead of their render's values so they can stay stable.
    const focusStopsRef = useRef(focusStops);
    useLayoutEffect(() => {
        focusStopsRef.current = focusStops;
    });
    const focusTargetsRef = useRef(new Map<string, SearchListFocusTarget>());

    // Where the page header floats over the list, the list reserves its height as top padding.
    const {paddingTop} = StyleSheet.flatten(contentContainerStyle) ?? {};
    const tabBarCoveredHeight = useTabBarCoveredHeight();
    const revealFocusStop = useRevealFocusStop({
        listRef: ref,
        focusTargetsRef,
        topInset: typeof paddingTop === 'number' ? paddingTop : 0,
        bottomInset: tabBarCoveredHeight,
        isEditingCell: isEditingCell || wasRecentlyEditingCell,
    });

    const setHasKeyBeenPressed = () => {
        if (hasKeyBeenPressed.current) {
            return;
        }
        // We need to track whether a key has been pressed to enable focus syncing only if a key has been pressed.
        // This is to avoid the default behavior of web showing blue border on click of items after a page refresh.
        hasKeyBeenPressed.current = true;
    };

    const [focusedIndex, setFocusedIndex] = useArrowKeyFocusManager({
        initialFocusedIndex: -1,
        maxIndex: (focusStops?.length ?? flattenedItemsLength) - 1,
        isActive: isFocused && !isModalVisible,
        onFocusedIndexChange: (index: number, shouldScrollHint: boolean) => {
            // Only the arrow keys scroll. A click or Tab focuses a stop that is already where the user is looking.
            if (!shouldScrollHint) {
                return;
            }
            // Without focus stops every row is one, which the list reveals the same way.
            const rowKeyForList = focusStops ? undefined : data.at(index)?.keyForList;
            const stop = rowKeyForList ? {keyForList: rowKeyForList, rowIndex: index, isRow: true} : focusStops?.at(index);
            if (stop) {
                revealFocusStop(stop);
            }
        },
        setHasKeyBeenPressed,
        isFocused,
        captureOnInputs: false,
    });

    const shouldIgnoreFocusEvent = (event: NativeSyntheticEvent<ExtendedTargetedEvent>) => {
        // The focus-return restore shouldn't move the keyboard cursor here, or the row gets highlighted and scrolled into view on back nav. The .focus() still restores DOM focus for screen readers.
        if (isFocusRestoreInProgress()) {
            return true;
        }
        // Prevent unexpected scrolling on mobile Chrome after the context menu closes by ignoring programmatic focus not triggered by direct user interaction.
        if (isMobileChrome() && event.nativeEvent) {
            if (!event.nativeEvent.sourceCapabilities) {
                return true;
            }
            // Ignore the focus if it's caused by a touch event on mobile chrome.
            // For example, a long press will trigger a focus event on mobile chrome
            if (event.nativeEvent.sourceCapabilities.firesTouchEvents) {
                return true;
            }
        }
        return false;
    };

    const handleFocusByIndex = (index: number, event: NativeSyntheticEvent<ExtendedTargetedEvent>) => {
        if (shouldIgnoreFocusEvent(event)) {
            return;
        }
        const stops = focusStopsRef.current;
        if (!stops) {
            setFocusedIndex(index);
            return;
        }
        const stopIndex = stops.findIndex((stop) => stop.isRow && stop.rowIndex === index);
        if (stopIndex >= 0) {
            setFocusedIndex(stopIndex);
        }
    };
    const getOnFocus = useStableIndexedHandler(handleFocusByIndex);

    const focusTarget = (keyForList: string, event: NativeSyntheticEvent<ExtendedTargetedEvent>) => {
        const stopIndex = focusStopsRef.current?.findIndex((stop) => stop.keyForList === keyForList) ?? -1;
        if (stopIndex < 0) {
            return false;
        }
        if (!shouldIgnoreFocusEvent(event)) {
            setFocusedIndex(stopIndex);
        }
        return true;
    };

    const registerFocusTarget = (keyForList: string, target: SearchListFocusTarget) => {
        const targets = focusTargetsRef.current;
        targets.set(keyForList, target);
        return () => {
            // A row the list reused for another item may have registered the key again since, and that target stays.
            if (targets.get(keyForList) !== target) {
                return;
            }
            targets.delete(keyForList);
        };
    };

    // The stops change as groups open, close and load, so the focused index can end up on another stop. Focus follows
    // the stop instead, moved here during render rather than in an effect, so the wrong stop never shows as focused.
    const focusedStop = focusStops && focusedIndex >= 0 ? focusStops.at(focusedIndex) : undefined;
    const [trackedFocus, setTrackedFocus] = useState<{index: number; stop?: SearchListFocusStop}>({index: -1});
    if (focusStops && focusedIndex >= 0) {
        if (focusedIndex !== trackedFocus.index) {
            setTrackedFocus({index: focusedIndex, stop: focusedStop});
        } else if (trackedFocus.stop && focusedStop?.keyForList !== trackedFocus.stop.keyForList) {
            const prevStop = trackedFocus.stop;
            const nextIndex = resolveFocusStopIndex ? resolveFocusStopIndex(prevStop, focusedIndex, focusStops) : focusStops.findIndex((stop) => stop.keyForList === prevStop.keyForList);
            setFocusedIndex(nextIndex);
            setTrackedFocus({index: nextIndex, stop: nextIndex >= 0 ? focusStops.at(nextIndex) : undefined});
        }
    }

    // Rows read their own focus by key, so a focus change doesn't invalidate every FlashList cell.
    const focusedRowKeyForList = focusedIndex >= 0 ? data.at(focusedIndex)?.keyForList : undefined;
    const focusedKeyForList = focusStops ? focusedStop?.keyForList : focusedRowKeyForList;
    useEffect(() => {
        if (!focusedKeyForList) {
            return;
        }
        setSearchRowFocused(focusedKeyForList, true);
        return () => setSearchRowFocused(focusedKeyForList, false);
    }, [focusedKeyForList]);

    const selectFocusedOption = (event?: GestureResponderEvent | KeyboardEvent) => {
        // Allow event propagation during cell editing so Enter can trigger TextInput.onSubmitEditing.
        // When not editing, stop propagation to prevent unintended button activation and handle row selection.
        if (isEditingCell) {
            return;
        }

        // If a cell has keyboard focus (via Tab), let the Enter event propagate to trigger the cell's onPress
        if (focusedCellId) {
            return;
        }

        event?.stopPropagation();

        if (focusStops) {
            if (!focusedStop) {
                return;
            }
            if (focusedStop.isRow) {
                const focusedRow = data.at(focusedStop.rowIndex);
                if (focusedRow) {
                    onSelectRow(focusedRow);
                }
                return;
            }
            // A nested target does what a click on it does, which only its row knows.
            const activate = focusTargetsRef.current.get(focusedStop.keyForList)?.activate;
            if (!activate) {
                return;
            }
            activate();
            onSelectFocusStop?.(focusedStop);
            return;
        }

        const focusedItem = data.at(focusedIndex);

        if (!focusedItem) {
            return;
        }

        onSelectRow(focusedItem);
    };

    useKeyboardShortcut(CONST.KEYBOARD_SHORTCUTS.ENTER, selectFocusedOption, {
        captureOnInputs: true,
        shouldBubble: false,
        shouldPreventDefault: false,
        isActive: isFocused && focusedIndex >= 0 && !isModalVisible,
        // Propagation is controlled manually in selectFocusedOption based on editing state
        shouldStopPropagation: false,
    });

    useEffect(() => {
        addKeyDownPressListener(setHasKeyBeenPressed);

        return () => removeKeyDownPressListener(setHasKeyBeenPressed);
    }, [setHasKeyBeenPressed]);

    return {getOnFocus, focusTargetContextValue: {onFocusTarget: focusTarget, registerFocusTarget}};
}

export default useSearchListFocus;
