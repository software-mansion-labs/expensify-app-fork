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

    /**
     * The column that takes the row's leftover width, if the table has one. It is where room a narrowed column gives
     * up goes, so it never also pays a share of a drag.
     */
    growableColumnKey: string | undefined;
};

type ResolvedOverriddenColumnWidths = {
    /** What each column is laid out at once every stored width has been applied. */
    columnWidths: Record<string, number>;

    /** Keys of the columns that pay for the column at the same index, in render order. */
    payingColumnKeysByIndex: string[][];
};

/**
 * Reads a stored column width back as a whole number of px.
 *
 * Deliberately neither floored at the narrowest a column may be *dragged* to nor capped at the widest. Those bounds
 * belong to the gesture — they stop one drag collapsing a column or pushing every column after it out of reach — and a
 * stored width doesn't only come from a gesture. It is also how the table remembers a column it froze at whatever the
 * resolver or the column's own style had given it, which is legitimately narrower than a draggable minimum for an icon
 * column and legitimately wider than a draggable maximum on a wide window.
 */
function getStoredColumnWidth(width: number): number {
    return Math.max(Math.round(width), 0);
}

/**
 * Applies every width the user dragged to the widths the columns otherwise resolved to.
 *
 * Each stored width is applied in render order, and what it costs comes equally out of the columns after it that pay —
 * the same shares the drag itself applied, from the same helper, so the columns don't jump when a drag is released.
 * Reading a stored column's own width off the base is safe because a stored column never pays for another one, so
 * nothing handled before it can have moved it.
 *
 * Who pays: the columns still laid out by sharing the row. A column that declared its own width never shared it, a
 * column the user already sized keeps what they gave it, and the growable column is where whatever is left over at the
 * end of the row goes rather than a share of a drag.
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
