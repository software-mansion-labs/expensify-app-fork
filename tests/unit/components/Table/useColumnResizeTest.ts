import {act, renderHook} from '@testing-library/react-native';

import {RESIZE_INDICATOR_OPACITY_VARIABLE, getColumnWidthVariableName} from '@components/Table/columnResize/columnWidthExpressions';
import type UseColumnResize from '@components/Table/columnResize/useColumnResize';
import type {UseColumnResizeParams} from '@components/Table/columnResize/useColumnResize/types';

import {clearTableColumnWidth, setTableColumnWidth} from '@libs/actions/TableColumnWidths';

import CONST from '@src/CONST';

import type React from 'react';

// Jest resolves the native no-op, so the web implementation is loaded by its file name.
const {default: useColumnResize} = jest.requireActual<{default: typeof UseColumnResize}>('@components/Table/columnResize/useColumnResize/index.ts');

jest.mock('@libs/actions/TableColumnWidths', () => ({
    setTableColumnWidth: jest.fn(),
    clearTableColumnWidth: jest.fn(),
}));

const COLUMN_RESIZING_ID = 'testTable';

const NAME_COLUMN_KEY = 'name';

const resolvedColumnWidths = {name: 200, email: 200, role: 200};

const fitColumnWidths = {name: 120, email: 300, role: 80};

type PointerEventInit = {clientX: number; button?: number};

/** A pointer event carrying only what the hook reads, aimed at the given handle. */
function createPointerEvent(handleElement: HTMLDivElement, {clientX, button = 0}: PointerEventInit): React.PointerEvent<HTMLDivElement> {
    const event = {button, clientX, clientY: 0, pointerId: 1, currentTarget: handleElement, preventDefault: jest.fn(), stopPropagation: jest.fn()};

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the hook only reads the fields above
    return event as unknown as React.PointerEvent<HTMLDivElement>;
}

/** A key press carrying only what the hook reads, aimed at the given handle, with its mocks to assert on. */
function createKeyboardEvent(handleElement: HTMLDivElement, key: string, code = key) {
    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();
    const event = {key, code, currentTarget: handleElement, preventDefault, stopPropagation};

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the hook only reads the fields above
    return {event: event as unknown as React.KeyboardEvent<HTMLDivElement>, preventDefault, stopPropagation};
}

/** A focus event aimed at the given handle, which matches `:focus-visible` only when focused from the keyboard. */
function createFocusEvent(handleElement: HTMLDivElement, isFocusVisible: boolean): React.FocusEvent<HTMLDivElement> {
    // jsdom doesn't track how an element got focus.
    jest.spyOn(handleElement, 'matches').mockImplementation((selector: string) => selector === ':focus-visible' && isFocusVisible);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the hook only reads the field above
    return {currentTarget: handleElement} as unknown as React.FocusEvent<HTMLDivElement>;
}

/** Renders the hook with a scope element and one handle inside it, the way the table mounts them. */
function renderColumnResize(params?: Partial<UseColumnResizeParams>) {
    const scopeElement = document.createElement('div');
    const handleElement = document.createElement('div');

    scopeElement.appendChild(handleElement);
    // jsdom has no pointer capture.
    const setPointerCapture = jest.fn();

    handleElement.setPointerCapture = setPointerCapture;
    handleElement.releasePointerCapture = jest.fn();
    handleElement.hasPointerCapture = jest.fn(() => true);

    const initialProps: UseColumnResizeParams = {
        columnResizingID: COLUMN_RESIZING_ID,
        resizableColumnKeys: [NAME_COLUMN_KEY],
        resolvedColumnWidths,
        fitColumnWidths,
        columnGap: 12,
        ...params,
    };
    const hook = renderHook((props: UseColumnResizeParams) => useColumnResize(props), {initialProps});

    hook.result.current?.setScopeElement(scopeElement);

    const getHandleProps = (columnKey = NAME_COLUMN_KEY) => {
        const controller = hook.result.current;

        if (!controller) {
            throw new Error('Expected the hook to return a controller');
        }

        const handleProps = controller.getHandleProps(columnKey);

        if (!handleProps) {
            throw new Error('Expected the column to be resizable');
        }

        return handleProps;
    };

    const readWidth = (columnKey: string) => scopeElement.style.getPropertyValue(getColumnWidthVariableName(columnKey));

    /** Presses and releases an edge without moving the pointer. */
    const click = (columnKey = NAME_COLUMN_KEY) => {
        act(() => {
            getHandleProps(columnKey).onPointerDown?.(createPointerEvent(handleElement, {clientX: 100}));
            getHandleProps(columnKey).onPointerUp?.(createPointerEvent(handleElement, {clientX: 100}));
        });
    };

    return {...hook, initialProps, scopeElement, handleElement, setPointerCapture, getHandleProps, readWidth, click};
}

/** Lets a click's wait for a second click run out. */
function waitOutDoubleClick() {
    act(() => {
        jest.advanceTimersByTime(CONST.TABLES.COLUMN_RESIZE.DOUBLE_CLICK_INTERVAL);
    });
}

describe('useColumnResize', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        document.body.style.cursor = '';
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('returns no controller when resizing is off', () => {
        // Given a table with no resizing ID, which is how native, narrow layouts and tables that didn't opt in render it
        const params: UseColumnResizeParams = {columnResizingID: undefined, resizableColumnKeys: [NAME_COLUMN_KEY], resolvedColumnWidths, columnGap: 12};

        // When the hook runs
        const {result} = renderHook(() => useColumnResize(params));

        // Then it hands back no controller, so the header renders no handles
        expect(result.current).toBeUndefined();
    });

    it('returns a controller before the columns are measured', () => {
        // Given a resizable table on its first render, before layout, when no column is resizable yet
        const params: UseColumnResizeParams = {columnResizingID: COLUMN_RESIZING_ID, resizableColumnKeys: [], resolvedColumnWidths: {}, columnGap: 12};

        // When the hook runs
        const {result} = renderHook(() => useColumnResize(params));

        // Then it still hands back a controller, so the scope element renders from the start and the header and list
        // don't remount once the table is measured, while no column gets a handle yet
        expect(result.current).toBeDefined();
        expect(result.current?.getHandleProps(NAME_COLUMN_KEY)).toBeUndefined();
    });

    it('paints a drag onto the scope and stores the dragged column on release', () => {
        // Given a 200px column with two 200px columns after it
        const {handleElement, getHandleProps, readWidth} = renderColumnResize();

        // When its edge is dragged 60px right
        act(() => {
            getHandleProps().onPointerDown?.(createPointerEvent(handleElement, {clientX: 100}));
            getHandleProps().onPointerMove?.(createPointerEvent(handleElement, {clientX: 160}));
        });

        // Then the width is painted straight onto the scope without a React render, and later columns keep their widths
        expect(readWidth('name')).toBe('260px');
        expect(readWidth('email')).toBe('');
        expect(readWidth('role')).toBe('');
        expect(document.body.style.cursor).toBe('col-resize');

        // When the pointer is released
        act(() => {
            getHandleProps().onPointerUp?.(createPointerEvent(handleElement, {clientX: 160}));
        });

        // Then the dragged column is stored, once
        expect(setTableColumnWidth).toHaveBeenCalledTimes(1);
        expect(setTableColumnWidth).toHaveBeenCalledWith(COLUMN_RESIZING_ID, 'name', 260);
        expect(document.body.style.cursor).toBe('');
    });

    it('stores nothing and clears the scope when a drag ends where it started', () => {
        // Given a column being dragged
        const {handleElement, getHandleProps, readWidth} = renderColumnResize();

        act(() => {
            getHandleProps().onPointerDown?.(createPointerEvent(handleElement, {clientX: 100}));
            getHandleProps().onPointerMove?.(createPointerEvent(handleElement, {clientX: 160}));
        });

        // When the pointer comes back to where it started and is released
        act(() => {
            getHandleProps().onPointerMove?.(createPointerEvent(handleElement, {clientX: 100}));
            getHandleProps().onPointerUp?.(createPointerEvent(handleElement, {clientX: 100}));
        });

        // Then nothing is stored, and the scope is cleared since no render follows to clear it
        expect(setTableColumnWidth).not.toHaveBeenCalled();
        expect(readWidth('name')).toBe('');
    });

    it('stores the width when the pointer capture is lost mid-drag', () => {
        // Given a column being dragged 40px right
        const {handleElement, getHandleProps} = renderColumnResize();

        act(() => {
            getHandleProps().onPointerDown?.(createPointerEvent(handleElement, {clientX: 100}));
            getHandleProps().onPointerMove?.(createPointerEvent(handleElement, {clientX: 140}));
        });

        // When the browser takes the pointer capture back, e.g. because the window lost focus
        act(() => {
            getHandleProps().onLostPointerCapture?.(createPointerEvent(handleElement, {clientX: 140}));
        });

        // Then the drag ends the same way a release does, so the width the user already sees is kept
        expect(setTableColumnWidth).toHaveBeenCalledTimes(1);
        expect(setTableColumnWidth).toHaveBeenCalledWith(COLUMN_RESIZING_ID, 'name', 240);
        expect(document.body.style.cursor).toBe('');
    });

    it('shows the edge line only while dragging, not on hover or click', () => {
        // Given a resizable column
        const {handleElement, getHandleProps} = renderColumnResize();
        const readLineOpacity = () => handleElement.style.getPropertyValue(RESIZE_INDICATOR_OPACITY_VARIABLE);

        // When its edge is pressed
        act(() => {
            getHandleProps().onPointerDown?.(createPointerEvent(handleElement, {clientX: 100}));
        });

        // Then no line appears yet, since the press may still be a click that fits the column
        expect(readLineOpacity()).toBe('');

        // When the pointer moves past the click slop
        act(() => {
            getHandleProps().onPointerMove?.(createPointerEvent(handleElement, {clientX: 110}));
        });

        // Then the tall line appears, so the user sees which edge is moving
        expect(readLineOpacity()).toBe('1');

        // When the pointer is released
        act(() => {
            getHandleProps().onPointerUp?.(createPointerEvent(handleElement, {clientX: 110}));
        });

        // Then the line goes away, even with the pointer still over the edge
        expect(readLineOpacity()).toBe('0');
    });

    it('keeps a dragged width within the drag bounds', () => {
        // Given a 200px column that may not shrink below 180px
        const {handleElement, getHandleProps, readWidth} = renderColumnResize({dragMinWidths: {[NAME_COLUMN_KEY]: 180}});

        // When its edge is dragged far past the left of the window
        act(() => {
            getHandleProps().onPointerDown?.(createPointerEvent(handleElement, {clientX: 100}));
            getHandleProps().onPointerMove?.(createPointerEvent(handleElement, {clientX: -1000}));
        });

        // Then it stops at its floor, so the last column can't pull the row in from the table's edge
        expect(readWidth(NAME_COLUMN_KEY)).toBe('180px');

        // When the same drag carries on far past the right
        act(() => {
            getHandleProps().onPointerMove?.(createPointerEvent(handleElement, {clientX: 5000}));
        });

        // Then it stops at the upper bound, so the next column's edge stays reachable
        expect(readWidth(NAME_COLUMN_KEY)).toBe(`${CONST.TABLES.COLUMN_RESIZE.MAX_WIDTH}px`);
    });

    it('ignores the secondary button', () => {
        // Given a resizable column
        const {handleElement, setPointerCapture, getHandleProps} = renderColumnResize();

        // When its edge is pressed with the secondary button, which opens a context menu
        act(() => {
            getHandleProps().onPointerDown?.(createPointerEvent(handleElement, {clientX: 100, button: 2}));
        });

        // Then no drag starts, so the context menu isn't fighting a captured pointer
        expect(setPointerCapture).not.toHaveBeenCalled();
        expect(document.body.style.cursor).toBe('');
    });

    it('resets the cursor when unmounted mid-drag', () => {
        // Given a column being dragged, which puts the resize cursor on the whole page
        const columnResize = renderColumnResize();
        const {handleElement, getHandleProps} = columnResize;

        act(() => {
            getHandleProps().onPointerDown?.(createPointerEvent(handleElement, {clientX: 100}));
        });

        expect(document.body.style.cursor).toBe('col-resize');

        // When the table unmounts, e.g. because the user navigated away mid-drag
        columnResize.unmount();

        // Then the resize cursor doesn't stay stuck on the page
        expect(document.body.style.cursor).toBe('');
    });

    it('leaves the cursor alone when unmounted with no drag', () => {
        // Given a cursor some other part of the page put on the body, and a table that isn't being dragged
        document.body.style.cursor = 'grabbing';
        const columnResize = renderColumnResize();

        // When the table unmounts
        columnResize.unmount();

        // Then the cursor is untouched, since only a drag of this table set it
        expect(document.body.style.cursor).toBe('grabbing');
    });

    it('clears the painted widths once the stored width renders', () => {
        // Given a drag that was released and whose width was stored
        const {handleElement, getHandleProps, readWidth, rerender, initialProps} = renderColumnResize();

        act(() => {
            getHandleProps().onPointerDown?.(createPointerEvent(handleElement, {clientX: 100}));
            getHandleProps().onPointerMove?.(createPointerEvent(handleElement, {clientX: 160}));
            getHandleProps().onPointerUp?.(createPointerEvent(handleElement, {clientX: 160}));
        });

        expect(readWidth('name')).toBe('260px');

        // When the stored width comes back from Onyx and the table resolves it
        rerender({...initialProps, resolvedColumnWidths: {...resolvedColumnWidths, name: 260}});

        // Then the painted width steps aside, so the column paints the fallback React rendered and later resolved widths aren't masked
        expect(readWidth('name')).toBe('');
    });

    it('fits the column to its content once a click on its edge turns out not to be a double-click', () => {
        // Given a 200px column whose content fits in 120px
        const {handleElement, getHandleProps, readWidth} = renderColumnResize();

        // When its edge is clicked, with the pointer wobbling less than the click slop
        act(() => {
            getHandleProps().onPointerDown?.(createPointerEvent(handleElement, {clientX: 100}));
            getHandleProps().onPointerMove?.(createPointerEvent(handleElement, {clientX: 100 + CONST.TABLES.COLUMN_RESIZE.DRAG_SLOP}));
            getHandleProps().onPointerUp?.(createPointerEvent(handleElement, {clientX: 100 + CONST.TABLES.COLUMN_RESIZE.DRAG_SLOP}));
        });

        // Then the column stays put while a second click may still come, since moving the edge now would send that click to the heading
        expect(readWidth(NAME_COLUMN_KEY)).toBe('');
        expect(setTableColumnWidth).not.toHaveBeenCalled();
        expect(document.body.style.cursor).toBe('');

        // When no second click comes
        waitOutDoubleClick();

        // Then the column is painted at its content width and stored, rather than moved by the wobble
        expect(readWidth(NAME_COLUMN_KEY)).toBe('120px');
        expect(setTableColumnWidth).toHaveBeenCalledTimes(1);
        expect(setTableColumnWidth).toHaveBeenCalledWith(COLUMN_RESIZING_ID, NAME_COLUMN_KEY, 120);
    });

    it('resets the column on double-click without fitting it first', () => {
        // Given a resizable column
        const {click, readWidth} = renderColumnResize();

        // When its edge is clicked twice in quick succession
        click();
        click();
        waitOutDoubleClick();

        // Then its stored width is cleared, so the table sizes it from its content again, and the first click never
        // fits it, so the edge doesn't move out from under the second click
        expect(clearTableColumnWidth).toHaveBeenCalledTimes(1);
        expect(clearTableColumnWidth).toHaveBeenCalledWith(COLUMN_RESIZING_ID, NAME_COLUMN_KEY);
        expect(setTableColumnWidth).not.toHaveBeenCalled();
        expect(readWidth(NAME_COLUMN_KEY)).toBe('');
    });

    it('drags without fitting when the edge is pressed again right after a click', () => {
        // Given a click on a 200px column's edge that is still waiting for a second click
        const {handleElement, getHandleProps, click, readWidth} = renderColumnResize();

        click();

        // When the edge is pressed again and dragged 60px right
        act(() => {
            getHandleProps().onPointerDown?.(createPointerEvent(handleElement, {clientX: 100}));
            getHandleProps().onPointerMove?.(createPointerEvent(handleElement, {clientX: 160}));
            getHandleProps().onPointerUp?.(createPointerEvent(handleElement, {clientX: 160}));
        });
        waitOutDoubleClick();

        // Then only the drag counts, so the column isn't fitted once the user has moved on to dragging it
        expect(readWidth(NAME_COLUMN_KEY)).toBe('260px');
        expect(setTableColumnWidth).toHaveBeenCalledTimes(1);
        expect(setTableColumnWidth).toHaveBeenCalledWith(COLUMN_RESIZING_ID, NAME_COLUMN_KEY, 260);
        expect(clearTableColumnWidth).not.toHaveBeenCalled();
    });

    it('fits a clicked column right away when another edge is clicked', () => {
        // Given a click on one column's edge that is still waiting for a second click
        const {click} = renderColumnResize({resizableColumnKeys: [NAME_COLUMN_KEY, 'email']});

        click(NAME_COLUMN_KEY);

        // When another column's edge is clicked
        click('email');

        // Then the first column is fitted, since clicks on two edges aren't a double-click, and the second still waits
        expect(setTableColumnWidth).toHaveBeenCalledTimes(1);
        expect(setTableColumnWidth).toHaveBeenCalledWith(COLUMN_RESIZING_ID, NAME_COLUMN_KEY, 120);
        expect(clearTableColumnWidth).not.toHaveBeenCalled();

        // When no second click comes
        waitOutDoubleClick();

        // Then the second column is fitted too
        expect(setTableColumnWidth).toHaveBeenLastCalledWith(COLUMN_RESIZING_ID, 'email', 300);
    });

    it('drops a waiting click when the table unmounts', () => {
        // Given a click on an edge that is still waiting for a second click
        const columnResize = renderColumnResize();

        columnResize.click();

        // When the table unmounts before the wait is over
        columnResize.unmount();
        waitOutDoubleClick();

        // Then nothing is stored for a table that is gone
        expect(setTableColumnWidth).not.toHaveBeenCalled();
    });

    it('stores nothing when a clicked column already fits its content', () => {
        // Given a column already painted at its content width
        const {click} = renderColumnResize({resolvedColumnWidths: {...resolvedColumnWidths, name: 120}});

        // When its edge is clicked
        click();
        waitOutDoubleClick();

        // Then nothing is stored, so the column isn't marked as sized by the user for nothing
        expect(setTableColumnWidth).not.toHaveBeenCalled();
    });

    it('stores nothing when the fitted width is already stored for a column painted wider', () => {
        // Given the last column, stored at its 120px content width but painted 300px wide by the leftover room it grows into
        const {click, readWidth} = renderColumnResize({
            resolvedColumnWidths: {...resolvedColumnWidths, name: 300},
            columnWidthOverrides: {[NAME_COLUMN_KEY]: 120},
        });

        // When its edge is clicked
        click();
        waitOutDoubleClick();

        // Then nothing is painted or stored, since storing the same width renders nothing to clear the painted one,
        // which would leave the next drag starting from 120px instead of where the edge is
        expect(readWidth(NAME_COLUMN_KEY)).toBe('');
        expect(setTableColumnWidth).not.toHaveBeenCalled();
    });

    it('keeps a fitted width within the drag bounds', () => {
        // Given a column whose content is narrower than the narrowest width a drag allows
        const {click} = renderColumnResize({fitColumnWidths: {[NAME_COLUMN_KEY]: 10}});

        // When its edge is clicked
        click();
        waitOutDoubleClick();

        // Then it stops at the lower bound, so its edge stays reachable
        expect(setTableColumnWidth).toHaveBeenCalledWith(COLUMN_RESIZING_ID, NAME_COLUMN_KEY, CONST.TABLES.COLUMN_RESIZE.MIN_WIDTH);
    });

    it('does nothing on click when the content width is unknown', () => {
        // Given a column whose content couldn't be measured
        const {click, readWidth} = renderColumnResize({fitColumnWidths: {}});

        // When its edge is clicked
        click();
        waitOutDoubleClick();

        // Then the column keeps its width, rather than guessing one
        expect(readWidth(NAME_COLUMN_KEY)).toBe('');
        expect(setTableColumnWidth).not.toHaveBeenCalled();
    });

    it('exposes the edge to assistive technology as a focusable separator holding the column width', () => {
        // Given a 200px resizable column
        const {getHandleProps} = renderColumnResize();

        // When the header renders its edge
        const handleProps = getHandleProps();

        // Then it can be reached with Tab and is announced as a vertical separator at the column's width
        expect(handleProps.role).toBe('separator');
        expect(handleProps.tabIndex).toBe(0);
        expect(handleProps['aria-orientation']).toBe('vertical');
        expect(handleProps['aria-valuenow']).toBe(200);
        expect(handleProps['aria-valuemin']).toBe(CONST.TABLES.COLUMN_RESIZE.MIN_WIDTH);
        expect(handleProps['aria-valuemax']).toBe(CONST.TABLES.COLUMN_RESIZE.MAX_WIDTH);
    });

    it('moves a focused edge by one step per arrow key and stores the width once the key is released', () => {
        // Given a 200px column whose edge has focus
        const {handleElement, getHandleProps, readWidth} = renderColumnResize();
        const arrowRight = createKeyboardEvent(handleElement, 'ArrowRight');

        // When the right arrow is pressed and held for one repeat
        act(() => {
            getHandleProps().onKeyDown?.(arrowRight.event);
            getHandleProps().onKeyDown?.(createKeyboardEvent(handleElement, 'ArrowRight').event);
        });

        // Then the column widens by a step per press right away, without the table also scrolling sideways, and nothing
        // is stored yet, since each store's render would pull the edge back to the stored width mid-hold
        const widenedWidth = 200 + 2 * CONST.TABLES.COLUMN_RESIZE.KEYBOARD_STEP;
        expect(readWidth(NAME_COLUMN_KEY)).toBe(`${widenedWidth}px`);
        expect(arrowRight.preventDefault).toHaveBeenCalled();
        expect(setTableColumnWidth).not.toHaveBeenCalled();

        // When the key is released
        act(() => {
            getHandleProps().onKeyUp?.(createKeyboardEvent(handleElement, 'ArrowRight').event);
        });

        // Then the width the user sees is stored, once
        expect(setTableColumnWidth).toHaveBeenCalledTimes(1);
        expect(setTableColumnWidth).toHaveBeenCalledWith(COLUMN_RESIZING_ID, NAME_COLUMN_KEY, widenedWidth);
    });

    it('stores an arrow-key width when focus leaves before the key is released', () => {
        // Given a column edge moved by the left arrow
        const {handleElement, getHandleProps} = renderColumnResize();

        act(() => {
            getHandleProps().onKeyDown?.(createKeyboardEvent(handleElement, 'ArrowLeft').event);
        });

        // When focus moves on, so the key release lands elsewhere
        act(() => {
            getHandleProps().onBlur?.(createFocusEvent(handleElement, false));
        });

        // Then the width is stored anyway, rather than left painted until the next render drops it
        expect(setTableColumnWidth).toHaveBeenCalledWith(COLUMN_RESIZING_ID, NAME_COLUMN_KEY, 200 - CONST.TABLES.COLUMN_RESIZE.KEYBOARD_STEP);
    });

    it('stops a focused edge at the drag bounds and stores nothing past them', () => {
        // Given a column already at the narrowest width a drag allows it
        const {handleElement, getHandleProps, readWidth} = renderColumnResize({dragMinWidths: {[NAME_COLUMN_KEY]: 200}});

        // When the left arrow is pressed and released
        act(() => {
            getHandleProps().onKeyDown?.(createKeyboardEvent(handleElement, 'ArrowLeft').event);
            getHandleProps().onKeyUp?.(createKeyboardEvent(handleElement, 'ArrowLeft').event);
        });

        // Then nothing changes, the same as dragging past the bound
        expect(readWidth(NAME_COLUMN_KEY)).toBe('');
        expect(setTableColumnWidth).not.toHaveBeenCalled();
    });

    it('leaves a column narrower than the drag bound alone when narrowing it', () => {
        // Given a column content-sized below the narrowest width a drag allows
        const {handleElement, getHandleProps, readWidth} = renderColumnResize({resolvedColumnWidths: {...resolvedColumnWidths, name: 40}});

        // When the left arrow is pressed and released
        act(() => {
            getHandleProps().onKeyDown?.(createKeyboardEvent(handleElement, 'ArrowLeft').event);
            getHandleProps().onKeyUp?.(createKeyboardEvent(handleElement, 'ArrowLeft').event);
        });

        // Then the column stays put, rather than jumping wider to the bound against the arrow pressed
        expect(readWidth(NAME_COLUMN_KEY)).toBe('');
        expect(setTableColumnWidth).not.toHaveBeenCalled();
    });

    it('ignores the arrow keys mid-drag', () => {
        // Given a column being dragged 60px right
        const {handleElement, getHandleProps, readWidth} = renderColumnResize();

        act(() => {
            getHandleProps().onPointerDown?.(createPointerEvent(handleElement, {clientX: 100}));
            getHandleProps().onPointerMove?.(createPointerEvent(handleElement, {clientX: 160}));
        });

        // When an arrow key is pressed and released before the drag ends
        act(() => {
            getHandleProps().onKeyDown?.(createKeyboardEvent(handleElement, 'ArrowRight').event);
            getHandleProps().onKeyUp?.(createKeyboardEvent(handleElement, 'ArrowRight').event);
        });

        // Then the drag keeps the width, and nothing is stored behind its back
        expect(readWidth(NAME_COLUMN_KEY)).toBe('260px');
        expect(setTableColumnWidth).not.toHaveBeenCalled();
    });

    it('fits a focused column to its content on Enter, and resets it on the next press', () => {
        // Given a 200px column whose content fits in 120px
        const {handleElement, getHandleProps, readWidth, rerender, initialProps} = renderColumnResize();

        // When Enter is pressed on its edge
        act(() => {
            getHandleProps().onKeyDown?.(createKeyboardEvent(handleElement, 'Enter').event);
        });

        // Then the column is fitted to its content, the same as a click
        expect(readWidth(NAME_COLUMN_KEY)).toBe('120px');
        expect(setTableColumnWidth).toHaveBeenCalledWith(COLUMN_RESIZING_ID, NAME_COLUMN_KEY, 120);
        expect(clearTableColumnWidth).not.toHaveBeenCalled();

        // When the stored width renders and Space is pressed
        rerender({...initialProps, resolvedColumnWidths: {...resolvedColumnWidths, name: 120}, columnWidthOverrides: {[NAME_COLUMN_KEY]: 120}});
        act(() => {
            getHandleProps().onKeyDown?.(createKeyboardEvent(handleElement, ' ', 'Space').event);
        });

        // Then the stored width is cleared, the same as a double-click, since one key can't tell the two apart
        expect(clearTableColumnWidth).toHaveBeenCalledWith(COLUMN_RESIZING_ID, NAME_COLUMN_KEY);
        expect(setTableColumnWidth).toHaveBeenCalledTimes(1);
    });

    it('resets a fitted column painted wider than its content on Enter', () => {
        // Given the last column, stored at its 120px content width but painted 300px wide by the leftover room it grows into
        const {handleElement, getHandleProps} = renderColumnResize({
            resolvedColumnWidths: {...resolvedColumnWidths, name: 300},
            columnWidthOverrides: {[NAME_COLUMN_KEY]: 120},
        });

        // When Enter is pressed on its edge
        act(() => {
            getHandleProps().onKeyDown?.(createKeyboardEvent(handleElement, 'Enter').event);
        });

        // Then it resets, since the stored width, not the painted one, says it is already fitted
        expect(clearTableColumnWidth).toHaveBeenCalledWith(COLUMN_RESIZING_ID, NAME_COLUMN_KEY);
        expect(setTableColumnWidth).not.toHaveBeenCalled();
    });

    it('toggles once while Enter is held', () => {
        // Given a column whose content fits in 120px, fitted by a first Enter press whose width has rendered
        const {handleElement, getHandleProps, rerender, initialProps} = renderColumnResize();

        act(() => {
            getHandleProps().onKeyDown?.(createKeyboardEvent(handleElement, 'Enter').event);
        });
        rerender({...initialProps, resolvedColumnWidths: {...resolvedColumnWidths, name: 120}, columnWidthOverrides: {[NAME_COLUMN_KEY]: 120}});

        // When the held key auto-repeats
        act(() => {
            getHandleProps().onKeyDown?.({...createKeyboardEvent(handleElement, 'Enter').event, repeat: true});
        });

        // Then the repeat doesn't reset the column, so holding the key doesn't flip between fitted and reset
        expect(clearTableColumnWidth).not.toHaveBeenCalled();
    });

    it('leaves other keys to the page', () => {
        // Given a focused column edge
        const {handleElement, getHandleProps} = renderColumnResize();
        const tab = createKeyboardEvent(handleElement, 'Tab');

        // When Tab is pressed
        act(() => {
            getHandleProps().onKeyDown?.(tab.event);
        });

        // Then the key does its usual job, moving focus on, and the column is untouched
        expect(tab.preventDefault).not.toHaveBeenCalled();
        expect(tab.stopPropagation).not.toHaveBeenCalled();
        expect(setTableColumnWidth).not.toHaveBeenCalled();
    });

    it('shows the edge line while the edge has keyboard focus', () => {
        // Given a resizable column
        const {handleElement, getHandleProps} = renderColumnResize();
        const readLineOpacity = () => handleElement.style.getPropertyValue(RESIZE_INDICATOR_OPACITY_VARIABLE);

        // When its edge is focused by a pointer press
        act(() => {
            getHandleProps().onFocus?.(createFocusEvent(handleElement, false));
        });

        // Then no line appears, since a press shows it only once a drag starts
        expect(readLineOpacity()).toBe('');

        // When the edge is focused from the keyboard
        act(() => {
            getHandleProps().onFocus?.(createFocusEvent(handleElement, true));
        });

        // Then the line appears, so the user sees which edge the arrow keys move
        expect(readLineOpacity()).toBe('1');

        // When focus moves on
        act(() => {
            getHandleProps().onBlur?.(createFocusEvent(handleElement, false));
        });

        // Then the line goes away
        expect(readLineOpacity()).toBe('0');
    });
});
