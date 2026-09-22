import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

/**
 * Stores the width the user dragged one of a table's columns to, so it lays out the same way the next time it is
 * opened.
 *
 * Written once a drag ends rather than while it runs: the drag itself repaints from a CSS custom property and never
 * touches Onyx, so persisting per pointer frame would be writing hundreds of values nobody reads.
 *
 * Only the dragged column is stored. What the columns after it gave up to pay for it is derived again on every render
 * from the same shares the drag applied, so storing it would both duplicate a derivable result and mark those columns
 * as ones the user had sized — which would take them out of paying for the next drag.
 */
function setTableColumnWidth(columnResizingID: string, columnKey: string, width: number) {
    Onyx.merge(ONYXKEYS.TABLE_COLUMN_WIDTHS, {[columnResizingID]: {[columnKey]: width}});
}

/** Returns a column to being sized from its content. */
function clearTableColumnWidth(columnResizingID: string, columnKey: string) {
    Onyx.merge(ONYXKEYS.TABLE_COLUMN_WIDTHS, {[columnResizingID]: {[columnKey]: null}});
}

export {clearTableColumnWidth, setTableColumnWidth};
