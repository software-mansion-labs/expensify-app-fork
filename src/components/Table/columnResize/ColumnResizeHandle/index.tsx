import type {ColumnResizeHandleProps} from '@components/Table/columnResize/types';

import React from 'react';

/**
 * Invisible drag strip over a column's right edge, inside its header cell; the visible line is `ColumnResizeIndicator`.
 * Renders nothing for non-draggable columns. A plain `div` because it relies on DOM pointer capture and focus handling.
 */
function ColumnResizeHandle({columnResize, columnKey}: ColumnResizeHandleProps) {
    const column = columnResize?.columns.find((resizableColumn) => resizableColumn.columnKey === columnKey);

    if (!columnResize || !column) {
        return null;
    }

    return <div {...columnResize.getHandleProps(column)} />;
}

export default ColumnResizeHandle;
