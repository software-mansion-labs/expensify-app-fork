import getAbsorbedColumnWidths from '@components/Table/columnResize/getAbsorbedColumnWidths';

import CONST from '@src/CONST';

const {MIN_WIDTH} = CONST.TABLES.COLUMN_RESIZE;

function sumOf(values: number[]): number {
    return values.reduce((total, value) => total + value, 0);
}

describe('getAbsorbedColumnWidths', () => {
    // Given a column with nothing after it that can pay
    // When its edge is widened
    // Then no width is produced, and the caller is left to overflow the table rather than move a column it may not
    it('produces nothing when no column pays', () => {
        expect(getAbsorbedColumnWidths([], 60)).toEqual([]);
    });

    // Given three columns paying for a column the user widened
    // When the delta divides evenly between them
    // Then each gives up the same amount, which is what makes the drag read as moving one edge
    it('takes the delta equally from every paying column', () => {
        expect(getAbsorbedColumnWidths([200, 200, 200], 60)).toEqual([180, 180, 180]);
    });

    // Given three columns and a delta that does not divide evenly
    // When the shares are taken
    // Then they still add up to exactly the delta, so the table never shows a hairline of slack appearing and
    // disappearing at the end of the row while the pointer moves
    it('keeps the shares adding up to the whole delta', () => {
        const widths = getAbsorbedColumnWidths([200, 200, 200], 100);

        expect(sumOf(widths)).toBe(600 - 100);
    });

    // Given a column the user narrowed
    // When the shares are taken
    // Then the paying columns grow instead, so the table keeps the width it was given rather than shrinking
    it('gives width back when the column is narrowed', () => {
        expect(getAbsorbedColumnWidths([200, 200], -50)).toEqual([225, 225]);
    });

    // Given paying columns that cannot give up the whole delta
    // When the shares are taken
    // Then each stops at the narrowest a column may be, leaving the rest unpaid so the row overflows and scrolls
    // instead of a column collapsing to nothing
    it('floors a paying column at the narrowest a column may be', () => {
        expect(getAbsorbedColumnWidths([100, 100], 400)).toEqual([MIN_WIDTH, MIN_WIDTH]);
    });
});
