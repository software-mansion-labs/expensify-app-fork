import useThemeStyles from '@hooks/useThemeStyles';

import measureTextWidth, {canMeasureText} from '@libs/measureTextWidth';
import createWidestTextMeasurer from '@libs/measureTextWidth/widestTextMeasurer';

import {fontScale} from '@styles/typography';
import variables from '@styles/variables';

import CONST from '@src/CONST';

import type {DynamicColumnConstraints} from './calculateDynamicColumnWidths';
import type {ColumnWidthOverrides, ResizableColumn} from './columnResize/types';
import type {TableColumn, TableData} from './types';

import calculateDynamicColumnWidths, {distributeEqualWidths} from './calculateDynamicColumnWidths';
import {getColumnWidthValue, getColumnsWidthExpression, getGrowableColumnTrack} from './columnResize/columnWidthExpressions';
import resolveOverriddenColumnWidths from './columnResize/resolveOverriddenColumnWidths';

const {MIN_FREE_TEXT_COLUMN_WIDTH} = CONST.TABLES.DYNAMIC_COLUMNS;

type UseDynamicColumnWidthsParams<DataType extends TableData, ColumnKey extends string> = {
    /** Column configuration for the table. */
    columns: Array<TableColumn<ColumnKey, DataType>>;

    /**
     * The table's rows. This is the unprocessed data rather than the filtered/sorted result, so column widths stay put
     * while the user searches or filters instead of reflowing on every keystroke.
     */
    data: DataType[];

    /** Measured width of the area the table renders into, including the rows' own margin and padding. */
    tableWidth: number;

    /** Whether dynamic sizing should run at all. Callers pass `false` on narrow layouts and when they haven't opted in. */
    isEnabled: boolean;

    /** Whether the leading selection checkbox column is rendered, since it takes width from the data columns. */
    hasSelectionColumn: boolean;

    /** Whether columns are resizable; forces px tracks from custom properties, since a drag needs a starting width. */
    isColumnResizingEnabled: boolean;

    /** Widths the user already dragged this table's columns to. Each one is honored as if the column declared it. */
    columnWidthOverrides: ColumnWidthOverrides | undefined;
};

type UseDynamicColumnWidthsResult = {
    /** Grid tracks for the header and rows. `undefined` keeps the static tracks (fixed widths and `1fr` shares). */
    gridTemplateColumns: string[] | undefined;

    /** Row width when columns overflow the table. A CSS expression while resizable, so drag overflow scrolls without a re-render. */
    scrollWidth: number | string | undefined;

    /**
     * Row box width (background, separators, corners) while resizable, else `undefined`. Needed since the list sizes rows from
     * a measurement. Unlike `scrollWidth`, excludes the row's outer margin.
     */
    rowWidth: string | undefined;

    /** The columns whose right edge the user can drag, in column order. Empty unless the columns are resizable. */
    resizableColumns: ResizableColumn[];

    /** What each column resolved to, which is the width a drag on its edge starts from. */
    resolvedColumnWidths: Record<string, number>;
};

/**
 * First column of the trailing headless run (arrow, menu, icon), which absorbs leftover width to stay pinned right.
 * `undefined` when the last column has a heading; leftover room then stays empty.
 */
function getGrowableColumnKey<DataType extends TableData, ColumnKey extends string>(columns: Array<TableColumn<ColumnKey, DataType>>): ColumnKey | undefined {
    let growableColumnKey: ColumnKey | undefined;

    for (let index = columns.length - 1; index >= 0; index--) {
        const column = columns.at(index);

        if (!column || column.label) {
            break;
        }

        growableColumnKey = column.key;
    }

    return growableColumnKey;
}

/**
 * Measures how wide a column's widest cell content renders, or `null` when the platform can't measure text.
 */
function measureColumnContentWidth<DataType extends TableData, ColumnKey extends string>(column: TableColumn<ColumnKey, DataType>, data: DataType[]): number | null {
    const dynamicSizing = column.dynamicSizing;

    if (!dynamicSizing) {
        return 0;
    }

    const measurer = createWidestTextMeasurer();

    for (const item of data) {
        for (const content of dynamicSizing.getContentToMeasure(item)) {
            measurer.add(content.text, {fontSize: content.fontSize, fontWeight: content.fontWeight});
        }
    }

    const widestContentWidth = measurer.getWidestWidth();

    if (widestContentWidth === null) {
        return null;
    }

    // Rounded up because the widths end up as whole px grid tracks. Rounding a fraction down would leave a column
    // narrower than the text it was sized to hold, and the browser would put an ellipsis on text that fits.
    return widestContentWidth === 0 ? 0 : Math.ceil(widestContentWidth + (dynamicSizing.extraWidth ?? 0));
}

/**
 * Measures how wide a column's header label renders, or `null` when the platform can't measure text. The label is
 * measured in the bold font the header uses while the column is sorted, so sorting a column never truncates its label.
 */
function measureHeaderLabelWidth(label: string, sortIconWidth: number): number | null {
    const width = measureTextWidth(label, {fontSize: fontScale.micro, fontWeight: '700'});

    if (width === null) {
        return null;
    }

    // Rounded up for the same reason as the cell content above.
    return width === 0 ? 0 : Math.ceil(width + sortIconWidth);
}

/**
 * Resolves the CSS grid tracks for a table whose columns are sized from their content.
 *
 * The tracks have to be identical for the header and every data row, because each row is its own grid: a content-based
 * CSS track (`max-content`) would resolve per row, leaving the columns out of line. So the widths are measured once and
 * shared, and the result is a plain track list the header and rows both render.
 *
 * Returns `undefined` when dynamic sizing doesn't apply: it isn't enabled, the table hasn't been measured yet, text
 * can't be measured (native), or the content already fits in equal columns. Callers then fall back to the table's
 * static tracks.
 */
function useDynamicColumnWidths<DataType extends TableData, ColumnKey extends string = string>({
    columns,
    data,
    tableWidth,
    isEnabled,
    hasSelectionColumn,
    isColumnResizingEnabled,
    columnWidthOverrides,
}: UseDynamicColumnWidthsParams<DataType, ColumnKey>): UseDynamicColumnWidthsResult {
    const styles = useThemeStyles();

    const noDynamicWidths: UseDynamicColumnWidthsResult = {gridTemplateColumns: undefined, scrollWidth: undefined, rowWidth: undefined, resizableColumns: [], resolvedColumnWidths: {}};

    // Checked before anything else, so native never walks the data to gather text that it can't measure anyway.
    if (!isEnabled || tableWidth <= 0 || !canMeasureText()) {
        return noDynamicWidths;
    }

    const dynamicColumns: Array<TableColumn<ColumnKey, DataType>> = [];

    // Fixed-width columns' base widths. Stored widths and their payers are applied further down.
    const fixedColumnWidths = new Map<ColumnKey, number>();
    let fixedColumnsWidth = 0;

    for (const column of columns) {
        // A column with a percentage or other non-numeric width can't be subtracted from the budget, so the whole
        // table keeps its static tracks rather than being laid out from a wrong budget.
        if (column.width !== undefined && typeof column.width !== 'number') {
            return noDynamicWidths;
        }

        if (typeof column.width === 'number') {
            fixedColumnWidths.set(column.key, column.width);
            fixedColumnsWidth += column.width;
        } else {
            dynamicColumns.push(column);
        }
    }

    if (dynamicColumns.length === 0) {
        return noDynamicWidths;
    }

    const selectionColumnWidth = hasSelectionColumn ? variables.tableCheckboxColumnWidth : 0;
    const totalColumnCount = columns.length + (hasSelectionColumn ? 1 : 0);
    const totalGapWidth = Math.max(totalColumnCount - 1, 0) * styles.gap3.gap;
    const rowMarginWidth = styles.mh5.marginHorizontal * 2;
    const rowPaddingWidth = styles.ph3.paddingHorizontal * 2;
    const rowChromeWidth = rowMarginWidth + rowPaddingWidth;
    const availableWidth = tableWidth - rowChromeWidth - totalGapWidth - fixedColumnsWidth - selectionColumnWidth;

    if (availableWidth <= 0) {
        return noDynamicWidths;
    }

    const constraints: DynamicColumnConstraints[] = [];
    const contentWidthByColumnKey = new Map<ColumnKey, number>();

    for (const column of dynamicColumns) {
        const contentWidth = measureColumnContentWidth(column, data);
        const headerLabelWidth = measureHeaderLabelWidth(column.label, variables.iconSizeExtraSmall + styles.ml1.marginLeft);

        // Text measurement is unavailable (native), so the table keeps its static, content-independent tracks.
        if (contentWidth === null || headerLabelWidth === null) {
            return noDynamicWidths;
        }

        // A column has to fit its header label as well as its cells, so the label is part of what its content needs
        // rather than a separate floor.
        const columnContentWidth = Math.max(contentWidth, headerLabelWidth);

        // Only columns that can read their text get a content width; otherwise it'd just be the label, so clicking their edge does nothing.
        if (column.dynamicSizing) {
            contentWidthByColumnKey.set(column.key, columnContentWidth);
        }

        // A column holding a known, short set of values is never squeezed below its content, so it never truncates.
        // A free-text column is squeezed no further than a readable width, or its content when that is narrower.
        const readableWidth = MIN_FREE_TEXT_COLUMN_WIDTH + (column.dynamicSizing?.extraWidth ?? 0);
        const defaultMinWidth = column.dynamicSizing?.shouldFitContent ? columnContentWidth : Math.min(columnContentWidth, readableWidth);

        constraints.push({
            contentWidth: columnContentWidth,
            minWidth: column.dynamicSizing?.minWidth ?? defaultMinWidth,
            // Uncapped by default, so the table scrolls rather than truncating. A cap also can't be derived from the
            // available width without breaking the sizing: a column capped at its equal share looks like it fits in
            // one, so the columns would be left equal and the long column would stay truncated. Columns that should
            // truncate rather than widen the table set `maxWidth` themselves.
            maxWidth: column.dynamicSizing?.maxWidth ?? Number.POSITIVE_INFINITY,
        });
    }

    const {widths, shouldScrollHorizontally} = calculateDynamicColumnWidths(constraints, availableWidth);

    // The columns fit equally, which is exactly what the static `1fr` tracks already do — unless the user can drag
    // them, which needs each column to resolve to a width the drag can start from.
    if (widths.length === 0 && !isColumnResizingEnabled) {
        return noDynamicWidths;
    }

    const resolvedWidths = widths.length > 0 ? widths : distributeEqualWidths(dynamicColumns.length, availableWidth);

    // Base widths keyed by column, avoiding a mutated index inside a map callback (which React Compiler can't compile).
    const resolvedColumnWidths: Record<string, number> = {};
    for (const [index, column] of dynamicColumns.entries()) {
        resolvedColumnWidths[column.key] = resolvedWidths.at(index) ?? 0;
    }

    for (const [columnKey, fixedWidth] of fixedColumnWidths) {
        resolvedColumnWidths[columnKey] = fixedWidth;
    }

    if (!isColumnResizingEnabled) {
        const gridTemplateColumns = columns.map((column) => `${resolvedColumnWidths[column.key] ?? 0}px`);

        if (!shouldScrollHorizontally) {
            return {...noDynamicWidths, gridTemplateColumns, resolvedColumnWidths};
        }

        // Rows overflow, so scroll at their exact width. Includes the row margin, which stays inside the scrolled content, or the end clips.
        const scrollWidth = resolvedWidths.reduce((total, width) => total + width, 0) + fixedColumnsWidth + selectionColumnWidth + totalGapWidth + rowChromeWidth;

        return {...noDynamicWidths, gridTemplateColumns, scrollWidth, resolvedColumnWidths};
    }

    const growableColumnKey = getGrowableColumnKey(columns);

    const {columnWidths: overriddenColumnWidths, payingColumnKeysByIndex} = resolveOverriddenColumnWidths({
        columns: columns.map((column) => ({key: column.key, hasDeclaredWidth: typeof column.width === 'number'})),
        baseColumnWidths: resolvedColumnWidths,
        columnWidthOverrides,
        growableColumnKey,
    });

    // Each column's width as a value usable both as a track and in the row sum; resizable ones read a custom property with the resolved fallback.
    const columnWidthValues = columns.map((column) => getColumnWidthValue(column.key, overriddenColumnWidths[column.key] ?? 0));

    // The row's width is summed from the widths rather than from the tracks, so what the growable track grows into is
    // the room the row actually has and not room the sum went and asked for.
    const gridTemplateColumns = columnWidthValues.map((widthValue, index) => (columns.at(index)?.key === growableColumnKey ? getGrowableColumnTrack(widthValue) : widthValue));

    // Every width the row lays out, in the order the header and the rows render them. The selection checkbox takes a
    // column of the row like any other.
    const rowWidthValues = hasSelectionColumn ? [`${selectionColumnWidth}px`, ...columnWidthValues] : columnWidthValues;
    const resizableColumns: ResizableColumn[] = [];

    for (const [index, column] of columns.entries()) {
        // Headless columns (icon, checkbox, arrow) hold fixed content, so only headed ones get an edge, including the last:
        // widening it scrolls, narrowing it hands room to the growable column.
        if (!column.label) {
            continue;
        }

        resizableColumns.push({
            columnKey: column.key,
            columnLabel: column.label,
            // A column that declared a width has no content measurement, so a click on its edge puts it back to the
            // width it declared. A column with neither is left without one, and a click leaves it alone.
            contentWidth: contentWidthByColumnKey.get(column.key) ?? (typeof column.width === 'number' ? column.width : undefined),
            absorberColumnKeys: payingColumnKeysByIndex.at(index) ?? [],
        });
    }

    // Scroll at the live column sum, so a drag that exhausts the payers starts scrolling mid-drag; otherwise the sum is unchanged.
    return {
        gridTemplateColumns,
        scrollWidth: getColumnsWidthExpression(rowWidthValues, totalGapWidth + rowChromeWidth, '100%'),
        // The same sum without the row's outer margin, floored at the row's full-width box rather than at `100%` —
        // which for a row resolves against the cell the list positions it in, and so is already the margin too wide.
        rowWidth: getColumnsWidthExpression(rowWidthValues, totalGapWidth + rowPaddingWidth, `${tableWidth - rowMarginWidth}px`),
        resizableColumns,
        resolvedColumnWidths: overriddenColumnWidths,
    };
}

export default useDynamicColumnWidths;
