import {
    RESIZE_INDICATOR_BOTTOM_VARIABLE,
    RESIZE_INDICATOR_LEFT_VARIABLE,
    RESIZE_INDICATOR_OPACITY_VARIABLE,
    RESIZE_INDICATOR_TOP_VARIABLE,
    getColumnWidthVariableName,
} from '@components/Table/columnResize/columnWidthExpressions';
import getAbsorbedColumnWidths from '@components/Table/columnResize/getAbsorbedColumnWidths';
import type {ResizableColumn} from '@components/Table/columnResize/types';

import useLocalize from '@hooks/useLocalize';

import {clearTableColumnWidth, setTableColumnWidth} from '@libs/actions/TableColumnWidths';

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

/** What the indicator's opacity property is set to. Named because the line is shown and hidden from several places. */
const INDICATOR_OPACITY = {
    VISIBLE: '1',
    HIDDEN: '0',
} as const;

const ROW_SELECTOR = `[role="${CONST.ROLE.ROW}"]`;

type Drag = {
    column: ResizableColumn;

    /** Where the pointer went down, which every later position is measured against. */
    startClientX: number;

    /** The column's width when the drag started, which the pointer's travel is added to. */
    startWidth: number;

    /** The width last written for the column, so a scroll can work out how far the edge has already moved. */
    width: number;

    /** Paying columns' widths at drag start, read once so shares don't compound across moves. */
    absorberStartWidths: AbsorberWidths;

    /** Where the indicator was when the drag started, so it can follow the width rather than the pointer. */
    startIndicatorLeft: number;

    /** Whether the pointer has travelled far enough to mean a drag rather than a click. */
    hasMovedPointer: boolean;
};

/** The columns paying for a resize, paired with the widths they are paying from. */
type AbsorberWidths = {columnKeys: string[]; widths: number[]};

function clampColumnWidth(width: number): number {
    return Math.min(Math.max(Math.round(width), MIN_WIDTH), MAX_WIDTH);
}

/** Top of the handle's heading row in client coordinates (not the handle's top, which is inset by the row's padding). */
function getHeaderRowTop(handleElement: HTMLElement): number {
    return (handleElement.closest(ROW_SELECTOR) ?? handleElement).getBoundingClientRect().top;
}

/**
 * Distance from the lowest row's bottom to the bottom of `containingBlock`'s padding box, clamped at zero. Uses the lowest
 * row, not the last in DOM order, since virtualized lists may reorder rows.
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
 * Positions the line at the handle's edge, from the heading row to the lowest row, and returns its offsets.
 * DOM-only and takes elements as args, so the scroll listener can call it without re-registering.
 */
function drawIndicatorAtHandle(scopeElement: HTMLElement | null, indicatorElement: HTMLElement | null, handleElement: HTMLElement): number | undefined {
    const scopeStyle = scopeElement?.style;
    const containingBlock = indicatorElement?.offsetParent;

    if (!containingBlock) {
        scopeStyle?.setProperty(RESIZE_INDICATOR_OPACITY_VARIABLE, INDICATOR_OPACITY.VISIBLE);

        return undefined;
    }

    const containingBlockRect = containingBlock.getBoundingClientRect();
    const left = getHandleCenterOffset(handleElement, containingBlock);

    scopeStyle?.setProperty(RESIZE_INDICATOR_LEFT_VARIABLE, `${left}px`);
    scopeStyle?.setProperty(RESIZE_INDICATOR_TOP_VARIABLE, `${getHeaderRowTop(handleElement) - containingBlockRect.top - containingBlock.clientTop}px`);
    scopeStyle?.setProperty(RESIZE_INDICATOR_BOTTOM_VARIABLE, `${getLastRowBottomGap(containingBlock, containingBlockRect)}px`);

    // The line is positioned against the table, not the columns, so hide it once its edge scrolls out of the table's box.
    const isEdgeInView = left >= 0 && left <= containingBlock.clientWidth;
    const opacity = isEdgeInView ? INDICATOR_OPACITY.VISIBLE : INDICATOR_OPACITY.HIDDEN;

    scopeStyle?.setProperty(RESIZE_INDICATOR_OPACITY_VARIABLE, opacity);

    return left;
}

/**
 * Web column resizing: drag sets width (paid by later columns), click fits content, double-click resets. Widths live in
 * CSS custom properties so React doesn't render mid-drag; only the dragged column's final width is stored in Onyx.
 */
function useColumnResize({columnResizingID, columns, resolvedColumnWidths, columnWidthOverrides, columnGap}: UseColumnResizeParams): ColumnResizeController | undefined {
    const {translate} = useLocalize();
    const scopeElementRef = useRef<HTMLElement | null>(null);
    const indicatorElementRef = useRef<HTMLElement | null>(null);
    const dragRef = useRef<Drag | null>(null);

    // The handle the line is currently pointing at, so it can be redrawn when the columns move under it without the
    // pointer having left and re-entered the handle.
    const activeHandleElementRef = useRef<HTMLElement | null>(null);

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

    /** Column's currently painted width (ahead of React mid-drag). `undefined` if it has none, never zero, to avoid collapsing it. */
    const readColumnWidth = (columnKey: string): number | undefined => {
        const writtenWidth = Number.parseFloat(scopeElementRef.current?.style.getPropertyValue(getColumnWidthVariableName(columnKey)) ?? '');

        return Number.isFinite(writtenWidth) ? writtenWidth : resolvedColumnWidths[columnKey];
    };

    /** Shows the line at a column edge and remembers the handle so scrolling can move the line along. */
    const revealIndicator = (handleElement: HTMLElement) => {
        activeHandleElementRef.current = handleElement;

        return drawIndicatorAtHandle(scopeElementRef.current, indicatorElementRef.current, handleElement);
    };

    const hideIndicator = () => {
        // A drag that has left the handle behind still shows where the edge is going.
        if (dragRef.current) {
            return;
        }

        activeHandleElementRef.current = null;
        setScopeProperty(RESIZE_INDICATOR_OPACITY_VARIABLE, INDICATOR_OPACITY.HIDDEN);
    };

    /** Paying columns with their painted widths. Unreadable ones are skipped rather than pinned at zero. */
    const readAbsorberWidths = (column: ResizableColumn): AbsorberWidths => {
        const columnKeys: string[] = [];
        const widths: number[] = [];

        for (const absorberColumnKey of column.absorberColumnKeys) {
            const width = readColumnWidth(absorberColumnKey);

            if (width === undefined) {
                continue;
            }

            columnKeys.push(absorberColumnKey);
            widths.push(width);
        }

        return {columnKeys, widths};
    };

    /** Sets a column's width, taking the difference out of later columns. Used by drag, click and arrow keys. */
    const applyColumnWidths = (column: ResizableColumn, width: number, startWidth: number, absorberStartWidths: AbsorberWidths) => {
        writeColumnWidth(column.columnKey, width);

        const absorbedWidths = getAbsorbedColumnWidths(absorberStartWidths.widths, width - startWidth);

        for (const [index, absorberColumnKey] of absorberStartWidths.columnKeys.entries()) {
            const absorbedWidth = absorbedWidths.at(index);

            if (absorbedWidth === undefined) {
                continue;
            }

            writeColumnWidth(absorberColumnKey, absorbedWidth);
        }
    };

    /** Stores only the dragged column; the resolver re-derives the payers, and storing them would mark them as user-sized. */
    const commitColumnWidth = (columnKey: string, width: number) => {
        if (!columnResizingID) {
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

        clearColumnWidth(column.columnKey);
        clearTableColumnWidth(columnResizingID, column.columnKey);
    };

    /** Keyboard stand-in for click/double-click: toggles between fitted and released. */
    const toggleFitToContent = (column: ResizableColumn) => {
        const contentWidth = column.contentWidth === undefined ? undefined : clampColumnWidth(column.contentWidth);

        if (contentWidth !== undefined && columnWidthOverrides?.[column.columnKey] !== contentWidth) {
            fitToContent(column);
            return;
        }

        releaseToBaseWidth(column);
    };

    /** Ends the drag and stores its width. Shared by pointerup, lost capture and cancel. */
    const endDrag = (drag: Drag) => {
        dragRef.current = null;
        document.body.style.cursor = '';

        const width = readColumnWidth(drag.column.columnKey) ?? drag.startWidth;

        if (width !== drag.startWidth) {
            commitColumnWidth(drag.column.columnKey, width);
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
        const startIndicatorLeft = revealIndicator(event.currentTarget) ?? 0;
        const startWidth = readColumnWidth(column.columnKey) ?? 0;

        dragRef.current = {
            column,
            startClientX: event.clientX,
            startWidth,
            width: startWidth,
            absorberStartWidths: readAbsorberWidths(column),
            startIndicatorLeft,
            hasMovedPointer: false,
        };
        document.body.style.cursor = 'col-resize';
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;

        if (!drag) {
            return;
        }

        // Tracked explicitly so a drag that returns to its start isn't a click. A few px of slop so clicks don't read as tiny drags.
        drag.hasMovedPointer = drag.hasMovedPointer || Math.abs(event.clientX - drag.startClientX) > DRAG_SLOP;

        // Nothing is written until the pointer has travelled far enough to mean it, so a click leaves the column
        // exactly where it was for the fit to size it from.
        if (!drag.hasMovedPointer) {
            return;
        }

        const width = clampColumnWidth(drag.startWidth + (event.clientX - drag.startClientX));

        // The only writes during a drag. The line follows the clamped width, not the pointer.
        applyColumnWidths(drag.column, width, drag.startWidth, drag.absorberStartWidths);
        drag.width = width;
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

        const startWidth = readColumnWidth(column.columnKey) ?? 0;
        const width = clampColumnWidth(startWidth + step);

        applyColumnWidths(column, width, startWidth, readAbsorberWidths(column));
        commitColumnWidth(column.columnKey, width);

        // The handle has moved with the column, so the line is re-read from it rather than stepped along with it.
        revealIndicator(event.currentTarget);
    };

    // Sideways scroll moves the edge but not the line, so reposition it. Capture phase since `scroll` doesn't bubble and the
    // scrolling element varies by layout; registered once as it only touches the DOM.
    useEffect(() => {
        const redrawIndicator = () => {
            const handleElement = activeHandleElementRef.current;

            if (!handleElement) {
                return;
            }

            const left = drawIndicatorAtHandle(scopeElementRef.current, indicatorElementRef.current, handleElement);
            const drag = dragRef.current;

            // A drag moves the line by however much the column has grown since it started, so where it started has to
            // be re-read from where the edge is now rather than kept from before the scroll.
            if (drag && left !== undefined) {
                drag.startIndicatorLeft = left - (drag.width - drag.startWidth);
            }
        };

        document.addEventListener('scroll', redrawIndicator, {capture: true, passive: true});

        return () => document.removeEventListener('scroll', redrawIndicator, {capture: true});
    }, []);

    // Unmounting mid-drag would otherwise leave the resize cursor on the document and a dangling drag.
    useEffect(
        () => () => {
            dragRef.current = null;
            document.body.style.cursor = '';
        },
        [],
    );

    // Syncs resolved widths into the properties for unpinned columns, so resize/data changes still apply. No deps since widths are a
    // new object every render; diffing against the last write avoids DOM churn.
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
            // Overhangs by half the column gap so the strip is centred between columns. Every handle has a next column, since the last one is headless.
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
