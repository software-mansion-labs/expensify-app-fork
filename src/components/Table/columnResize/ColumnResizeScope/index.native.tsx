import type {ColumnResizeScopeProps} from '@components/Table/columnResize/types';

/**
 * Native has no resizable columns and no custom properties to hold their widths, so there is nothing to scope and the
 * children render exactly as they were passed.
 */
function ColumnResizeScope({children}: ColumnResizeScopeProps) {
    return children;
}

export default ColumnResizeScope;
