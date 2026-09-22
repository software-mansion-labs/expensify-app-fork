import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

/**
 * Stores the widths the user dragged a table's columns to, so it lays out the same way the next time it is opened.
 *
 * Written once a drag ends rather than while it runs: the drag itself repaints from a CSS custom property and never
 * touches Onyx, so persisting per pointer frame would be writing hundreds of values nobody reads.
 *
 * A drag commits the column it moved together with every other column frozen where it currently sits, because the
 * alternative is the rest of the table re-sharing the row the moment the drag ends: the width the user took has to come
 * from somewhere, and a column still sized from its content would hand it over and slide out from under them. One write
 * rather than one per column, so the table is laid out again once.
 */
function setTableColumnWidths(columnResizingID: string, widths: Record<string, number>) {
    Onyx.merge(ONYXKEYS.TABLE_COLUMN_WIDTHS, {[columnResizingID]: widths});
}

/** Returns a column to being sized from its content. */
function clearTableColumnWidth(columnResizingID: string, columnKey: string) {
    Onyx.merge(ONYXKEYS.TABLE_COLUMN_WIDTHS, {[columnResizingID]: {[columnKey]: null}});
}

export {clearTableColumnWidth, setTableColumnWidths};
