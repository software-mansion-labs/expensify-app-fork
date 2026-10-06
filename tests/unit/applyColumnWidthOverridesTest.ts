import type {ColumnWidthOverrideColumn} from '@components/Table/columnResize/applyColumnWidthOverrides';
import applyColumnWidthOverrides from '@components/Table/columnResize/applyColumnWidthOverrides';
import {getColumnWidthValue} from '@components/Table/columnResize/columnWidthExpressions';

/** A headed column sized from its content, which is the only kind whose edge drags. */
function contentColumn(key: string, contentWidth?: number): ColumnWidthOverrideColumn {
    return {key, label: key, hasDeclaredWidth: false, contentWidth, fitWidth: contentWidth};
}

/** A headed column that declared a width of its own, e.g. a status or a switch. */
function fixedColumn(key: string): ColumnWidthOverrideColumn {
    return {key, label: key, hasDeclaredWidth: true, contentWidth: undefined, fitWidth: undefined};
}

/** A column with no heading, e.g. a trailing arrow. */
function headlessColumn(key: string): ColumnWidthOverrideColumn {
    return {key, label: '', hasDeclaredWidth: false, contentWidth: undefined, fitWidth: undefined};
}

describe('applyColumnWidthOverrides', () => {
    it('gives each column a value reading its custom property with the overridden width as fallback', () => {
        // Given three columns where the user widened the first by 60px
        const columns = [contentColumn('name'), contentColumn('email'), contentColumn('role')];
        const baseColumnWidths = {name: 200, email: 200, role: 200};

        // When the stored width is applied
        const {columnWidths, columnWidthValues} = applyColumnWidthOverrides({columns, baseColumnWidths, columnWidthOverrides: {name: 260}, growableColumnKey: undefined});

        // Then the later columns pay equally, and each value falls back to that width, so the first paint already
        // matches what a drag would write and no column jumps once one starts
        expect(columnWidths).toEqual({name: 260, email: 170, role: 170});
        expect(columnWidthValues).toEqual([getColumnWidthValue('name', 260), getColumnWidthValue('email', 170), getColumnWidthValue('role', 170)]);
    });

    it('gives an edge only to headed columns sized from their content', () => {
        // Given a table mixing content-sized, fixed and headless columns
        const columns = [contentColumn('name'), fixedColumn('status'), contentColumn('email'), headlessColumn('arrow')];
        const baseColumnWidths = {name: 200, status: 80, email: 200, arrow: 40};

        // When the resizable columns are worked out
        const {resizableColumns} = applyColumnWidthOverrides({columns, baseColumnWidths, columnWidthOverrides: undefined, growableColumnKey: 'arrow'});

        // Then only the content-sized ones get an edge, since fixed and headless columns hold fixed-size content
        expect(resizableColumns.map((column) => column.columnKey)).toEqual(['name', 'email']);
    });

    it('lists the later shared columns as payers, never fixed, user-sized or growable ones', () => {
        // Given a table where the user already sized `email`, with a fixed column and a growable one after it
        const columns = [contentColumn('name'), contentColumn('email'), fixedColumn('status'), contentColumn('role'), headlessColumn('arrow')];
        const baseColumnWidths = {name: 200, email: 200, status: 80, role: 200, arrow: 40};

        // When the resizable columns are worked out
        const {resizableColumns} = applyColumnWidthOverrides({columns, baseColumnWidths, columnWidthOverrides: {email: 200}, growableColumnKey: 'arrow'});

        // Then resizing `name` takes width only from `role`, so a drag never moves a column the user sized or one with fixed content
        expect(resizableColumns.find((column) => column.columnKey === 'name')?.absorbers).toEqual([{columnKey: 'role', minWidth: 0}]);

        // Then the last resizable column has no payer, so widening it scrolls the table instead
        expect(resizableColumns.find((column) => column.columnKey === 'role')?.absorbers).toEqual([]);
    });

    it('passes each column its content width and heading', () => {
        // Given a column whose content was measured and one whose content couldn't be
        const columns = [contentColumn('name', 150), contentColumn('email')];
        const baseColumnWidths = {name: 200, email: 200};

        // When the resizable columns are worked out
        const {resizableColumns} = applyColumnWidthOverrides({columns, baseColumnWidths, columnWidthOverrides: undefined, growableColumnKey: undefined});

        // Then a click on the measured column's edge can fit it, the other's click does nothing, and both edges are named after their heading for assistive tech
        expect(resizableColumns).toEqual([
            {columnKey: 'name', columnLabel: 'name', contentWidth: 150, absorbers: [{columnKey: 'email', minWidth: 0}]},
            {columnKey: 'email', columnLabel: 'email', contentWidth: undefined, absorbers: []},
        ]);
    });
});
