/**
 * Web column resizing: dragging a column's right edge sets its width, clicking it fits the content, double-clicking it
 * resets it. A focused edge does the same with arrow keys, and Enter or Space toggling between fitted and reset.
 * Widths live in CSS custom properties so React doesn't render mid-drag. Only the column's final width is stored in Onyx.
 */
import getDraggedColumnWidth, {clampColumnWidth, getKeyboardResizeAction, hasPointerPassedDragSlop} from '@components/Table/columnResize/columnResizeGestures';

import {clearTableColumnWidth, setTableColumnWidth} from '@libs/actions/TableColumnWidths';

import CONST from '@src/CONST';

import type React from 'react';

import {useEffect, useRef} from 'react';

import type {ColumnResizeController, ColumnResizeHandleDOMProps, UseColumnResizeParams} from './types';

import useLiveColumnWidths from './useLiveColumnWidths';
import useResizeIndicator from './useResizeIndicator';

/** A DOM `div` style, which the React Native style system can't type */
function getHandleStyle(columnGap: number): React.CSSProperties {
    return {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: -(columnGap / 2 + CONST.TABLES.COLUMN_RESIZE.HANDLE_HIT_WIDTH / 2),
        width: CONST.TABLES.COLUMN_RESIZE.HANDLE_HIT_WIDTH,
        cursor: CONST.TABLES.COLUMN_RESIZE.CURSOR,
        // Otherwise a touch drag on the handle is taken over by the table's own horizontal scrolling.
        touchAction: 'none',
    };
}

type Drag = {
    columnKey: string;

    /** Where the pointer went down. */
    startClientX: number;

    /** The column's width when the drag started. */
    startWidth: number;

    /** Whether the pointer passed the drag slop. Until then, releasing it is a click. */
    hasMovedPointer: boolean;

    /** Whether the pointer went down while a click on this edge was waiting to fit, so releasing it is a double-click. */
    isSecondClick: boolean;
};

/** A click waiting out the double-click interval before it fits its column. */
type PendingFit = {
    columnKey: string;

    timeoutID: ReturnType<typeof setTimeout>;
};

function useColumnResize({
    columnResizingID,
    resizableColumnKeys,
    resolvedColumnWidths,
    dragMinWidths,
    fitColumnWidths,
    columnWidthOverrides,
    columnGap,
}: UseColumnResizeParams): ColumnResizeController | undefined {
    const dragRef = useRef<Drag | null>(null);
    const {scopeElementRef, setScopeElement, writeColumnWidth, readColumnWidth, clearLiveWidths} = useLiveColumnWidths({resolvedColumnWidths, dragRef});
    const {revealIndicator, hideIndicator} = useResizeIndicator(scopeElementRef);

    // Fitting on the first click would move the edge before the second click, which would then land on the heading and sort it.
    const pendingFitRef = useRef<PendingFit | null>(null);

    // Column whose arrow-key width is painted but not stored yet. Stored on key release, so a held arrow doesn't store
    // on every repeat, each store's render clearing the painted width and pulling the edge back mid-hold.
    const keyboardResizedColumnKeyRef = useRef<string | null>(null);

    const resetDrag = () => {
        dragRef.current = null;
        document.body.style.cursor = '';
    };

    // Shared by pointerup, lost capture and cancel, so every way a drag can end keeps the width the user sees.
    const endDrag = (drag: Drag) => {
        resetDrag();
        hideIndicator();

        const width = readColumnWidth(drag.columnKey) ?? drag.startWidth;

        // Nothing gets stored, so no render follows to clear the live widths.
        if (!columnResizingID || width === drag.startWidth) {
            clearLiveWidths();
            return;
        }

        setTableColumnWidth(columnResizingID, drag.columnKey, width);
    };

    const getFittedColumnWidth = (columnKey: string): number | undefined => {
        const contentWidth = fitColumnWidths?.[columnKey];

        return contentWidth === undefined ? undefined : clampColumnWidth(contentWidth);
    };

    const fitColumnToContent = (columnKey: string) => {
        const width = getFittedColumnWidth(columnKey);

        if (!columnResizingID || width === undefined) {
            return;
        }

        // The last column stretches into leftover room, so it can be drawn wider than its stored width. Compare against the
        // stored width too, or an already-fitted last column looks unfitted and gets re-stored with no render to follow.
        if (columnWidthOverrides?.[columnKey] === width || readColumnWidth(columnKey) === width) {
            return;
        }

        writeColumnWidth(columnKey, width);
        setTableColumnWidth(columnResizingID, columnKey, width);
    };

    const resetColumnWidth = (columnKey: string) => {
        if (!columnResizingID) {
            return;
        }

        clearTableColumnWidth(columnResizingID, columnKey);
    };

    const scheduleFit = (columnKey: string) => {
        const timeoutID = setTimeout(() => {
            pendingFitRef.current = null;
            fitColumnToContent(columnKey);
        }, CONST.TABLES.COLUMN_RESIZE.DOUBLE_CLICK_INTERVAL);

        pendingFitRef.current = {columnKey, timeoutID};
    };

    /** Stops a waiting click. Returns the column it would have fitted. */
    const cancelPendingFit = (): string | undefined => {
        const pendingFit = pendingFitRef.current;

        if (!pendingFit) {
            return undefined;
        }

        clearTimeout(pendingFit.timeoutID);
        pendingFitRef.current = null;

        return pendingFit.columnKey;
    };

    // One key can't tell a click from a double-click, so it fits unless the fitted width is already stored, and resets otherwise.
    const toggleFitToContent = (columnKey: string) => {
        const fittedWidth = getFittedColumnWidth(columnKey);

        if (fittedWidth !== undefined && columnWidthOverrides?.[columnKey] !== fittedWidth) {
            fitColumnToContent(columnKey);
            return;
        }

        resetColumnWidth(columnKey);
    };

    const stepColumnWidth = (columnKey: string, step: number) => {
        const width = readColumnWidth(columnKey);

        if (width === undefined) {
            return;
        }

        const steppedWidth = clampColumnWidth(width + step, dragMinWidths?.[columnKey]);

        // A column already past a bound would otherwise jump to it, against the arrow pressed.
        if (Math.sign(steppedWidth - width) !== Math.sign(step)) {
            return;
        }

        writeColumnWidth(columnKey, steppedWidth);
        keyboardResizedColumnKeyRef.current = columnKey;
    };

    /** Stores the width the arrow keys painted. Shared by key release and blur. */
    const commitKeyboardResize = () => {
        const columnKey = keyboardResizedColumnKeyRef.current;

        if (!columnKey) {
            return;
        }

        keyboardResizedColumnKeyRef.current = null;
        const width = readColumnWidth(columnKey);

        // Nothing gets stored, so no render follows to clear the live widths.
        if (!columnResizingID || width === undefined || columnWidthOverrides?.[columnKey] === width) {
            clearLiveWidths();
            return;
        }

        setTableColumnWidth(columnResizingID, columnKey, width);
    };

    const handleKeyDown = (columnKey: string, event: React.KeyboardEvent<HTMLDivElement>) => {
        const action = getKeyboardResizeAction(event.key);

        // A drag owns the column's width until it ends.
        if (!action || dragRef.current) {
            return;
        }

        // Otherwise the arrows also scroll the table sideways, Space scrolls the page, and Enter reaches global shortcuts.
        event.preventDefault();
        event.stopPropagation();

        // A pointer focus shows no line, so the first key press brings it up.
        revealIndicator(event.currentTarget);

        if (action.type === 'step') {
            stepColumnWidth(columnKey, action.step);
            return;
        }

        // Holding the key would otherwise flip between fitted and reset on every repeat.
        if (event.repeat) {
            return;
        }

        commitKeyboardResize();
        toggleFitToContent(columnKey);
    };

    const handleBlur = () => {
        commitKeyboardResize();
        hideIndicator();
    };

    const handleFocus = (event: React.FocusEvent<HTMLDivElement>) => {
        // Pointer presses focus the edge too, and they show the line only once a drag starts.
        if (!event.currentTarget.matches(':focus-visible')) {
            return;
        }

        revealIndicator(event.currentTarget);
    };

    const handlePointerDown = (columnKey: string, event: React.PointerEvent<HTMLDivElement>) => {
        // Secondary buttons open context menus rather than dragging.
        if (event.button !== 0) {
            return;
        }

        // Keeps the drag from selecting the header's labels, and from reaching the column's sort button underneath.
        event.preventDefault();
        event.stopPropagation();

        // Keeps the drag on this handle once the pointer moves off it.
        event.currentTarget.setPointerCapture(event.pointerId);

        const pendingFitColumnKey = cancelPendingFit();
        const isSecondClick = pendingFitColumnKey === columnKey;

        // A click on another edge isn't a double-click, so the waiting one fits now, before this press reads its width.
        if (pendingFitColumnKey && !isSecondClick) {
            fitColumnToContent(pendingFitColumnKey);
        }

        dragRef.current = {
            columnKey,
            startClientX: event.clientX,
            startWidth: readColumnWidth(columnKey) ?? 0,
            hasMovedPointer: false,
            isSecondClick,
        };
        document.body.style.cursor = CONST.TABLES.COLUMN_RESIZE.CURSOR;
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;

        if (!drag) {
            return;
        }

        // Nothing is painted inside the slop, so a click fits from the width the column already had.
        if (!drag.hasMovedPointer) {
            if (!hasPointerPassedDragSlop(drag.startClientX, event.clientX)) {
                return;
            }

            // Kept once set, so a drag that comes back to where it started isn't a click. Clicks never show the line.
            drag.hasMovedPointer = true;
            revealIndicator(event.currentTarget);
        }

        // The line rides the handle, so it follows the clamped width, not the pointer.
        writeColumnWidth(drag.columnKey, getDraggedColumnWidth(drag.startWidth, drag.startClientX, event.clientX, dragMinWidths?.[drag.columnKey]));
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;

        if (!drag) {
            return;
        }

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        if (drag.hasMovedPointer) {
            endDrag(drag);
            return;
        }

        resetDrag();

        if (drag.isSecondClick) {
            resetColumnWidth(drag.columnKey);
            return;
        }

        scheduleFit(drag.columnKey);
    };

    /** Ends a drag whose pointer capture the browser reclaimed. Also fires after a normal pointerup, when it's a no-op. */
    const handleLostPointerCapture = () => {
        const drag = dragRef.current;

        if (!drag) {
            return;
        }

        endDrag(drag);
    };

    // Unmounting would otherwise fit a column that's gone, or mid-drag leave the resize cursor on the document.
    useEffect(
        () => () => {
            cancelPendingFit();

            if (!dragRef.current) {
                return;
            }

            resetDrag();
        },
        [],
    );

    if (!columnResizingID) {
        return undefined;
    }

    const getHandleProps = (columnKey: string): ColumnResizeHandleDOMProps | undefined => {
        if (!resizableColumnKeys.includes(columnKey)) {
            return undefined;
        }

        const width = readColumnWidth(columnKey) ?? 0;

        return {
            role: 'separator',
            tabIndex: 0,
            // The DOM names these attributes, so they can't follow the naming convention.
            /* eslint-disable @typescript-eslint/naming-convention */
            'aria-orientation': 'vertical',
            'aria-valuenow': width,
            // Widened to take in a width already past a bound, which the arrow keys leave alone.
            'aria-valuemin': Math.min(dragMinWidths?.[columnKey] ?? CONST.TABLES.COLUMN_RESIZE.MIN_WIDTH, width),
            'aria-valuemax': Math.max(CONST.TABLES.COLUMN_RESIZE.MAX_WIDTH, width),
            /* eslint-enable @typescript-eslint/naming-convention */
            style: getHandleStyle(columnGap),
            onPointerDown: (event) => handlePointerDown(columnKey, event),
            onPointerMove: handlePointerMove,
            onPointerUp: handlePointerUp,
            onPointerCancel: handleLostPointerCapture,
            onLostPointerCapture: handleLostPointerCapture,
            onKeyDown: (event) => handleKeyDown(columnKey, event),
            onKeyUp: commitKeyboardResize,
            onFocus: handleFocus,
            onBlur: handleBlur,
        };
    };

    return {setScopeElement, getHandleProps};
}

export default useColumnResize;
