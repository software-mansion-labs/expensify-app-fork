import type {ColumnResizeHandleProps} from '@components/Table/columnResize/types';

/**
 * Native renders no resize handles: the narrow layout draws rows as cards with no columns to resize, and the wide
 * native layout can't measure text to size them from either. `useColumnResize` already hands back no controller there,
 * so this only exists to keep the DOM-only implementation out of the native bundle.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ColumnResizeHandle(props: ColumnResizeHandleProps) {
    return null;
}

export default ColumnResizeHandle;
