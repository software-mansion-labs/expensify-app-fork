/**
 * Scrolls the Search list just far enough to show the focus stop the arrow keys moved to, and not at all when it is
 * already in view, so stepping through an open group doesn't throw its rows out of sight.
 */
import type {SearchListItem} from '@components/Search/SearchList/ListItem/types';

import type {FlashListRef} from '@shopify/flash-list';
import type {RefObject} from 'react';

import {useEffect, useRef} from 'react';

import type {SearchListFocusTarget} from './SearchListFocusTargetContext';
import type {SearchListFocusStop} from './types';

import getScrollDeltaToReveal from './getScrollDeltaToReveal';

type UseRevealFocusStopParams = {
    listRef: RefObject<FlashListRef<SearchListItem> | null>;

    /** Nested targets by key, which are measured in place of the row that holds them */
    focusTargetsRef: RefObject<Map<string, SearchListFocusTarget>>;

    /** How much of the list's top a floating header covers */
    topInset: number;

    /** How much of the list's bottom a floating tab bar covers */
    bottomInset: number;

    /** Scrolling while a cell is edited would blur it or move it out from under the cursor */
    isEditingCell: boolean;
};

function isElement(node: unknown): node is Element {
    return typeof Element !== 'undefined' && node instanceof Element;
}

function cancelFrame(frameID: number | undefined) {
    if (frameID === undefined) {
        return;
    }
    cancelAnimationFrame(frameID);
}

function useRevealFocusStop({listRef, focusTargetsRef, topInset, bottomInset, isEditingCell}: UseRevealFocusStopParams) {
    const retryFrameRef = useRef<number | undefined>(undefined);

    useEffect(() => () => cancelFrame(retryFrameRef.current), []);

    const revealFocusStop = (stop: SearchListFocusStop, canRetry = true) => {
        // A retry still queued for a stop the focus already left would scroll the list back to it.
        cancelFrame(retryFrameRef.current);
        const list = listRef.current;
        if (!list || isEditingCell) {
            return;
        }

        const stickyRowHeight = stop.stickyRowIndex === undefined ? 0 : (list.getLayout(stop.stickyRowIndex)?.height ?? 0);
        const targetNode = focusTargetsRef.current.get(stop.keyForList)?.ref.current;
        const scrollableNode: unknown = list.getScrollableNode();

        let scrollOffset: number;
        let top: number;
        let height: number;
        if (isElement(targetNode) && isElement(scrollableNode)) {
            // The element's offset is current even right after a jump, unlike the list's own.
            scrollOffset = scrollableNode.scrollTop;
            const targetRect = targetNode.getBoundingClientRect();
            top = targetRect.top - scrollableNode.getBoundingClientRect().top;
            height = targetRect.height;
        } else {
            const rowLayout = list.getLayout(stop.rowIndex);
            if (!rowLayout) {
                return;
            }
            scrollOffset = list.getAbsoluteLastScrollOffset();
            top = rowLayout.y + list.getFirstItemOffset() - scrollOffset;
            // A nested target whose row isn't rendered can't be measured yet, so the row is brought into view first.
            height = stop.isRow ? rowLayout.height : 0;
        }

        const shouldMeasureAgain = !stop.isRow && !targetNode && canRetry;
        const delta = getScrollDeltaToReveal({top, height, viewportHeight: list.getWindowSize().height, topInset: topInset + stickyRowHeight, bottomInset});
        if (delta !== 0) {
            // Only a scroll that really happens is announced, or the list would wait for it to end until the next one.
            list.announceProgrammaticScroll();
            // The jump to a row that will be measured again isn't animated, so the second scroll starts from where the row landed.
            list.scrollToOffset({offset: scrollOffset + delta, animated: !shouldMeasureAgain});
        }

        if (!shouldMeasureAgain) {
            return;
        }
        // The row renders its nested targets, and they register, in the frames after it scrolls into view.
        retryFrameRef.current = requestAnimationFrame(() => {
            retryFrameRef.current = undefined;
            revealFocusStop(stop, false);
        });
    };

    return revealFocusStop;
}

export default useRevealFocusStop;
