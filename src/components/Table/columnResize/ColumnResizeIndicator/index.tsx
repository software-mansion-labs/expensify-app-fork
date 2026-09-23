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
 * Line drawn down the table at the hovered or dragged column edge. Always mounted; position and visibility come from CSS custom
 * properties written by the handles, so it never re-renders. A plain `div` since RN style types can't express custom properties.
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
                // Runs from the heading row's top to the lowest row's bottom; neither matches this element's box, so the handles measure and write both.
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
