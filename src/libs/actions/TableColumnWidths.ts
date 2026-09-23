import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

/**
 * Persists a dragged column's width, once the drag ends (the drag itself only touches CSS). Only the dragged column is
 * stored: payers are re-derived each render, and storing them would mark them as user-sized.
 */
function setTableColumnWidth(columnResizingID: string, columnKey: string, width: number) {
    Onyx.merge(ONYXKEYS.TABLE_COLUMN_WIDTHS, {[columnResizingID]: {[columnKey]: width}});
}

/** Returns a column to being sized from its content. */
function clearTableColumnWidth(columnResizingID: string, columnKey: string) {
    Onyx.merge(ONYXKEYS.TABLE_COLUMN_WIDTHS, {[columnResizingID]: {[columnKey]: null}});
}

export {clearTableColumnWidth, setTableColumnWidth};
