import {act, renderHook} from '@testing-library/react-native';

import {getColumnWidthVariableName} from '@components/Table/columnResize/columnWidthExpressions';
import type {ColumnWidthOverrides, ResizableColumn} from '@components/Table/columnResize/types';
import type UseColumnResize from '@components/Table/columnResize/useColumnResize';
import type {UseColumnResizeParams} from '@components/Table/columnResize/useColumnResize/types';

import {clearTableColumnWidth, setTableColumnWidth} from '@libs/actions/TableColumnWidths';

import CONST from '@src/CONST';

import type React from 'react';

// Jest resolves the native no-op, so the web implementation is loaded by its file name.
const {default: useColumnResize} = jest.requireActual<{default: typeof UseColumnResize}>('@components/Table/columnResize/useColumnResize/index.ts');

jest.mock('@hooks/useLocalize', () => ({
    __esModule: true,
    default: () => ({translate: (key: string) => key}),
}));

jest.mock('@libs/actions/TableColumnWidths', () => ({
    setTableColumnWidth: jest.fn(),
    clearTableColumnWidth: jest.fn(),
}));

const {KEYBOARD_STEP, DRAG_SLOP} = CONST.TABLES.COLUMN_RESIZE;

const COLUMN_RESIZING_ID = 'testTable';

const nameColumn: ResizableColumn = {
    columnKey: 'name',
    columnLabel: 'Name',
    contentWidth: 150,
};

const resolvedColumnWidths = {name: 200, email: 200, role: 200};

type PointerEventInit = {clientX: number; button?: number};

/** A pointer event carrying only what the hook reads, aimed at the given handle. */
function createPointerEvent(handleElement: HTMLDivElement, {clientX, button = 0}: PointerEventInit): React.PointerEvent<HTMLDivElement> {
    const event = {button, clientX, clientY: 0, pointerId: 1, currentTarget: handleElement, preventDefault: jest.fn(), stopPropagation: jest.fn()};

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the hook only reads the fields above
    return event as unknown as React.PointerEvent<HTMLDivElement>;
}

function createKeyboardEvent(handleElement: HTMLDivElement, key: string): React.KeyboardEvent<HTMLDivElement> {
    const event = {key, currentTarget: handleElement, preventDefault: jest.fn()};

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the hook only reads the fields above
    return event as unknown as React.KeyboardEvent<HTMLDivElement>;
}

/** Renders the hook with a scope element and one handle inside it, the way the table mounts them. */
function renderColumnResize(columnWidthOverrides?: ColumnWidthOverrides) {
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
        columns: [nameColumn],
        resolvedColumnWidths,
        columnWidthOverrides,
        columnGap: 12,
    };
    const hook = renderHook((props: UseColumnResizeParams) => useColumnResize(props), {initialProps});

    hook.result.current?.setScopeElement(scopeElement);

    const getHandleProps = () => {
        const controller = hook.result.current;

        if (!controller) {
            throw new Error('Expected the hook to return a controller');
        }

        return controller.getHandleProps(nameColumn);
    };

    const readWidth = (columnKey: string) => scopeElement.style.getPropertyValue(getColumnWidthVariableName(columnKey));

    return {...hook, initialProps, scopeElement, handleElement, setPointerCapture, getHandleProps, readWidth};
}

describe('useColumnResize', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        document.body.style.cursor = '';
    });

    it('returns no controller when resizing is off', () => {
        // Given a table with no resizing ID, which is how native, narrow layouts and tables that didn't opt in render it
        const params: UseColumnResizeParams = {columnResizingID: undefined, columns: [nameColumn], resolvedColumnWidths, columnWidthOverrides: undefined, columnGap: 12};

        // When the hook runs
        const {result} = renderHook(() => useColumnResize(params));

        // Then it hands back no controller, so the header renders no handles
        expect(result.current).toBeUndefined();
    });

    it('paints a drag onto the scope and stores only the dragged column on release', () => {
        // Given a 200px column with two 200px columns after it
        const {handleElement, getHandleProps, readWidth} = renderColumnResize();

        // When its edge is dragged 60px right
        act(() => {
            getHandleProps().onPointerDown?.(createPointerEvent(handleElement, {clientX: 100}));
            getHandleProps().onPointerMove?.(createPointerEvent(handleElement, {clientX: 160}));
        });

        // Then only the dragged column's width is painted straight onto the scope, so the drag repaints without a React
        // render and the other columns keep their widths instead of shrinking to make room
        expect(readWidth('name')).toBe('260px');
        expect(readWidth('email')).toBe('');
        expect(readWidth('role')).toBe('');
        expect(document.body.style.cursor).toBe('col-resize');

        // When the pointer is released
        act(() => {
            getHandleProps().onPointerUp?.(createPointerEvent(handleElement, {clientX: 160}));
        });

        // Then only the dragged column is stored, once
        expect(setTableColumnWidth).toHaveBeenCalledTimes(1);
        expect(setTableColumnWidth).toHaveBeenCalledWith(COLUMN_RESIZING_ID, 'name', 260);
        expect(document.body.style.cursor).toBe('');
    });

    it('fits the column to its content on a click', () => {
        // Given a column whose content is narrower than its resolved width
        const {handleElement, getHandleProps} = renderColumnResize();

        // When its edge is pressed and released with the pointer wobbling no further than the slop
        act(() => {
            getHandleProps().onPointerDown?.(createPointerEvent(handleElement, {clientX: 100}));
            getHandleProps().onPointerMove?.(createPointerEvent(handleElement, {clientX: 100 + DRAG_SLOP}));
            getHandleProps().onPointerUp?.(createPointerEvent(handleElement, {clientX: 100 + DRAG_SLOP}));
        });

        // Then it counts as a click and the column is fitted to its content, instead of storing a tiny drag
        expect(setTableColumnWidth).toHaveBeenCalledTimes(1);
        expect(setTableColumnWidth).toHaveBeenCalledWith(COLUMN_RESIZING_ID, 'name', nameColumn.contentWidth);
    });

    it('stores nothing and clears the scope when a drag ends where it started', () => {
        // Given a column being dragged past the slop
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

        // Then nothing is stored or fitted, and the scope is cleared since no render follows that would clear it, which
        // would otherwise leave the painted widths masking later resolved ones
        expect(setTableColumnWidth).not.toHaveBeenCalled();
        expect(readWidth('name')).toBe('');
        expect(readWidth('email')).toBe('');
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

    it('steps the width from the painted width on repeated arrow presses', () => {
        // Given a focused 200px column edge
        const {handleElement, getHandleProps} = renderColumnResize();

        // When the right arrow is pressed twice before the stored width renders
        act(() => {
            getHandleProps().onKeyDown?.(createKeyboardEvent(handleElement, 'ArrowRight'));
            getHandleProps().onKeyDown?.(createKeyboardEvent(handleElement, 'ArrowRight'));
        });

        // Then the second press builds on the painted width rather than the stale resolved one, so no press is lost
        expect(setTableColumnWidth).toHaveBeenLastCalledWith(COLUMN_RESIZING_ID, 'name', 200 + 2 * KEYBOARD_STEP);
    });

    it('releases a fitted column on the keyboard toggle', () => {
        // Given a column stored at its content width
        const {handleElement, getHandleProps} = renderColumnResize({name: 150});

        // When Space is pressed on its edge
        act(() => {
            getHandleProps().onKeyDown?.(createKeyboardEvent(handleElement, ' '));
        });

        // Then the column is released back to its resolved width, so pressing twice undoes the first press
        expect(clearTableColumnWidth).toHaveBeenCalledWith(COLUMN_RESIZING_ID, 'name');
        expect(setTableColumnWidth).not.toHaveBeenCalled();
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

        // When the stored width comes back from Onyx and the table renders it
        rerender({...initialProps, columnWidthOverrides: {name: 260}});

        // Then the painted widths step aside, so every column paints the fallback React rendered and later resolved widths aren't masked
        expect(readWidth('name')).toBe('');
        expect(readWidth('email')).toBe('');
        expect(readWidth('role')).toBe('');
    });
});
