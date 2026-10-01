import {RESIZE_GRIP_OPACITY_VARIABLE} from '@components/Table/columnResize/columnWidthExpressions';
import type {ColumnResizeHandleProps} from '@components/Table/columnResize/types';

import useTheme from '@hooks/useTheme';

import CONST from '@src/CONST';

import React from 'react';

const {INDICATOR_WIDTH, GRIP_HEIGHT} = CONST.TABLES.COLUMN_RESIZE;

/**
 * Drag strip over a column's right edge, inside its header cell; the line down the table is `ColumnResizeIndicator`.
 * Carries a short mark shown while the header is hovered, so the user can find which edges drag.
 * Renders nothing for non-draggable columns. A plain `div` because it relies on DOM pointer capture and focus handling.
 */
function ColumnResizeHandle({columnResize, columnKey}: ColumnResizeHandleProps) {
    const theme = useTheme();
    const column = columnResize?.columns.find((resizableColumn) => resizableColumn.columnKey === columnKey);

    if (!columnResize || !column) {
        return null;
    }

    return (
        <div {...columnResize.getHandleProps(column)}>
            <div
                aria-hidden
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: INDICATOR_WIDTH,
                    height: GRIP_HEIGHT,
                    borderRadius: INDICATOR_WIDTH / 2,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: theme.icon,
                    opacity: `var(${RESIZE_GRIP_OPACITY_VARIABLE}, 0)`,
                    transition: 'opacity 150ms',
                    pointerEvents: 'none',
                }}
            />
        </div>
    );
}

export default ColumnResizeHandle;
