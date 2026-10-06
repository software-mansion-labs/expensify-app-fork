import type {AbsorberWidths} from '@components/Table/columnResize/columnResizeGestures';
import {
    clampColumnWidth,
    getDraggedColumnWidth,
    getKeyboardResizeAction,
    getResizedColumnWidths,
    getToggleFitAction,
    hasPointerPassedDragSlop,
} from '@components/Table/columnResize/columnResizeGestures';
import type {ResizableColumn} from '@components/Table/columnResize/types';

import useLocalize from '@hooks/useLocalize';

import {clearTableColumnWidth, setTableColumnWidth} from '@libs/actions/TableColumnWidths';

import CONST from '@src/CONST';

import type React from 'react';

import {useEffect, useRef} from 'react';

import type {ColumnResizeController, ColumnResizeHandleDOMProps, UseColumnResizeParams} from './types';

import useLiveColumnWidths from './useLiveColumnWidths';
import useResizeIndicator from './useResizeIndicator';

const {MIN_WIDTH, MAX_WIDTH, HANDLE_HIT_WIDTH} = CONST.TABLES.COLUMN_RESIZE;

type Drag = {
    column: ResizableColumn;

    /** Where the pointer went down, which every later position is measured against. */
    startClientX: number;

    /** The column's width when the drag started, which the pointer's travel is added to. */
    startWidth: number;

    /** Paying columns' widths at drag start, read once so shares don't compound across moves. */
    absorberStartWidths: AbsorberWidths;

    /** Whether the pointer has travelled far enough to mean a drag rather than a click. */
    hasMovedPointer: boolean;
};

/**
 * Web column resizing: drag sets width (paid by later columns), click fits content, double-click resets. Widths live in
 * CSS custom properties so React doesn't render mid-drag; only the dragged column's final width is stored in Onyx.
 */
function useColumnResize({columnResizingID, columns, resolvedColumnWidths, columnWidthOverrides, columnGap}: UseColumnResizeParams): ColumnResizeController | undefined {
    const {translate} = useLocalize();
    const dragRef = useRef<Drag | null>(null);
    const {scopeElementRef, setScopeElement, writeColumnWidth, readColumnWidth, clearLiveWidths} = useLiveColumnWidths({resolvedColumnWidths, columnWidthOverrides, dragRef});
    const {revealIndicator, hideIndicator, showGrip, hideGrip} = useResizeIndicator(scopeElementRef, dragRef);

    // Each column's handle, so hovering its heading can find the grip to show.
    const handleElementsRef = useRef(new Map<string, HTMLElement>());

    /** Forgets the drag and restores the document cursor. Doesn't commit anything. */
    const resetDrag = () => {
        dragRef.current = null;
        document.body.style.cursor = '';
    };

    /** Paying columns with their painted widths. Unreadable ones are skipped rather than pinned at zero. */
    const readAbsorberWidths = (column: ResizableColumn): AbsorberWidths => {
        const absorberWidths: AbsorberWidths = [];

        for (const absorber of column.absorbers) {
            const startWidth = readColumnWidth(absorber.columnKey);

            if (startWidth === undefined) {
                continue;
            }

            absorberWidths.push({...absorber, startWidth});
        }

        return absorberWidths;
    };

    /** Sets a column's width, taking the difference out of later columns. Used by drag, click and arrow keys. */
    const applyColumnWidths = (column: ResizableColumn, width: number, startWidth: number, absorberStartWidths: AbsorberWidths) => {
        for (const [columnKey, resizedWidth] of Object.entries(getResizedColumnWidths(column.columnKey, width, startWidth, absorberStartWidths))) {
            writeColumnWidth(columnKey, resizedWidth);
        }
    };

    /**
     * Stores only the dragged column; the resolver re-derives the payers, and storing them would mark them as user-sized.
     * The live widths are cleared once React renders the stored one, or right away when nothing is stored, since then no render follows.
     */
    const commitColumnWidth = (columnKey: string, width: number) => {
        if (!columnResizingID || columnWidthOverrides?.[columnKey] === width) {
            clearLiveWidths();
            return;
        }

        setTableColumnWidth(columnResizingID, columnKey, width);
    };

    /** Fits a column to its content (click). Idempotent, since a double-click fires two clicks first. */
    const fitToContent = (column: ResizableColumn) => {
        if (!columnResizingID || column.contentWidth === undefined) {
            return;
        }

        const contentWidth = clampColumnWidth(column.contentWidth);

        if (columnWidthOverrides?.[column.columnKey] === contentWidth) {
            return;
        }

        applyColumnWidths(column, contentWidth, readColumnWidth(column.columnKey) ?? contentWidth, readAbsorberWidths(column));
        commitColumnWidth(column.columnKey, contentWidth);
    };

    /** Resets a column to its resolved width (double-click); the resolver gives the payers back their width next render. */
    const releaseToBaseWidth = (column: ResizableColumn) => {
        if (!columnResizingID || columnWidthOverrides?.[column.columnKey] === undefined) {
            return;
        }

        clearTableColumnWidth(columnResizingID, column.columnKey);
    };

    /** Keyboard stand-in for click/double-click: toggles between fitted and released. */
    const toggleFitToContent = (column: ResizableColumn) => {
        if (getToggleFitAction(column.contentWidth, columnWidthOverrides?.[column.columnKey]) === 'fit') {
            fitToContent(column);
            return;
        }

        releaseToBaseWidth(column);
    };

    /** Ends the drag and stores its width. Shared by pointerup, lost capture and cancel. */
    const endDrag = (drag: Drag) => {
        resetDrag();

        const width = readColumnWidth(drag.column.columnKey) ?? drag.startWidth;

        if (width === drag.startWidth) {
            clearLiveWidths();
            return;
        }

        commitColumnWidth(drag.column.columnKey, width);
    };

    const handlePointerDown = (column: ResizableColumn, event: React.PointerEvent<HTMLDivElement>) => {
        // Secondary buttons open context menus rather than dragging.
        if (event.button !== 0) {
            return;
        }

        // Keeps the drag from selecting the header's labels, and from reaching the column's sort button underneath.
        event.preventDefault();
        event.stopPropagation();

        // Capture keeps the rest of the drag on this handle even once the pointer has moved off it, so the drag
        // survives the pointer crossing into the rows, the window chrome, or another column's handle.
        event.currentTarget.setPointerCapture(event.pointerId);

        const startWidth = readColumnWidth(column.columnKey) ?? 0;

        dragRef.current = {
            column,
            startClientX: event.clientX,
            startWidth,
            absorberStartWidths: readAbsorberWidths(column),
            hasMovedPointer: false,
        };
        document.body.style.cursor = 'col-resize';
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;

        if (!drag) {
            return;
        }

        // Nothing is written until the pointer has travelled far enough to mean it, so a click leaves the column
        // exactly where it was for the fit to size it from.
        if (!drag.hasMovedPointer && !hasPointerPassedDragSlop(drag.startClientX, event.clientX)) {
            return;
        }

        // Tracked explicitly so a drag that returns to its start isn't a click. The line waits for this too, so clicks never show it.
        if (!drag.hasMovedPointer) {
            drag.hasMovedPointer = true;
            revealIndicator(event.currentTarget);
        }

        const width = getDraggedColumnWidth(drag.startWidth, drag.startClientX, event.clientX);

        // The only writes during a drag. The line rides the handle, so it follows the clamped width, not the pointer.
        applyColumnWidths(drag.column, width, drag.startWidth, drag.absorberStartWidths);
    };

    const handlePointerUp = (column: ResizableColumn, event: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;

        if (!drag) {
            return;
        }

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        // Pressing the edge without moving it is a click, which sizes the column to its content instead.
        if (drag.hasMovedPointer) {
            endDrag(drag);
        } else {
            resetDrag();
            fitToContent(column);
        }

        hideIndicator();

        // The heading has moved with the column, so whether the pointer is still on it decides whether the grip comes
        // back. Releasing capture doesn't reliably raise a boundary event, so this is read rather than waited for.
        const headingRect = (event.currentTarget.parentElement ?? event.currentTarget).getBoundingClientRect();
        const isPointerStillOnHeading = event.clientX >= headingRect.left && event.clientX <= headingRect.right && event.clientY >= headingRect.top && event.clientY <= headingRect.bottom;

        if (!isPointerStillOnHeading) {
            hideGrip(event.currentTarget);
        }
    };

    /** Ends a drag whose pointer capture the browser reclaimed. Also fires after a normal pointerup, when it's a no-op. */
    const handleLostPointerCapture = () => {
        const drag = dragRef.current;

        if (!drag) {
            return;
        }

        endDrag(drag);
        hideIndicator();
    };

    const handleKeyDown = (column: ResizableColumn, event: React.KeyboardEvent<HTMLDivElement>) => {
        const action = getKeyboardResizeAction(event.key);

        if (!action) {
            return;
        }

        // Otherwise Space scrolls the page and the arrow keys scroll the table sideways as well.
        event.preventDefault();

        // An edge focused by a press shows no line until the keyboard starts resizing it.
        revealIndicator(event.currentTarget);

        if (action.type === 'toggleFit') {
            toggleFitToContent(column);
            return;
        }

        const startWidth = readColumnWidth(column.columnKey) ?? 0;
        const width = clampColumnWidth(startWidth + action.step);

        applyColumnWidths(column, width, startWidth, readAbsorberWidths(column));
        commitColumnWidth(column.columnKey, width);
    };

    // Unmounting mid-drag would otherwise leave the resize cursor on the document and a dangling drag.
    useEffect(() => resetDrag, []);

    if (!columnResizingID || columns.length === 0) {
        return undefined;
    }

    const getHandleProps = (column: ResizableColumn): ColumnResizeHandleDOMProps => ({
        role: 'separator',
        tabIndex: 0,
        // The DOM names these attributes, so they can't follow the naming convention the rule asks for.
        /* eslint-disable @typescript-eslint/naming-convention */
        'aria-orientation': 'vertical',
        'aria-label': translate('common.resizeColumn', {columnName: column.columnLabel}),
        'aria-valuenow': columnWidthOverrides?.[column.columnKey] ?? resolvedColumnWidths[column.columnKey] ?? 0,
        'aria-valuemin': MIN_WIDTH,
        'aria-valuemax': MAX_WIDTH,
        /* eslint-enable @typescript-eslint/naming-convention */
        style: {
            position: 'absolute',
            top: 0,
            bottom: 0,
            // Overhangs by half the column gap so the strip is centred between columns. Every handle has a next column, since the last one is headless.
            right: -(columnGap / 2 + HANDLE_HIT_WIDTH / 2),
            width: HANDLE_HIT_WIDTH,
            cursor: 'col-resize',
            // Otherwise a touch drag on the handle is taken over by the table's own horizontal scrolling.
            touchAction: 'none',
        },
        ref: (element) => {
            if (element) {
                handleElementsRef.current.set(column.columnKey, element);
            } else {
                handleElementsRef.current.delete(column.columnKey);
            }
        },
        onPointerDown: (event) => handlePointerDown(column, event),
        onPointerMove: handlePointerMove,
        onPointerUp: (event) => handlePointerUp(column, event),
        // A cancelled gesture is neither a click nor a finished drag, so it ends the same way a capture taken back by
        // the browser does: whatever width was already written stands, and nothing is fitted.
        onPointerCancel: handleLostPointerCapture,
        onLostPointerCapture: handleLostPointerCapture,
        onDoubleClick: () => releaseToBaseWidth(column),
        onKeyDown: (event) => handleKeyDown(column, event),
        // The edge only counts as active for keyboard focus; a pointer shows the line once it starts dragging.
        onFocus: (event) => {
            if (!event.currentTarget.matches(':focus-visible')) {
                return;
            }

            revealIndicator(event.currentTarget);
        },
        onBlur: hideIndicator,
    });

    const showColumnGrip = (columnKey: string) => {
        const handleElement = handleElementsRef.current.get(columnKey);

        if (handleElement) {
            showGrip(handleElement);
        }
    };

    const hideColumnGrip = (columnKey: string) => {
        const handleElement = handleElementsRef.current.get(columnKey);

        if (handleElement) {
            hideGrip(handleElement);
        }
    };

    return {setScopeElement, columns, getHandleProps, showGrip: showColumnGrip, hideGrip: hideColumnGrip};
}

export default useColumnResize;
