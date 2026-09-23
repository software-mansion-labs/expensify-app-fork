import type ChildrenProps from '@src/types/utils/ChildrenProps';

import type {ColumnResizeController} from './useColumnResize/types';

/** User-dragged widths by column key. Absent columns are sized from content, so only touched columns get stored. */
type ColumnWidthOverrides = Record<string, number>;

/** A column whose right edge the user can drag. */
type ResizableColumn = {
    /** The column's key, which also names the custom property its width is read from. */
    columnKey: string;

    /** The column's heading, used to name its edge for assistive technology. */
    columnLabel: string;

    /** Content width a click on the edge fits to. `undefined` when unmeasurable, making the click a no-op. */
    contentWidth?: number;

    /** Keys of later columns that pay for this one, in render order. Empty means resizing it overflows the table and scrolls. */
    absorberColumnKeys: string[];
};

/** Props shared by the three pieces that only exist while a table is resizable. */
type ColumnResizeProps = {
    /** The controller the piece reads from. `undefined` when the table isn't resizable, and then nothing renders. */
    columnResize: ColumnResizeController | undefined;
};

type ColumnResizeHandleProps = ColumnResizeProps & {
    /** The column this handle resizes. Its edge is the right edge of the cell the handle renders in. */
    columnKey: string;
};

type ColumnResizeScopeProps = ChildrenProps & {
    /** Receives the element the columns' width custom properties are written on. Omitted when the table isn't resizable. */
    onScopeElement?: (element: HTMLElement | null) => void;
};

export type {ColumnResizeHandleProps, ColumnResizeProps, ColumnResizeScopeProps, ColumnWidthOverrides, ResizableColumn};
