import type {ColumnResizeHandleProps} from '@components/Table/columnResize/types';

import React from 'react';

/**
 * The invisible strip over one column's right edge, rendered inside that column's own header cell.
 *
 * Nothing is drawn here: the strip only carries the resize cursor and the pointer and keyboard handlers, while the line
 * the user sees is drawn down the whole table by `ColumnResizeIndicator`. That split is what lets the line run past the
 * header without the header having to be the element the pointer is over.
 *
 * Rendering inside the cell rather than at a computed offset into the header means nothing has to work out where the
 * column ends: the cell already is where it ends.
 *
 * Renders nothing for a column the user can't drag — one with no heading, and the column at the end of the row that
 * fills whatever the others leave — because the controller only knows about the columns that have an edge to take hold
 * of.
 *
 * A plain `div` rather than a `View`, because the interaction is built on DOM pointer capture and on the browser's own
 * focus and key handling, none of which a react-native view exposes.
 */
function ColumnResizeHandle({columnResize, columnKey}: ColumnResizeHandleProps) {
    const column = columnResize?.columns.find((resizableColumn) => resizableColumn.columnKey === columnKey);

    if (!columnResize || !column) {
        return null;
    }

    return <div {...columnResize.getHandleProps(column)} />;
}

export default ColumnResizeHandle;
