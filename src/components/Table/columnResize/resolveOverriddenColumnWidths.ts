import type {ColumnWidthOverrides} from './types';

import getAbsorbedColumnWidths from './getAbsorbedColumnWidths';

/** What the resolver needs to know about a column to work out who pays for whom. */
type OverridableColumn = {
    /** The column's key, which is what a stored width is filed under. */
    key: string;

    /** Whether the column declared a width of its own, which takes it out of sharing the row. */
    hasDeclaredWidth: boolean;
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

    /** Keys of the columns that pay for the column at the same index, in render order. */
    payingColumnKeysByIndex: string[][];
};

/**
 * Reads a stored width as whole px. Not clamped to drag bounds: stored widths can also be frozen resolved widths,
 * which may legitimately fall outside them.
 */
function getStoredColumnWidth(width: number): number {
    return Math.max(Math.round(width), 0);
}

/**
 * Applies stored widths in render order, each paid equally by the later columns still sharing the row (not fixed, user-sized
 * or growable). Uses the same helper as the drag, so columns don't jump on release.
 */
function resolveOverriddenColumnWidths({columns, baseColumnWidths, columnWidthOverrides, growableColumnKey}: ResolveOverriddenColumnWidthsParams): ResolvedOverriddenColumnWidths {
    const canColumnPay = columns.map((column) => !column.hasDeclaredWidth && columnWidthOverrides?.[column.key] === undefined && column.key !== growableColumnKey);

    const payingColumnKeysByIndex = columns.map((column, index) =>
        columns
            .slice(index + 1)
            .filter((payingColumn, offset) => !!canColumnPay.at(index + 1 + offset))
            .map((payingColumn) => payingColumn.key),
    );

    const columnWidths = {...baseColumnWidths};

    for (const [index, column] of columns.entries()) {
        const overriddenWidth = columnWidthOverrides?.[column.key];

        if (overriddenWidth === undefined) {
            continue;
        }

        const width = getStoredColumnWidth(overriddenWidth);
        const payingColumnKeys = payingColumnKeysByIndex.at(index) ?? [];
        const absorbedWidths = getAbsorbedColumnWidths(
            payingColumnKeys.map((columnKey) => columnWidths[columnKey] ?? 0),
            width - (columnWidths[column.key] ?? 0),
        );

        columnWidths[column.key] = width;

        for (const [payingIndex, payingColumnKey] of payingColumnKeys.entries()) {
            columnWidths[payingColumnKey] = absorbedWidths.at(payingIndex) ?? 0;
        }
    }

    return {columnWidths, payingColumnKeysByIndex};
}

export default resolveOverriddenColumnWidths;
export type {OverridableColumn};
