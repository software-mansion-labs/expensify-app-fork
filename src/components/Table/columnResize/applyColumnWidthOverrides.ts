import type {OverridableColumn} from './resolveOverriddenColumnWidths';
import type {ColumnWidthOverrides, ResizableColumn} from './types';

import {getColumnWidthValue} from './columnWidthExpressions';
import resolveOverriddenColumnWidths from './resolveOverriddenColumnWidths';

/** What resizing needs to know about a column, whatever lays the columns out. */
type ColumnWidthOverrideColumn = OverridableColumn & {
    /** The column's heading. Headless columns hold fixed-size content (icon, checkbox, arrow), so they get no edge. */
    label: string;

    /** Content width a click on the edge fits to. `undefined` when the column's text can't be measured. */
    contentWidth: number | undefined;
};

type ApplyColumnWidthOverridesParams = {
    /** Every column, in the order the header and the rows render them. */
    columns: ColumnWidthOverrideColumn[];

    /** What each column is laid out at before any width the user dragged is applied. */
    baseColumnWidths: Record<string, number>;

    /** Widths the user already dragged this table's columns to. */
    columnWidthOverrides: ColumnWidthOverrides | undefined;

    /** Column absorbing the row's leftover width, if any; it never pays a share of a drag. */
    growableColumnKey: string | undefined;
};

type AppliedColumnWidthOverrides = {
    /** What each column is laid out at once every stored width has been applied, which is also where a drag starts from. */
    columnWidths: Record<string, number>;

    /** Each column's width as a CSS value reading its custom property, falling back to `columnWidths`, in render order. */
    columnWidthValues: string[];

    /** The columns whose right edge the user can drag, in render order. */
    resizableColumns: ResizableColumn[];
};

/**
 * Applies the user's stored widths to a table's columns and works out which edges drag. Knows nothing of how the
 * columns are laid out, so a grid turns `columnWidthValues` into tracks and a flex row into each cell's basis.
 */
function applyColumnWidthOverrides({columns, baseColumnWidths, columnWidthOverrides, growableColumnKey}: ApplyColumnWidthOverridesParams): AppliedColumnWidthOverrides {
    const {columnWidths, payingColumnsByIndex} = resolveOverriddenColumnWidths({columns, baseColumnWidths, columnWidthOverrides, growableColumnKey});

    const columnWidthValues = columns.map((column) => getColumnWidthValue(column.key, columnWidths[column.key] ?? 0));
    const resizableColumns: ResizableColumn[] = [];

    for (const [index, column] of columns.entries()) {
        // Only headed, content-sized columns get an edge, including the last: widening it scrolls, narrowing it hands
        // room to the growable column. Columns that declared a width (switch, status, count) hold fixed-size content.
        if (!column.label || column.hasDeclaredWidth) {
            continue;
        }

        resizableColumns.push({
            columnKey: column.key,
            columnLabel: column.label,
            contentWidth: column.contentWidth,
            absorbers: payingColumnsByIndex.at(index) ?? [],
        });
    }

    return {columnWidths, columnWidthValues, resizableColumns};
}

export default applyColumnWidthOverrides;
export type {ColumnWidthOverrideColumn};
