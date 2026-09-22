import type {ColumnResizeScopeProps} from '@components/Table/columnResize/types';

import React from 'react';

/**
 * Owns the element a resizable table's column widths are written on.
 *
 * It renders as `display: contents`, so it generates no box at all: the table's layout is exactly what it would be
 * without this wrapper, while the custom properties written here still inherit into the header, every row, and the
 * horizontal scroller's content. A `View` couldn't do this — react-native-web neither accepts `display: contents` nor
 * hands back a DOM node to write to — which is why it's a plain `div`.
 */
function ColumnResizeScope({onScopeElement, children}: ColumnResizeScopeProps) {
    if (!onScopeElement) {
        return children;
    }

    return (
        <div
            ref={onScopeElement}
            style={{display: 'contents'}}
        >
            {children}
        </div>
    );
}

export default ColumnResizeScope;
