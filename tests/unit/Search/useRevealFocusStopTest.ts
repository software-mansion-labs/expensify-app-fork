import {renderHook} from '@testing-library/react-native';

import type {SearchListFocusTarget} from '@components/Search/SearchList/BaseSearchList/SearchListFocusTargetContext';
import type {SearchListFocusStop} from '@components/Search/SearchList/BaseSearchList/types';
import useRevealFocusStop from '@components/Search/SearchList/BaseSearchList/useRevealFocusStop';
import type {SearchListItem} from '@components/Search/SearchList/ListItem/types';

import type {FlashListRef} from '@shopify/flash-list';
import type {ComponentRef} from 'react';
import type {View} from 'react-native';

const ROW_HEIGHT = 48;
const VIEWPORT_HEIGHT = 480;
const LIST_WIDTH = 800;

/** A list scrolled to `scrollOffset`, whose rows are ROW_HEIGHT tall and start right at the top of its content. On web, `scrollableNode` is the element that scrolls. */
function createList(scrollOffset: number, scrollableNode: HTMLElement | null = null) {
    const list = {
        getAbsoluteLastScrollOffset: jest.fn(() => scrollOffset),
        getFirstItemOffset: jest.fn(() => 0),
        getWindowSize: jest.fn(() => ({width: LIST_WIDTH, height: VIEWPORT_HEIGHT})),
        getLayout: jest.fn((index: number) => ({x: 0, y: index * ROW_HEIGHT, width: LIST_WIDTH, height: ROW_HEIGHT})),
        getScrollableNode: jest.fn(() => scrollableNode),
        announceProgrammaticScroll: jest.fn(),
        scrollToOffset: jest.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the hook only calls the methods mocked here
    return {list, listRef: {current: list as unknown as FlashListRef<SearchListItem>}};
}

function renderReveal(listRef: {current: FlashListRef<SearchListItem>}, {isEditingCell = false, bottomInset = 0, focusTargets = new Map<string, SearchListFocusTarget>()} = {}) {
    const focusTargetsRef = {current: focusTargets};
    const {result} = renderHook(() => useRevealFocusStop({listRef, focusTargetsRef, topInset: 0, bottomInset, isEditingCell}));
    return result.current;
}

/** A DOM element whose box starts `top` pixels below the top of the page. */
function createElementAt(top: number, height: number) {
    const element = document.createElement('div');
    jest.spyOn(element, 'getBoundingClientRect').mockReturnValue({x: 0, y: top, top, left: 0, right: LIST_WIDTH, bottom: top + height, width: LIST_WIDTH, height, toJSON: () => ({})});
    return element;
}

function createFocusTarget(element: HTMLElement): SearchListFocusTarget {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- on web a View's ref is its DOM element
    return {ref: {current: element as unknown as ComponentRef<typeof View>}};
}

function rowStop(rowIndex: number, stickyRowIndex?: number): SearchListFocusStop {
    return {keyForList: `row-${rowIndex}`, rowIndex, isRow: true, stickyRowIndex};
}

describe('useRevealFocusStop', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    it("doesn't scroll, or hold back FlashList's cell reordering, for a row that is already visible", () => {
        // Given a list at the top, where row 2 is fully visible
        const {list, listRef} = createList(0);
        const revealFocusStop = renderReveal(listRef);

        // When focus moves to row 2
        revealFocusStop(rowStop(2));

        // Then nothing scrolls, and no scroll is announced that would never end
        expect(list.scrollToOffset).not.toHaveBeenCalled();
        expect(list.announceProgrammaticScroll).not.toHaveBeenCalled();
    });

    it('scrolls by one row when focus moves to the row just below the viewport', () => {
        // Given a list at the top, showing rows 0 to 9 exactly
        const {list, listRef} = createList(0);
        const revealFocusStop = renderReveal(listRef);

        // When focus moves down to row 10
        revealFocusStop(rowStop(10));

        // Then the list scrolls by one row, announcing the scroll first
        expect(list.announceProgrammaticScroll).toHaveBeenCalledTimes(1);
        expect(list.scrollToOffset).toHaveBeenCalledWith({offset: ROW_HEIGHT, animated: true});
    });

    it('clears the sticky header of the group a row is in when scrolling up to it', () => {
        // Given a list scrolled so row 5 starts at the top, where the sticky header of row 4 covers it
        const {list, listRef} = createList(5 * ROW_HEIGHT);
        const revealFocusStop = renderReveal(listRef);

        // When focus moves to row 5, which sits under the sticky row 4
        revealFocusStop(rowStop(5, 4));

        // Then the list scrolls up by the header's height, so the row shows below it
        expect(list.scrollToOffset).toHaveBeenCalledWith({offset: 4 * ROW_HEIGHT, animated: true});
    });

    it('clears the tab bar at the bottom', () => {
        // Given a list at the top, with a tab bar one row tall over its bottom
        const {list, listRef} = createList(0);
        const revealFocusStop = renderReveal(listRef, {bottomInset: ROW_HEIGHT});

        // When focus moves to row 9, the last row, which the tab bar covers
        revealFocusStop(rowStop(9));

        // Then the list scrolls it out from under the tab bar
        expect(list.scrollToOffset).toHaveBeenCalledWith({offset: ROW_HEIGHT, animated: true});
    });

    it("drops the queued measure of a nested stop once focus moves on, so the list isn't scrolled back to it", () => {
        // Given a list at the top, and focus on an expense of the group in row 20, which isn't rendered yet, so measuring it again is queued
        jest.useFakeTimers();
        const {list, listRef} = createList(0);
        const revealFocusStop = renderReveal(listRef);
        revealFocusStop({keyForList: 'expense-1', rowIndex: 20, isRow: false});
        expect(list.scrollToOffset).toHaveBeenCalledTimes(1);

        // When focus moves to row 2, which is visible, before the queued frame runs
        revealFocusStop(rowStop(2));
        jest.runOnlyPendingTimers();

        // Then the list doesn't scroll again toward the expense the focus already left
        expect(list.scrollToOffset).toHaveBeenCalledTimes(1);
    });

    it("measures a nested stop's own element on web, rather than the row that holds it", () => {
        // Given a list on web whose scroller starts 100px down the page and is scrolled 500px, and an expense in row 0 whose
        // element sits 460px into the viewport, so its bottom 28px are cut off, although row 0 itself is at the top
        const scrollableNode = createElementAt(100, VIEWPORT_HEIGHT);
        scrollableNode.scrollTop = 500;
        const {list, listRef} = createList(0, scrollableNode);
        const focusTargets = new Map([['expense-1', createFocusTarget(createElementAt(560, ROW_HEIGHT))]]);
        const revealFocusStop = renderReveal(listRef, {focusTargets});

        // When focus moves to the expense
        revealFocusStop({keyForList: 'expense-1', rowIndex: 0, isRow: false});

        // Then the list scrolls from the scroller's own offset by just the part of the expense that was cut off
        expect(list.scrollToOffset).toHaveBeenCalledWith({offset: 528, animated: true});
    });

    it('scrolls to a nested stop once its row renders it, after bringing the row into view', () => {
        // Given a list on web at the top, and an expense of the group in row 20, which isn't rendered yet
        jest.useFakeTimers();
        const scrollableNode = createElementAt(0, VIEWPORT_HEIGHT);
        const {list, listRef} = createList(0, scrollableNode);
        const focusTargets = new Map<string, SearchListFocusTarget>();
        const revealFocusStop = renderReveal(listRef, {focusTargets});

        // When focus moves to the expense, and its row renders it after jumping into view
        revealFocusStop({keyForList: 'expense-1', rowIndex: 20, isRow: false});
        scrollableNode.scrollTop = 20 * ROW_HEIGHT - VIEWPORT_HEIGHT;
        focusTargets.set('expense-1', createFocusTarget(createElementAt(450, ROW_HEIGHT)));
        jest.runOnlyPendingTimers();

        // Then the list first jumps to the row without animating, then scrolls the measured expense fully into view
        expect(list.scrollToOffset).toHaveBeenNthCalledWith(1, {offset: 20 * ROW_HEIGHT - VIEWPORT_HEIGHT, animated: false});
        expect(list.scrollToOffset).toHaveBeenNthCalledWith(2, {offset: 20 * ROW_HEIGHT - VIEWPORT_HEIGHT + 18, animated: true});
    });

    it("doesn't scroll while a cell is edited", () => {
        // Given a cell being edited
        const {list, listRef} = createList(0);
        const revealFocusStop = renderReveal(listRef, {isEditingCell: true});

        // When focus moves to a row below the viewport
        revealFocusStop(rowStop(20));

        // Then the list stays put, so the cell isn't moved out from under the cursor
        expect(list.scrollToOffset).not.toHaveBeenCalled();
    });
});
