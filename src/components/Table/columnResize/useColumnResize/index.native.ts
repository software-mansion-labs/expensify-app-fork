import type {ColumnResizeController, UseColumnResizeParams} from './types';

/**
 * Column resizing is a pointer interaction against a CSS grid, so it doesn't apply on native: the narrow layout renders
 * rows as cards with no columns to resize, and the wide native layout can't measure text to size them from in the first
 * place. Returning `undefined` leaves the table on its existing widths.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useColumnResize(params: UseColumnResizeParams): ColumnResizeController | undefined {
    return undefined;
}

export default useColumnResize;
