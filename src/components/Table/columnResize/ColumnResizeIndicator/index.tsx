import {
    RESIZE_INDICATOR_BOTTOM_VARIABLE,
    RESIZE_INDICATOR_LEFT_VARIABLE,
    RESIZE_INDICATOR_OPACITY_VARIABLE,
    RESIZE_INDICATOR_TOP_VARIABLE,
} from '@components/Table/columnResize/columnWidthExpressions';
import type {ColumnResizeProps} from '@components/Table/columnResize/types';

import useTheme from '@hooks/useTheme';

import CONST from '@src/CONST';

import React from 'react';

const {INDICATOR_WIDTH} = CONST.TABLES.COLUMN_RESIZE;

/**
 * The line drawn down the table at the column edge the user is hovering or dragging.
 *
 * It renders once, invisible, for the table's whole life: both where it sits and whether it can be seen come from CSS
 * custom properties the handles write straight to the DOM. So revealing the line, moving it between edges and following
 * a drag all happen without React rendering anything.
 *
 * It lives in the element wrapping the header and the rows rather than in the header itself, so it can run the full
 * height of the table from an edge that is only ever pointed at up in the header.
 *
 * A plain `div` because both its offsets and its opacity are references to custom properties, which CSS understands and
 * react-native's style types have no way to describe.
 */
function ColumnResizeIndicator({columnResize}: ColumnResizeProps) {
    const theme = useTheme();

    if (!columnResize) {
        return null;
    }

    return (
        <div
            ref={(element) => columnResize.setIndicatorElement(element)}
            aria-hidden
            style={{
                position: 'absolute',
                // The line runs from the top of the heading row to the bottom of the lowest row. Neither is where this
                // element's own box starts or ends — the table's box keeps going after the rows run out, and what sits
                // above the heading row depends on what the table scrolls — so the handles measure both and write them
                // here.
                top: `var(${RESIZE_INDICATOR_TOP_VARIABLE}, 0px)`,
                bottom: `var(${RESIZE_INDICATOR_BOTTOM_VARIABLE}, 0px)`,
                // The handles measure where their column's edge is and write it here, so the line only has to be
                // centred on it rather than started at it.
                left: `var(${RESIZE_INDICATOR_LEFT_VARIABLE}, 0px)`,
                marginLeft: -INDICATOR_WIDTH / 2,
                width: INDICATOR_WIDTH,
                backgroundColor: theme.iconMenu,
                opacity: `var(${RESIZE_INDICATOR_OPACITY_VARIABLE}, 0)`,
                // The handles up in the header own the pointer; this is only ever a picture of where the edge is.
                pointerEvents: 'none',
            }}
        />
    );
}

export default ColumnResizeIndicator;
