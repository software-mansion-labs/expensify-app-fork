import getAbsorbedColumnWidths from '@components/Table/columnResize/getAbsorbedColumnWidths';

import CONST from '@src/CONST';

const {MIN_WIDTH} = CONST.TABLES.COLUMN_RESIZE;

function sumOf(values: number[]): number {
    return values.reduce((total, value) => total + value, 0);
}

/** Paying columns with no content to protect, so only the narrowest a column may be stops them. */
function unmeasured(...startWidths: number[]) {
    return startWidths.map((startWidth) => ({startWidth, minWidth: 0}));
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
        expect(getAbsorbedColumnWidths(unmeasured(200, 200, 200), 60)).toEqual([180, 180, 180]);
    });

    // Given three columns and a delta that does not divide evenly
    // When the shares are taken
    // Then they still add up to exactly the delta, so the table never shows a hairline of slack appearing and
    // disappearing at the end of the row while the pointer moves
    it('keeps the shares adding up to the whole delta', () => {
        const widths = getAbsorbedColumnWidths(unmeasured(200, 200, 200), 100);

        expect(sumOf(widths)).toBe(600 - 100);
    });

    // Given a column the user narrowed
    // When the shares are taken
    // Then the paying columns grow instead, so the table keeps the width it was given rather than shrinking
    it('gives width back when the column is narrowed', () => {
        expect(getAbsorbedColumnWidths(unmeasured(200, 200), -50)).toEqual([225, 225]);
    });

    // Given paying columns that cannot give up the whole delta
    // When the shares are taken
    // Then each stops at the narrowest a column may be, leaving the rest unpaid so the row overflows and scrolls
    // instead of a column collapsing to nothing
    it('floors a paying column at the narrowest a column may be', () => {
        expect(getAbsorbedColumnWidths(unmeasured(100, 100), 400)).toEqual([MIN_WIDTH, MIN_WIDTH]);
    });

    // Given two paying columns, the first with only 20px above its content
    // When a column before them is widened by 100px
    // Then the first stops at its content so its text is never cut, and the second pays the share the first couldn't
    it('stops a paying column at its content and moves the rest of its share to the others', () => {
        const widths = getAbsorbedColumnWidths(
            [
                {startWidth: 200, minWidth: 180},
                {startWidth: 300, minWidth: 100},
            ],
            100,
        );

        expect(widths).toEqual([180, 220]);
    });

    // Given paying columns whose content together leaves less room than the delta
    // When the shares are taken
    // Then every column stops at its content and the remainder is left unpaid, so the table scrolls rather than truncating
    it('leaves what no column can give without truncating to overflow', () => {
        const widths = getAbsorbedColumnWidths(
            [
                {startWidth: 200, minWidth: 180},
                {startWidth: 300, minWidth: 250},
            ],
            500,
        );

        expect(widths).toEqual([180, 250]);
    });

    // Given a paying column already narrower than its content, as a squeezed free-text column is
    // When a column before it is widened
    // Then it gives up nothing, since it is already truncating, rather than being squeezed further
    it('takes nothing from a column already narrower than its content', () => {
        const widths = getAbsorbedColumnWidths(
            [
                {startWidth: 120, minWidth: 400},
                {startWidth: 300, minWidth: 100},
            ],
            60,
        );

        expect(widths).toEqual([120, 240]);
    });

    // Given a column the user narrowed, whose payers sit at their content
    // When the shares are taken
    // Then they still grow equally, since the content floor only limits how far a payer shrinks
    it('ignores the content floor when giving width back', () => {
        const widths = getAbsorbedColumnWidths(
            [
                {startWidth: 180, minWidth: 180},
                {startWidth: 250, minWidth: 250},
            ],
            -40,
        );

        expect(widths).toEqual([200, 270]);
    });
});
