import type ChildrenProps from '@src/types/utils/ChildrenProps';

import type {ColumnResizeController} from './useColumnResize/types';

/**
 * The widths the user dragged a table's columns to, keyed by column key. A column absent from this is sized from its
 * content by the resolver, so a table only ever stores the columns the user actually touched and a column added later
 * still sizes itself.
 */
type ColumnWidthOverrides = Record<string, number>;

/** A column whose right edge the user can drag. */
type ResizableColumn = {
    /** The column's key, which also names the custom property its width is read from. */
    columnKey: string;

    /** The column's heading, used to name its edge for assistive technology. */
    columnLabel: string;

    /**
     * Width the column's content needs, which is what a click on its edge sizes the column to.
     *
     * `undefined` for a column whose content can't be measured — one that declared neither a width nor a way to read
     * the text it renders. Clicking such a column's edge does nothing, since "as wide as its content" isn't a width
     * anything here can name. Double-clicking it still releases it back to automatic sizing.
     */
    contentWidth?: number;

    /**
     * Keys of the columns that pay for this one, in render order: the columns after it that still share the row —
     * neither sized by the user nor declaring a width of their own.
     *
     * Empty when nothing after this column can give width up. Dragging it then takes the row past the table's width
     * and starts the horizontal scroller rather than moving another column.
     */
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
