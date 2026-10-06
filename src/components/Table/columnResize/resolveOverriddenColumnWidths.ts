import type {ColumnAbsorber, ColumnWidthOverrides} from './types';

import getAbsorbedColumnWidths from './getAbsorbedColumnWidths';

/** What the resolver needs to know about a column to work out who pays for whom. */
type OverridableColumn = {
    /** The column's key, which is what a stored width is filed under. */
    key: string;

    /** Whether the column declared a width of its own, which takes it out of sharing the row. */
    hasDeclaredWidth: boolean;

    /** Width its content and header need, which paying for another column never squeezes it below. `undefined` when unknown. */
    fitWidth: number | undefined;
};

type ResolveOverriddenColumnWidthsParams = {
    /** Every column, in the order the header and the rows render them. */
    columns: OverridableColumn[];

    /** What each column is laid out at before any width the user dragged is applied. */
    baseColumnWidths: Record<string, number>;

    /** Widths the user already dragged this table's columns to. */
    columnWidthOverrides: ColumnWidthOverrides | undefined;

    /** Column absorbing the row's leftover width, if any; it never pays a share of a drag. */
    growableColumnKey: string | undefined;
};

type ResolvedOverriddenColumnWidths = {
    /** What each column is laid out at once every stored width has been applied. */
    columnWidths: Record<string, number>;

    /** The columns that pay for the column at the same index, in render order. */
    payingColumnsByIndex: ColumnAbsorber[][];
};

/**
 * Reads a stored width as whole px. Not clamped to drag bounds: stored widths can also be frozen resolved widths,
 * which may legitimately fall outside them.
 */
function getStoredColumnWidth(width: number): number {
    return Math.max(Math.round(width), 0);
}

/**
 * Applies stored widths in render order, each paid by the later columns still sharing the row (not fixed, user-sized or
 * growable) down to their content width. Uses the same helper as the drag, so columns don't jump on release.
 */
function resolveOverriddenColumnWidths({columns, baseColumnWidths, columnWidthOverrides, growableColumnKey}: ResolveOverriddenColumnWidthsParams): ResolvedOverriddenColumnWidths {
    const canColumnPay = columns.map((column) => !column.hasDeclaredWidth && columnWidthOverrides?.[column.key] === undefined && column.key !== growableColumnKey);

    const payingColumnsByIndex = columns.map((column, index) =>
        columns
            .slice(index + 1)
            .filter((payingColumn, offset) => !!canColumnPay.at(index + 1 + offset))
            .map((payingColumn) => ({columnKey: payingColumn.key, minWidth: payingColumn.fitWidth ?? 0})),
    );

    const columnWidths = {...baseColumnWidths};

    for (const [index, column] of columns.entries()) {
        const overriddenWidth = columnWidthOverrides?.[column.key];

        // A declared width can't be dragged, so a width stored for it is stale (stored before the column stopped being resizable).
        if (overriddenWidth === undefined || column.hasDeclaredWidth) {
            continue;
        }

        const width = getStoredColumnWidth(overriddenWidth);
        const payingColumns = payingColumnsByIndex.at(index) ?? [];
        const absorbedWidths = getAbsorbedColumnWidths(
            payingColumns.map((payingColumn) => ({startWidth: columnWidths[payingColumn.columnKey] ?? 0, minWidth: payingColumn.minWidth})),
            width - (columnWidths[column.key] ?? 0),
        );

        columnWidths[column.key] = width;

        for (const [payingIndex, payingColumn] of payingColumns.entries()) {
            columnWidths[payingColumn.columnKey] = absorbedWidths.at(payingIndex) ?? 0;
        }
    }

    return {columnWidths, payingColumnsByIndex};
}

export default resolveOverriddenColumnWidths;
export type {OverridableColumn};
