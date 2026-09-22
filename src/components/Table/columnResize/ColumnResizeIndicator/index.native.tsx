import type {ColumnResizeProps} from '@components/Table/columnResize/types';

/**
 * Native draws no resize indicator: there are no resizable columns there, so `useColumnResize` hands back no controller
 * and there is never an edge to point at.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ColumnResizeIndicator(props: ColumnResizeProps) {
    return null;
}

export default ColumnResizeIndicator;
