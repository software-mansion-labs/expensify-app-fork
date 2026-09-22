import {
    RESIZE_INDICATOR_BOTTOM_VARIABLE,
    RESIZE_INDICATOR_LEFT_VARIABLE,
    RESIZE_INDICATOR_OPACITY_VARIABLE,
    RESIZE_INDICATOR_TOP_VARIABLE,
    getColumnWidthVariableName,
} from '@components/Table/columnResize/columnWidthExpressions';
import type {ResizableColumn} from '@components/Table/columnResize/types';

import useLocalize from '@hooks/useLocalize';

import {clearTableColumnWidth, setTableColumnWidths} from '@libs/actions/TableColumnWidths';

import CONST from '@src/CONST';

import type React from 'react';

import {useEffect, useLayoutEffect, useRef} from 'react';

import type {ColumnResizeController, ColumnResizeHandleDOMProps, UseColumnResizeParams} from './types';

const {MIN_WIDTH, MAX_WIDTH, KEYBOARD_STEP, DRAG_SLOP, HANDLE_HIT_WIDTH} = CONST.TABLES.COLUMN_RESIZE;

/** How far each arrow key moves a column's edge. Other keys leave the column alone. */
const KEYBOARD_STEP_BY_KEY: Record<string, number> = {
    ArrowLeft: -KEYBOARD_STEP,
    ArrowRight: KEYBOARD_STEP,
};

/** Keys that fit a column to its content and release it again, standing in for the pointer's click and double-click. */
const FIT_TO_CONTENT_KEYS = new Set([' ', 'Enter']);

const ROW_SELECTOR = `[role="${CONST.ROLE.ROW}"]`;

type Drag = {
    columnKey: string;

    /** Where the pointer went down, which every later position is measured against. */
    startClientX: number;

    /** The column's width when the drag started, which the pointer's travel is added to. */
    startWidth: number;

    /** Where the indicator was when the drag started, so it can follow the width rather than the pointer. */
    startIndicatorLeft: number;

    /** Whether the pointer has travelled far enough to mean a drag rather than a click. */
    hasMovedPointer: boolean;
};

function clampColumnWidth(width: number): number {
    return Math.min(Math.max(Math.round(width), MIN_WIDTH), MAX_WIDTH);
}

/**
 * The top of the heading row the handle sits in, in client coordinates.
 *
 * Not the top of the handle: the handle fills its heading *cell*, which sits inside the row's own vertical padding, so
 * starting the line there leaves it beginning a few px below the row it is meant to start at.
 */
function getHeaderRowTop(handleElement: HTMLElement): number {
    return (handleElement.closest(ROW_SELECTOR) ?? handleElement).getBoundingClientRect().top;
}

/**
 * How far the bottom of the lowest row sits above the bottom of `containingBlock`'s padding box, which is what an
 * absolutely positioned `bottom` is measured against.
 *
 * Read off the rows because the block the line is positioned in is the whole table, which goes on filling the page
 * after the rows have run out. Taken as the lowest row rather than the last one in document order, so a virtualized
 * list that keeps rows in the DOM out of order can't move the end of the line. Clamped at zero, since a list with more
 * rows than fit renders some below the visible area and the line should stop at the table's bottom rather than run
 * past it.
 */
function getLastRowBottomGap(containingBlock: Element, containingBlockRect: DOMRect): number {
    // The hidden twins a virtualized list keeps around — one for measuring, one for its sticky header — are skipped,
    // since neither is where a row is actually drawn.
    const rowBottoms = Array.from(containingBlock.querySelectorAll(`${ROW_SELECTOR}:not([aria-hidden="true"])`), (row) => row.getBoundingClientRect().bottom);

    if (rowBottoms.length === 0) {
        return 0;
    }

    // `clientTop` plus `clientHeight` is the padding box, since an element reports no `clientBottom`.
    const paddingBoxBottom = containingBlockRect.top + containingBlock.clientTop + containingBlock.clientHeight;

    return Math.max(paddingBoxBottom - Math.max(...rowBottoms), 0);
}

/** Where a handle's own centre line sits inside the block the indicator is positioned in. */
function getHandleCenterOffset(handleElement: HTMLElement, containingBlock: Element): number {
    const handleRect = handleElement.getBoundingClientRect();

    return handleRect.left + handleRect.width / 2 - containingBlock.getBoundingClientRect().left - containingBlock.clientLeft;
}

/**
 * Lets the user drag a table's column edges, on web.
 *
 * The widths live in CSS custom properties on one element the header and every row inherit from, so a drag rewrites a
 * single property and lets the browser repaint the whole table from it. React renders nothing between pointerdown and
 * pointerup, which is what keeps a virtualized table with a heavy cell per column from dropping frames mid-drag. The
 * indicator works the same way: hovering an edge writes its position and opacity as properties instead of raising state.
 *
 * Only the final width reaches Onyx, on pointerup. Once a column is stored it is pinned there and no longer sized from
 * its content, so the resolver treats it exactly like a column that declared a width, and the table scrolls when the
 * user drags a column wider than the room it has.
 *
 * Three gestures on an edge, not one: dragging it sets the width, clicking it without moving sizes the column to its
 * widest content, and double-clicking it releases the column back to whatever the resolver gives it. The keyboard gets
 * the arrow keys for the first and one toggling key for the other two, which it has no way to tell apart.
 *
 * Returns `undefined` when the table hasn't opted into resizing, which is also what the native implementation returns.
 */
function useColumnResize({columnResizingID, columns, columnKeysToFreeze, resolvedColumnWidths, columnWidthOverrides, columnGap}: UseColumnResizeParams): ColumnResizeController | undefined {
    const {translate} = useLocalize();
    const scopeElementRef = useRef<HTMLElement | null>(null);
    const indicatorElementRef = useRef<HTMLElement | null>(null);
    const dragRef = useRef<Drag | null>(null);

    // What was last written to each column's property, so a re-render doesn't rewrite a width that hasn't changed.
    const writtenWidthsRef = useRef<Record<string, number>>({});

    const setScopeElement = (element: HTMLElement | null) => {
        scopeElementRef.current = element;

        // The properties live on the element, so a new one starts out with none of them.
        writtenWidthsRef.current = {};
    };

    const setIndicatorElement = (element: HTMLElement | null) => {
        indicatorElementRef.current = element;
    };

    const setScopeProperty = (name: string, value: string) => {
        scopeElementRef.current?.style.setProperty(name, value);
    };

    const writeColumnWidth = (columnKey: string, width: number) => {
        setScopeProperty(getColumnWidthVariableName(columnKey), `${width}px`);
        writtenWidthsRef.current[columnKey] = width;
    };

    const clearColumnWidth = (columnKey: string) => {
        scopeElementRef.current?.style.removeProperty(getColumnWidthVariableName(columnKey));
        delete writtenWidthsRef.current[columnKey];
    };

    /**
     * The width the column is currently painted at, which during a drag is ahead of anything React knows.
     *
     * `undefined` when the column has no width anywhere — neither written to its property nor resolved. That is not the
     * same as zero, and writing zero is how a column the table couldn't read would collapse.
     */
    const readColumnWidth = (columnKey: string): number | undefined => {
        const writtenWidth = Number.parseFloat(scopeElementRef.current?.style.getPropertyValue(getColumnWidthVariableName(columnKey)) ?? '');

        return Number.isFinite(writtenWidth) ? writtenWidth : resolvedColumnWidths[columnKey];
    };

    /**
     * Shows the line at a column's edge, on the edge and running from the top of the header row to the bottom of the
     * table.
     *
     * Where the edge is comes off the handle, which sits in its column's own header cell and so already is where the
     * column ends. Where the line begins and ends comes off the heading row and the lowest data row, because the block
     * the line is positioned in matches neither: it starts above the heading row by however much the table scrolls, and
     * it carries on below the last row to the bottom of the page.
     */
    const revealIndicator = (handleElement: HTMLElement) => {
        const containingBlock = indicatorElementRef.current?.offsetParent;

        if (containingBlock) {
            const containingBlockRect = containingBlock.getBoundingClientRect();

            setScopeProperty(RESIZE_INDICATOR_LEFT_VARIABLE, `${getHandleCenterOffset(handleElement, containingBlock)}px`);
            setScopeProperty(RESIZE_INDICATOR_TOP_VARIABLE, `${getHeaderRowTop(handleElement) - containingBlockRect.top - containingBlock.clientTop}px`);
            setScopeProperty(RESIZE_INDICATOR_BOTTOM_VARIABLE, `${getLastRowBottomGap(containingBlock, containingBlockRect)}px`);
        }

        setScopeProperty(RESIZE_INDICATOR_OPACITY_VARIABLE, '1');
    };

    const hideIndicator = () => {
        // A drag that has left the handle behind still shows where the edge is going.
        if (dragRef.current) {
            return;
        }

        setScopeProperty(RESIZE_INDICATOR_OPACITY_VARIABLE, '0');
    };

    /**
     * Stores a column's new width, and freezes every other column that shares the row it currently sits in.
     *
     * The width the user took has to come from somewhere. Left sized from their content, the other columns would
     * re-share the row as soon as the drag ended and slide out from under the result the user had just been looking at.
     * Frozen, they stay exactly where they were drawn mid-drag and the row grows or shrinks around them instead. A
     * column the user has already resized is left alone, since its width is already theirs rather than the resolver's.
     */
    const commitColumnWidth = (columnKey: string, width: number) => {
        if (!columnResizingID) {
            return;
        }

        const widths: Record<string, number> = {[columnKey]: width};

        for (const frozenColumnKey of columnKeysToFreeze) {
            if (frozenColumnKey === columnKey || columnWidthOverrides?.[frozenColumnKey] !== undefined) {
                continue;
            }

            const frozenWidth = readColumnWidth(frozenColumnKey);

            // A column whose width can't be read is left out rather than frozen at a guess. It stays sized from its
            // content, which is the one answer that is certainly not wrong.
            if (frozenWidth === undefined) {
                continue;
            }

            widths[frozenColumnKey] = frozenWidth;
        }

        setTableColumnWidths(columnResizingID, widths);
    };

    /**
     * Sizes a column to its widest content, which is what a click on its edge does.
     *
     * Idempotent, because a double-click sends two clicks before it sends the double-click: clicking an already fitted
     * column has to leave it where it is, or the second click would undo the first and the double-click would put the
     * fit back instead of releasing it.
     */
    const fitToContent = (column: ResizableColumn) => {
        if (!columnResizingID || column.contentWidth === undefined) {
            return;
        }

        const contentWidth = clampColumnWidth(column.contentWidth);

        if (columnWidthOverrides?.[column.columnKey] === contentWidth) {
            return;
        }

        writeColumnWidth(column.columnKey, contentWidth);
        commitColumnWidth(column.columnKey, contentWidth);
    };

    /**
     * Releases a column back to the width the resolver gives it, which is what a double-click on its edge does.
     *
     * Only this column is released. The columns frozen to pay for its width keep theirs, because those are the widths
     * they were being drawn at and re-sharing the row would move columns the user never touched.
     */
    const releaseToBaseWidth = (column: ResizableColumn) => {
        if (!columnResizingID || columnWidthOverrides?.[column.columnKey] === undefined) {
            return;
        }

        clearColumnWidth(column.columnKey);
        clearTableColumnWidth(columnResizingID, column.columnKey);
    };

    /**
     * Fits a column to its content, or releases it when it is already fitted.
     *
     * The keyboard's stand-in for the pointer's click and double-click, which it has no way to tell apart: one key
     * reaches both states by alternating between them.
     */
    const toggleFitToContent = (column: ResizableColumn) => {
        const contentWidth = column.contentWidth === undefined ? undefined : clampColumnWidth(column.contentWidth);

        if (contentWidth !== undefined && columnWidthOverrides?.[column.columnKey] !== contentWidth) {
            fitToContent(column);
            return;
        }

        releaseToBaseWidth(column);
    };

    /**
     * Ends the drag in progress, storing whatever width it left behind.
     *
     * Shared by the pointer being released, by the browser taking its capture back, and by the gesture being cancelled,
     * because the width has already been written in all three cases and only the fit-to-content branch differs.
     */
    const endDrag = (drag: Drag) => {
        dragRef.current = null;
        document.body.style.cursor = '';

        const width = readColumnWidth(drag.columnKey) ?? drag.startWidth;

        if (width !== drag.startWidth) {
            commitColumnWidth(drag.columnKey, width);
        }
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

        // Measured before the drag starts, because the handle moves with the column and so stops being a reading of
        // where the edge began.
        revealIndicator(event.currentTarget);

        const containingBlock = indicatorElementRef.current?.offsetParent;

        dragRef.current = {
            columnKey: column.columnKey,
            startClientX: event.clientX,
            startWidth: readColumnWidth(column.columnKey) ?? 0,
            startIndicatorLeft: containingBlock ? getHandleCenterOffset(event.currentTarget, containingBlock) : 0,
            hasMovedPointer: false,
        };
        document.body.style.cursor = 'col-resize';
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;

        if (!drag) {
            return;
        }

        // Recorded rather than inferred from the width on release, so a drag that pushed the column against its
        // narrowest or widest and came back to where it started still counts as a drag rather than as a click.
        //
        // A few px of slop, because pressing a mouse button rarely leaves the pointer on exactly the pixel it went down
        // on. Without it every click reads as a tiny drag, which both nudges the column a px and swallows the click
        // that was meant to fit it.
        drag.hasMovedPointer = drag.hasMovedPointer || Math.abs(event.clientX - drag.startClientX) > DRAG_SLOP;

        // Nothing is written until the pointer has travelled far enough to mean it, so a click leaves the column
        // exactly where it was for the fit to size it from.
        if (!drag.hasMovedPointer) {
            return;
        }

        const width = clampColumnWidth(drag.startWidth + (event.clientX - drag.startClientX));

        // The only writes for the length of the drag. The line follows the width rather than the pointer, so once the
        // column has hit the narrowest or widest it may be dragged to, the line stops where the edge stopped instead of
        // carrying on under the pointer.
        writeColumnWidth(drag.columnKey, width);
        setScopeProperty(RESIZE_INDICATOR_LEFT_VARIABLE, `${drag.startIndicatorLeft + width - drag.startWidth}px`);
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
            dragRef.current = null;
            document.body.style.cursor = '';
            fitToContent(column);
        }

        // The handle has moved with the column, so whether the pointer is still on it decides whether the edge stays
        // visible. Releasing capture doesn't reliably raise a boundary event, so this is read rather than waited for.
        const handleRect = event.currentTarget.getBoundingClientRect();
        const isPointerStillOnHandle = event.clientX >= handleRect.left && event.clientX <= handleRect.right && event.clientY >= handleRect.top && event.clientY <= handleRect.bottom;

        if (!isPointerStillOnHandle) {
            hideIndicator();
        }
    };

    /**
     * Ends a drag the browser took the pointer capture back from, rather than one the user finished: the handle being
     * rendered away mid-drag, the element leaving the document, or the browser deciding to own the gesture.
     *
     * Also fires right after a normal `pointerup` releases the capture, which is why it does nothing once the drag has
     * already been cleared.
     */
    const handleLostPointerCapture = () => {
        const drag = dragRef.current;

        if (!drag) {
            return;
        }

        endDrag(drag);
        hideIndicator();
    };

    const handleKeyDown = (column: ResizableColumn, event: React.KeyboardEvent<HTMLDivElement>) => {
        if (FIT_TO_CONTENT_KEYS.has(event.key)) {
            event.preventDefault();
            toggleFitToContent(column);
            return;
        }

        const step = KEYBOARD_STEP_BY_KEY[event.key];

        if (step === undefined) {
            return;
        }

        // Otherwise the arrow key scrolls the table sideways as well as resizing the column.
        event.preventDefault();

        const width = clampColumnWidth((readColumnWidth(column.columnKey) ?? 0) + step);

        writeColumnWidth(column.columnKey, width);
        commitColumnWidth(column.columnKey, width);

        // The handle has moved with the column, so the line is re-read from it rather than stepped along with it.
        revealIndicator(event.currentTarget);
    };

    // The cursor is set on the document while a column is dragged, so a table that unmounts mid-drag — the user
    // navigating away, the layout crossing into the narrow breakpoint — would otherwise leave every pointer in the app
    // showing the resize cursor, and leave a drag recorded that nothing is left to end.
    useEffect(
        () => () => {
            dragRef.current = null;
            document.body.style.cursor = '';
        },
        [],
    );

    // The resolver's answer is written into the properties for every column the user hasn't pinned, so a change of
    // window size or of data still moves the columns even though they read their widths from properties rather than
    // from their styles. A pinned column is deliberately left alone: its property already holds the width the user
    // chose, and rewriting it from the resolver would take that width away from them on the next resize of the window.
    //
    // No dependency list, because this has to run after any render that changed a width and the widths arrive as a new
    // object every time. The comparison against what was last written is what keeps it from touching the DOM.
    useLayoutEffect(() => {
        if (!columnResizingID) {
            return;
        }

        for (const [columnKey, resolvedWidth] of Object.entries(resolvedColumnWidths)) {
            if (columnWidthOverrides?.[columnKey] !== undefined || writtenWidthsRef.current[columnKey] === resolvedWidth) {
                continue;
            }

            writeColumnWidth(columnKey, resolvedWidth);
        }
    });

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
            // Overhangs its own cell by exactly half the gap to the next column, so the strip is centred on the space
            // between the two columns and never covers the next column's content — which it couldn't be pointed at
            // through anyway, since every react-native-web view is its own stacking context.
            //
            // Every handle sits between two columns: the column at the end of the row has no heading, so it is not one
            // the user can drag, and no handle ever has to reach past it to the table's own edge.
            right: -(columnGap / 2 + HANDLE_HIT_WIDTH / 2),
            width: HANDLE_HIT_WIDTH,
            cursor: 'col-resize',
            // Otherwise a touch drag on the handle is taken over by the table's own horizontal scrolling.
            touchAction: 'none',
        },
        onPointerDown: (event) => handlePointerDown(column, event),
        onPointerMove: handlePointerMove,
        onPointerUp: (event) => handlePointerUp(column, event),
        // A cancelled gesture is neither a click nor a finished drag, so it ends the same way a capture taken back by
        // the browser does: whatever width was already written stands, and nothing is fitted.
        onPointerCancel: handleLostPointerCapture,
        onLostPointerCapture: handleLostPointerCapture,
        onPointerEnter: (event) => revealIndicator(event.currentTarget),
        onPointerLeave: hideIndicator,
        onDoubleClick: () => releaseToBaseWidth(column),
        onKeyDown: (event) => handleKeyDown(column, event),
        onFocus: (event) => revealIndicator(event.currentTarget),
        onBlur: hideIndicator,
    });

    return {setScopeElement, setIndicatorElement, columns, getHandleProps};
}

export default useColumnResize;
