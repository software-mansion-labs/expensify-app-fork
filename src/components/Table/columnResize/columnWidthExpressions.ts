/**
 * The CSS custom properties a resizable table reads its widths from, and the expressions built over them.
 *
 * A resizable column takes its width from a custom property rather than from a number baked into its style, so a drag
 * rewrites one property on one node and lets the browser repaint the header and every row from it. React renders
 * nothing between pointerdown and pointerup, which is what keeps a virtualized table with a heavy cell per column from
 * dropping frames mid-drag.
 */

import type {DimensionValue, ViewStyle} from 'react-native';

/** Prefix of the custom property a resizable column reads its width from. */
const COLUMN_WIDTH_VARIABLE_PREFIX = '--table-column-width-';

/**
 * Custom property the resize indicator reads its horizontal position from.
 *
 * A length rather than a sum over the widths, because the handle sits in its own column's header cell and so already
 * is where the column ends — nothing has to work out where that is from the tracks.
 */
const RESIZE_INDICATOR_LEFT_VARIABLE = '--table-resize-indicator-left';

/** Custom property the resize indicator reads its top from, measured off the header row rather than declared. */
const RESIZE_INDICATOR_TOP_VARIABLE = '--table-resize-indicator-top';

/** Custom property the resize indicator reads its bottom from, measured off the last row rather than declared. */
const RESIZE_INDICATOR_BOTTOM_VARIABLE = '--table-resize-indicator-bottom';

/** Custom property the resize indicator reads its opacity from, so hovering an edge never re-renders the table. */
const RESIZE_INDICATOR_OPACITY_VARIABLE = '--table-resize-indicator-opacity';

/**
 * Names the custom property a column's width lives in.
 *
 * Column keys are code-defined identifiers, but one is interpolated into a CSS name here, so anything invalid in one is
 * replaced rather than silently producing a property nothing can read.
 */
function getColumnWidthVariableName(columnKey: string): string {
    return `${COLUMN_WIDTH_VARIABLE_PREFIX}${columnKey.replaceAll(/[^\w-]/g, '_')}`;
}

/**
 * The width a resizable column lays out at: its custom property, falling back to what the resolver gave it.
 *
 * The fallback is what paints before anything has written the property — the first render, and every render after a
 * reload — so a stored width still has to reach the resolver rather than being applied through the property alone.
 */
function getColumnWidthValue(columnKey: string, resolvedWidth: number): string {
    return `var(${getColumnWidthVariableName(columnKey)}, ${resolvedWidth}px)`;
}

/**
 * The track a column lays out at when it is the one that takes the row's leftover width: never narrower than the width
 * it resolved to, and growing into whatever the columns before it don't use.
 *
 * This is how the run of headless columns at the end of a row — the arrow that opens it, a menu, an icon — stays
 * pinned to the table's right edge. The table always spans the width it is given, so narrowing a column leaves room
 * over; without somewhere to put it that room collects after the last column and the arrow drifts left with it.
 */
function getGrowableColumnTrack(widthValue: string): string {
    return `minmax(${widthValue}, 1fr)`;
}

/**
 * What a resizable table's columns add up to: the columns plus whatever chrome sits around them, summed as an
 * expression so a drag changes it without React rendering anything, and floored at the room the table is given.
 *
 * The floor is what keeps the table full-width: columns adding up to less than the table leave it at exactly its own
 * width, and the room a narrowed column gave up goes to the growable track rather than being taken off the table.
 * Columns adding up to more take the row past the table's width, and it scrolls horizontally.
 *
 * `floor` is a CSS length rather than always `100%`, because the two boxes this sizes are measured against different
 * containing blocks. The scrolled content's block is the table, so `100%` is the table's width; a row's block is the
 * cell the list positions it in, which is that width *plus* the row's own margin, so `100%` there would floor the row
 * 40px too wide and make it overhang its cell.
 */
function getColumnsWidthExpression(columnWidthValues: string[], chromeWidth: number, floor: string): string {
    if (columnWidthValues.length === 0) {
        return `max(${floor}, ${chromeWidth}px)`;
    }

    return `max(${floor}, calc(${columnWidthValues.join(' + ')} + ${chromeWidth}px))`;
}

/**
 * A `width`/`minWidth` for a value that is a plain number of px for a content-sized table and a `calc()` over the
 * columns' custom properties for a resizable one.
 *
 * react-native-web passes a string through to CSS verbatim, but `DimensionValue` has no way to describe an arbitrary
 * expression, so the assertion is kept here rather than repeated at every call site.
 */
function getColumnsWidthStyle(width: number | string): ViewStyle {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- see above
    return {width: width as DimensionValue};
}

/** `minWidth` counterpart of `getColumnsWidthStyle`, for holding a scroller's content open at the columns' width. */
function getColumnsMinWidthStyle(minWidth: number | string): ViewStyle {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- see `getColumnsWidthStyle`
    return {minWidth: minWidth as DimensionValue};
}

export {
    RESIZE_INDICATOR_BOTTOM_VARIABLE,
    RESIZE_INDICATOR_LEFT_VARIABLE,
    RESIZE_INDICATOR_OPACITY_VARIABLE,
    RESIZE_INDICATOR_TOP_VARIABLE,
    getColumnWidthValue,
    getColumnWidthVariableName,
    getColumnsMinWidthStyle,
    getColumnsWidthExpression,
    getColumnsWidthStyle,
    getGrowableColumnTrack,
};
