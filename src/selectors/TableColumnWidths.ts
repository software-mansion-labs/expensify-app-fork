import type ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxValues} from '@src/ONYXKEYS';

import type {OnyxEntry} from 'react-native-onyx';

type TableColumnWidths = OnyxValues[typeof ONYXKEYS.TABLE_COLUMN_WIDTHS];

/**
 * The widths stored for one table, out of the record holding every table's.
 *
 * Every table subscribes to the same key, and a single drag rewrites its root object, so without narrowing to one
 * table's entry a resize in any table would re-render all of them. The entry a table reads is untouched by a merge into
 * a different table's, so this returns the same object it did before and the subscriber stays put.
 */
const tableColumnWidthsSelector = (columnResizingID: string | undefined) => (tableColumnWidths: OnyxEntry<TableColumnWidths>) =>
    columnResizingID ? tableColumnWidths?.[columnResizingID] : undefined;

// eslint-disable-next-line import/prefer-default-export
export {tableColumnWidthsSelector};
