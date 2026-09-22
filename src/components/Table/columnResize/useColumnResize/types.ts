import type {ColumnWidthOverrides, ResizableColumn} from '@components/Table/columnResize/types';

import type React from 'react';

type UseColumnResizeParams = {
    /**
     * The key this table's column widths persist under. `undefined` leaves resizing off, which is the case on native,
     * on narrow layouts, and for every table that hasn't opted in.
     */
    columnResizingID: string | undefined;

    /** The columns whose right edge the user can drag, in the order they are rendered. */
    columns: ResizableColumn[];

    /**
     * Keys of the columns a drag freezes where they are, so the columns the user never touched don't re-share the row
     * and slide out from under the result they were looking at. Neither a subset nor a superset of the draggable
     * columns: a column with no heading can't be dragged but still shares the row, and a column that declared its own
     * width can be dragged but never shared it.
     */
    columnKeysToFreeze: string[];

    /** What each column resolved to, which is the width a drag on its edge starts from. */
    resolvedColumnWidths: Record<string, number>;

    /** Widths the user already dragged this table's columns to. */
    columnWidthOverrides: ColumnWidthOverrides | undefined;

    /** Space between two columns, so a handle can be centered in it rather than on one column's edge. */
    columnGap: number;
};

/** The DOM props one resize handle renders with. Everything the interaction needs lives in here. */
type ColumnResizeHandleDOMProps = React.HTMLAttributes<HTMLDivElement> & {
    tabIndex: number;
};

type ColumnResizeController = {
    /**
     * Attached to the element the columns' width custom properties are written on. The header and every row inherit
     * from it, so one write repaints all of them.
     */
    setScopeElement: (element: HTMLElement | null) => void;

    /**
     * Attached to the line drawn at the edge being hovered or dragged. Its containing block is what the line's
     * position is measured against, so the line lands on the edge and starts at the header row.
     */
    setIndicatorElement: (element: HTMLElement | null) => void;

    /** The columns whose right edge the user can drag, in the order they are rendered. */
    columns: ResizableColumn[];

    /** Everything a column's handle renders with: its position within the column's own header cell, and its handlers. */
    getHandleProps: (column: ResizableColumn) => ColumnResizeHandleDOMProps;
};

export type {ColumnResizeController, ColumnResizeHandleDOMProps, UseColumnResizeParams};
