import type {ColumnResizeProps} from '@components/Table/columnResize/types';

/** No-op on native: there are no resizable columns there. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ColumnResizeIndicator(props: ColumnResizeProps) {
    return null;
}

export default ColumnResizeIndicator;
