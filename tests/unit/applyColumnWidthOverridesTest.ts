import type {ColumnWidthOverrideColumn} from '@components/Table/columnResize/applyColumnWidthOverrides';
import applyColumnWidthOverrides from '@components/Table/columnResize/applyColumnWidthOverrides';
import {getColumnWidthValue} from '@components/Table/columnResize/columnWidthExpressions';

import CONST from '@src/CONST';

const {MIN_WIDTH, MAX_WIDTH} = CONST.TABLES.COLUMN_RESIZE;

/** A headed column sized from its content, which is the only kind whose edge drags. */
function contentColumn(key: string, contentWidth?: number): ColumnWidthOverrideColumn {
    return {key, label: key, hasDeclaredWidth: false, contentWidth};
}

/** A headed column that declared a width of its own, e.g. a status or a switch. */
function fixedColumn(key: string): ColumnWidthOverrideColumn {
    return {key, label: key, hasDeclaredWidth: true, contentWidth: undefined};
}

/** A column with no heading, e.g. a trailing arrow. */
function headlessColumn(key: string): ColumnWidthOverrideColumn {
    return {key, label: '', hasDeclaredWidth: false, contentWidth: undefined};
}

describe('applyColumnWidthOverrides', () => {
    it('gives each column a value reading its custom property with the overridden width as fallback', () => {
        // Given three columns where the user widened the first by 60px
        const columns = [contentColumn('name'), contentColumn('email'), contentColumn('role')];
        const baseColumnWidths = {name: 200, email: 200, role: 200};

        // When the stored width is applied
        const {columnWidths, columnWidthValues} = applyColumnWidthOverrides({columns, baseColumnWidths, columnWidthOverrides: {name: 260}});

        // Then only that column changes, and each value falls back to its width, so the first paint already matches
        // what a drag would write and no column jumps once one starts
        expect(columnWidths).toEqual({name: 260, email: 200, role: 200});
        expect(columnWidthValues).toEqual([getColumnWidthValue('name', 260), getColumnWidthValue('email', 200), getColumnWidthValue('role', 200)]);
    });

    it('leaves the other columns alone when a column is narrowed', () => {
        // Given a table ending in a growable arrow column, where the user narrowed the first column by 100px
        const columns = [contentColumn('name'), contentColumn('email'), headlessColumn('arrow')];
        const baseColumnWidths = {name: 300, email: 300, arrow: 40};

        // When the stored width is applied
        const {columnWidths} = applyColumnWidthOverrides({columns, baseColumnWidths, columnWidthOverrides: {name: 200}});

        // Then the freed room isn't handed to the other columns, since the user only asked to change one; the growable
        // column's track takes it up in the layout instead
        expect(columnWidths).toEqual({name: 200, email: 300, arrow: 40});
    });

    it('does not mutate the widths it was given', () => {
        // Given base widths and a stored width
        const baseColumnWidths = {name: 200, email: 200};

        // When the stored width is applied
        applyColumnWidthOverrides({columns: [contentColumn('name'), contentColumn('email')], baseColumnWidths, columnWidthOverrides: {name: 260}});

        // Then the caller's widths are untouched, since they are the resolver's output and may be reused
        expect(baseColumnWidths).toEqual({name: 200, email: 200});
    });

    it('ignores a stored width on a column that declared its own width', () => {
        // Given a width stored for a column that declared its own width, left over from when such columns had an edge
        const columns = [contentColumn('name'), fixedColumn('enabled')];
        const baseColumnWidths = {name: 300, enabled: 80};

        // When the stored widths are applied
        const {columnWidths} = applyColumnWidthOverrides({columns, baseColumnWidths, columnWidthOverrides: {enabled: 200}});

        // Then it is ignored, since the column can no longer be dragged and so the user would have no way to put it back
        expect(columnWidths).toEqual({name: 300, enabled: 80});
    });

    it('reads stored widths as whole, non-negative px', () => {
        // Given a fractional stored width and a nonsensical negative one, which persisted data can hold long after the
        // code that wrote it changed
        const columns = [contentColumn('name'), contentColumn('email')];

        // When they are applied
        const {columnWidths} = applyColumnWidthOverrides({columns, baseColumnWidths: {name: 300, email: 300}, columnWidthOverrides: {name: 320.6, email: -50}});

        // Then the fractional one is rounded, since a fractional track leaves a hairline of slack, and the negative one
        // is floored at zero rather than laying the column out at a negative width
        expect(columnWidths).toEqual({name: 321, email: 0});
    });

    it('honors a stored width outside the bounds a drag is held to', () => {
        // Given stored widths narrower and wider than a drag is allowed to reach
        const columns = [contentColumn('narrow'), contentColumn('wide')];

        // When they are applied
        const {columnWidths} = applyColumnWidthOverrides({columns, baseColumnWidths: {narrow: 300, wide: 300}, columnWidthOverrides: {narrow: MIN_WIDTH - 8, wide: MAX_WIDTH + 100}});

        // Then they stand as stored, because those bounds belong to the gesture, not to the layout
        expect(columnWidths).toEqual({narrow: MIN_WIDTH - 8, wide: MAX_WIDTH + 100});
    });

    it('gives an edge only to headed columns sized from their content', () => {
        // Given a table mixing content-sized, fixed and headless columns
        const columns = [contentColumn('name'), fixedColumn('status'), contentColumn('email'), headlessColumn('arrow')];
        const baseColumnWidths = {name: 200, status: 80, email: 200, arrow: 40};

        // When the resizable columns are worked out
        const {resizableColumns} = applyColumnWidthOverrides({columns, baseColumnWidths, columnWidthOverrides: undefined});

        // Then only the content-sized ones get an edge, since fixed and headless columns hold fixed-size content
        expect(resizableColumns.map((column) => column.columnKey)).toEqual(['name', 'email']);
    });

    it('passes each column its content width and heading', () => {
        // Given a column whose content was measured and one whose content couldn't be
        const columns = [contentColumn('name', 150), contentColumn('email')];
        const baseColumnWidths = {name: 200, email: 200};

        // When the resizable columns are worked out
        const {resizableColumns} = applyColumnWidthOverrides({columns, baseColumnWidths, columnWidthOverrides: undefined});

        // Then a click on the measured column's edge can fit it, the other's click does nothing, and both edges are named after their heading for assistive tech
        expect(resizableColumns).toEqual([
            {columnKey: 'name', columnLabel: 'name', contentWidth: 150},
            {columnKey: 'email', columnLabel: 'email', contentWidth: undefined},
        ]);
    });
});
