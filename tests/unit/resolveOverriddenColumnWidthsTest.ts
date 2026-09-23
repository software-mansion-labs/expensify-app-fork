import getAbsorbedColumnWidths from '@components/Table/columnResize/getAbsorbedColumnWidths';
import type {OverridableColumn} from '@components/Table/columnResize/resolveOverriddenColumnWidths';
import resolveOverriddenColumnWidths from '@components/Table/columnResize/resolveOverriddenColumnWidths';

import CONST from '@src/CONST';

const {MIN_WIDTH, MAX_WIDTH} = CONST.TABLES.COLUMN_RESIZE;

/** A column laid out by sharing the row, which is the only kind that can pay for a column the user resizes. */
function sharedColumn(key: string): OverridableColumn {
    return {key, hasDeclaredWidth: false};
}

/** A column that declared a width of its own, so it never shared the row and never pays. */
function fixedColumn(key: string): OverridableColumn {
    return {key, hasDeclaredWidth: true};
}

function sumOf(widths: Record<string, number>): number {
    return Object.values(widths).reduce((total, width) => total + width, 0);
}

describe('resolveOverriddenColumnWidths', () => {
    describe('when nothing is stored', () => {
        // Given a table the user has never resized
        // When the stored widths are applied
        // Then the columns are left exactly as the resolver sized them, so an untouched table is unaffected by the
        // resizing machinery being wired up at all
        it('leaves the resolved widths alone', () => {
            const {columnWidths} = resolveOverriddenColumnWidths({
                columns: [sharedColumn('a'), sharedColumn('b')],
                baseColumnWidths: {a: 300, b: 300},
                columnWidthOverrides: undefined,
                growableColumnKey: undefined,
            });

            expect(columnWidths).toEqual({a: 300, b: 300});
        });

        // Given the widths the resolver produced, which the caller goes on using
        // When the stored widths are applied
        // Then the input is not written to, since a hook that mutated what it was handed would corrupt the base the
        // next render's shares are measured against
        it('does not mutate the widths it was given', () => {
            const baseColumnWidths = {a: 300, b: 300};

            resolveOverriddenColumnWidths({
                columns: [sharedColumn('a'), sharedColumn('b')],
                baseColumnWidths,
                columnWidthOverrides: {a: 360},
                growableColumnKey: undefined,
            });

            expect(baseColumnWidths).toEqual({a: 300, b: 300});
        });
    });

    describe('who pays for a resized column', () => {
        // Given three columns sharing the row and a stored width on the first
        // When the stored widths are applied
        // Then the two columns after it give up equal shares, which is what makes a drag read as moving one edge
        // rather than re-laying out the row
        it('takes the width equally from the columns after the resized one', () => {
            const {columnWidths} = resolveOverriddenColumnWidths({
                columns: [sharedColumn('a'), sharedColumn('b'), sharedColumn('c')],
                baseColumnWidths: {a: 300, b: 300, c: 300},
                columnWidthOverrides: {a: 360},
                growableColumnKey: undefined,
            });

            expect(columnWidths).toEqual({a: 360, b: 270, c: 270});
            expect(sumOf(columnWidths)).toBe(900);
        });

        // Given a column before the resized one
        // When the stored widths are applied
        // Then it is untouched, because the user is looking at those columns while they drag and moving them would
        // make the edge appear to slide out from under the pointer
        it('never moves a column before the resized one', () => {
            const {columnWidths} = resolveOverriddenColumnWidths({
                columns: [sharedColumn('a'), sharedColumn('b'), sharedColumn('c')],
                baseColumnWidths: {a: 300, b: 300, c: 300},
                columnWidthOverrides: {b: 360},
                growableColumnKey: undefined,
            });

            expect(columnWidths.a).toBe(300);
            expect(columnWidths).toEqual({a: 300, b: 360, c: 240});
        });

        // Given a trailing column that declared its own width, such as an icon column
        // When the stored widths are applied
        // Then it keeps that width and the remaining shared column pays the whole difference, since a column that
        // never shared the row has nothing to give up
        it('does not charge a column that declared its own width', () => {
            const {columnWidths} = resolveOverriddenColumnWidths({
                columns: [sharedColumn('a'), sharedColumn('b'), fixedColumn('icon')],
                baseColumnWidths: {a: 300, b: 300, icon: 40},
                columnWidthOverrides: {a: 360},
                growableColumnKey: undefined,
            });

            expect(columnWidths).toEqual({a: 360, b: 240, icon: 40});
        });

        // Given the column that takes the row's leftover width
        // When the stored widths are applied
        // Then it is not charged a share, because it is where room a narrowed column gives up is meant to go — taking
        // width off it as well would move the row's trailing chrome away from the table's edge
        it('does not charge the growable column', () => {
            const {columnWidths} = resolveOverriddenColumnWidths({
                columns: [sharedColumn('a'), sharedColumn('b'), sharedColumn('action')],
                baseColumnWidths: {a: 300, b: 300, action: 300},
                columnWidthOverrides: {a: 360},
                growableColumnKey: 'action',
            });

            expect(columnWidths).toEqual({a: 360, b: 240, action: 300});
        });

        // Given a column the user already sized
        // When a column before it is resized
        // Then it keeps the width the user gave it and pays nothing, so one drag can't quietly undo an earlier one
        it('does not charge a column the user already sized', () => {
            const {columnWidths} = resolveOverriddenColumnWidths({
                columns: [sharedColumn('a'), sharedColumn('b'), sharedColumn('c')],
                baseColumnWidths: {a: 300, b: 300, c: 300},
                columnWidthOverrides: {a: 360, c: 200},
                growableColumnKey: undefined,
            });

            expect(columnWidths).toEqual({a: 360, b: 240, c: 200});
        });

        // Given the last column in the row, with nothing after it that can pay
        // When the stored width is applied
        // Then it simply takes the width and the others stay put, which is what pushes the row past the table and
        // hands it to the horizontal scroller rather than collapsing a column
        it('lets a column with no one to pay for it grow the row', () => {
            const {columnWidths} = resolveOverriddenColumnWidths({
                columns: [sharedColumn('a'), sharedColumn('b')],
                baseColumnWidths: {a: 300, b: 300},
                columnWidthOverrides: {b: 500},
                growableColumnKey: undefined,
            });

            expect(columnWidths).toEqual({a: 300, b: 500});
        });

        // Given every column in the row
        // When the paying sets are reported
        // Then each one lists only the columns after it that can pay, which is what a drag reads to decide where the
        // width it is about to take should come from, and what leaves the last shared column with nobody behind it
        it('reports the paying columns for each column', () => {
            const {payingColumnKeysByIndex} = resolveOverriddenColumnWidths({
                columns: [sharedColumn('a'), sharedColumn('b'), sharedColumn('c'), fixedColumn('icon'), sharedColumn('action')],
                baseColumnWidths: {a: 300, b: 300, c: 300, icon: 40, action: 300},
                columnWidthOverrides: undefined,
                growableColumnKey: 'action',
            });

            expect(payingColumnKeysByIndex).toEqual([['b', 'c'], ['c'], [], [], []]);
        });
    });

    describe('applying more than one stored width', () => {
        // Given two stored widths, applied in the order the columns render
        // When the stored widths are applied
        // Then a column paying for both is charged for each in turn, off what the previous one left it at, so the
        // widths compose the same way the two drags did
        it('charges a column that pays for two resized columns twice', () => {
            const {columnWidths} = resolveOverriddenColumnWidths({
                columns: [sharedColumn('a'), sharedColumn('b'), sharedColumn('c'), sharedColumn('d')],
                baseColumnWidths: {a: 300, b: 300, c: 300, d: 300},
                columnWidthOverrides: {a: 360, b: 330},
                growableColumnKey: undefined,
            });

            expect(columnWidths).toEqual({a: 360, b: 330, c: 255, d: 255});
            expect(sumOf(columnWidths)).toBe(1200);
        });
    });

    describe('bounds', () => {
        // Given a paying column with almost nothing left to give
        // When a column before it is widened past what it can cover
        // Then it stops at the narrowest a column may be rather than collapsing, and the row ends up wider than the
        // table and scrolls instead
        it('floors a paying column at the minimum width', () => {
            const {columnWidths} = resolveOverriddenColumnWidths({
                columns: [sharedColumn('a'), sharedColumn('b')],
                baseColumnWidths: {a: 300, b: 60},
                columnWidthOverrides: {a: 600},
                growableColumnKey: undefined,
            });

            expect(columnWidths).toEqual({a: 600, b: MIN_WIDTH});
        });

        // Given a stored width that is not a whole number of px
        // When it is applied
        // Then it is rounded, since a fractional track leaves a hairline of slack at the end of the row
        it('rounds a stored width to whole px', () => {
            const {columnWidths} = resolveOverriddenColumnWidths({
                columns: [sharedColumn('a'), sharedColumn('b')],
                baseColumnWidths: {a: 300, b: 300},
                columnWidthOverrides: {a: 320.6},
                growableColumnKey: undefined,
            });

            expect(columnWidths.a).toBe(321);
        });

        // Given a nonsensical stored width, which persisted data can hold long after the code that wrote it changed
        // When it is applied
        // Then it is floored at zero rather than laying the column out at a negative width
        it('floors a negative stored width at zero', () => {
            const {columnWidths} = resolveOverriddenColumnWidths({
                columns: [sharedColumn('a'), sharedColumn('b')],
                baseColumnWidths: {a: 300, b: 300},
                columnWidthOverrides: {a: -50},
                growableColumnKey: undefined,
            });

            expect(columnWidths.a).toBe(0);
        });

        // Given a stored width narrower or wider than a drag is allowed to reach
        // When it is applied
        // Then it is honored as it stands, because those bounds belong to the gesture: a stored width is also how a
        // column is frozen at whatever the resolver or its own style gave it
        it('honors a stored width outside the bounds a drag is held to', () => {
            const {columnWidths} = resolveOverriddenColumnWidths({
                columns: [sharedColumn('narrow'), sharedColumn('wide'), sharedColumn('rest')],
                baseColumnWidths: {narrow: 300, wide: 300, rest: 300},
                columnWidthOverrides: {narrow: MIN_WIDTH - 8, wide: MAX_WIDTH + 100},
                growableColumnKey: undefined,
            });

            expect(columnWidths.narrow).toBe(MIN_WIDTH - 8);
            expect(columnWidths.wide).toBe(MAX_WIDTH + 100);
        });
    });

    describe('agreement with the drag', () => {
        /** What the drag writes to the DOM; the resolver must reproduce it from the stored width alone, or columns jump on release. */
        function applyDrag(baseColumnWidths: Record<string, number>, columnKey: string, payingColumnKeys: string[], width: number): Record<string, number> {
            const absorbedWidths = getAbsorbedColumnWidths(
                payingColumnKeys.map((payingColumnKey) => baseColumnWidths[payingColumnKey] ?? 0),
                width - (baseColumnWidths[columnKey] ?? 0),
            );
            const draggedWidths = {...baseColumnWidths, [columnKey]: width};

            for (const [index, payingColumnKey] of payingColumnKeys.entries()) {
                draggedWidths[payingColumnKey] = absorbedWidths.at(index) ?? 0;
            }

            return draggedWidths;
        }

        // Given a drag that wrote widths to the DOM and stored only the column the user dragged
        // When the next render resolves the stored width
        // Then it lands on exactly the widths the drag left behind — including the ones it never stored — so releasing
        // the pointer changes nothing on screen
        it.each([
            ['widening the column', 372],
            ['narrowing the column', 241],
            ['a delta that does not divide between the payers', 337],
            ['pushing the payers onto their minimum', 900],
        ])('matches what the drag wrote when %s', (caseName, width) => {
            const columns = [sharedColumn('a'), sharedColumn('b'), sharedColumn('c'), sharedColumn('d')];
            const baseColumnWidths = {a: 300, b: 300, c: 300, d: 300};
            const payingColumnKeys = ['c', 'd'];

            const draggedWidths = applyDrag(baseColumnWidths, 'b', payingColumnKeys, width);
            const {columnWidths} = resolveOverriddenColumnWidths({
                columns,
                baseColumnWidths,
                columnWidthOverrides: {b: width},
                growableColumnKey: undefined,
            });

            expect(columnWidths).toEqual(draggedWidths);
        });
    });
});
