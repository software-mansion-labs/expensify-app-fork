import {clampColumnWidth, getDraggedColumnWidth, getKeyboardResizeAction, getToggleFitAction, hasPointerPassedDragSlop} from '@components/Table/columnResize/columnResizeGestures';

import CONST from '@src/CONST';

const {MIN_WIDTH, MAX_WIDTH, KEYBOARD_STEP, DRAG_SLOP} = CONST.TABLES.COLUMN_RESIZE;

describe('columnResizeGestures', () => {
    describe('clampColumnWidth', () => {
        it('keeps widths within the drag bounds as whole px', () => {
            // Given widths below and above the drag bounds, plus a fractional one
            const tooNarrow = MIN_WIDTH - 20;
            const tooWide = MAX_WIDTH + 20;
            const fractional = 150.6;

            // When they are clamped
            const clamped = [tooNarrow, tooWide, fractional].map(clampColumnWidth);

            // Then each lands inside the bounds as whole px, so a column can neither vanish nor push the rest out of reach
            expect(clamped).toEqual([MIN_WIDTH, MAX_WIDTH, 151]);
        });
    });

    describe('hasPointerPassedDragSlop', () => {
        it('treats travel within the slop as a click', () => {
            // Given a pointer pressed at x=100
            const startClientX = 100;

            // When it moves exactly the slop, in either direction
            const isDragWithinSlop = [startClientX + DRAG_SLOP, startClientX - DRAG_SLOP].map((clientX) => hasPointerPassedDragSlop(startClientX, clientX));

            // Then it still counts as a click, so a click that wobbles a little fits the column instead of resizing it
            expect(isDragWithinSlop).toEqual([false, false]);

            // When it moves one pixel past the slop, in either direction
            const isDragPastSlop = [startClientX + DRAG_SLOP + 1, startClientX - DRAG_SLOP - 1].map((clientX) => hasPointerPassedDragSlop(startClientX, clientX));

            // Then it counts as a drag
            expect(isDragPastSlop).toEqual([true, true]);
        });
    });

    describe('getDraggedColumnWidth', () => {
        it('adds the pointer travel to the start width', () => {
            // Given a 200px column whose edge was pressed at x=100
            const startWidth = 200;
            const startClientX = 100;

            // When the pointer moves 40px right, and separately 40px left
            const widenedWidth = getDraggedColumnWidth(startWidth, startClientX, 140);
            const narrowedWidth = getDraggedColumnWidth(startWidth, startClientX, 60);

            // Then the column follows the pointer's travel from where it started, not from wherever the last move left it
            expect(widenedWidth).toBe(240);
            expect(narrowedWidth).toBe(160);
        });

        it('stops at the drag bounds', () => {
            // Given a 200px column whose edge was pressed at x=100
            const startWidth = 200;
            const startClientX = 100;

            // When the pointer travels further than the column may shrink or grow
            const narrowestWidth = getDraggedColumnWidth(startWidth, startClientX, -1000);
            const widestWidth = getDraggedColumnWidth(startWidth, startClientX, 5000);

            // Then the width stops at the bounds, so the edge stays reachable however far the pointer goes
            expect(narrowestWidth).toBe(MIN_WIDTH);
            expect(widestWidth).toBe(MAX_WIDTH);
        });
    });

    describe('getKeyboardResizeAction', () => {
        it('steps the edge on the arrow keys', () => {
            // Given a focused column edge
            // When the left and right arrows are pressed
            const leftAction = getKeyboardResizeAction('ArrowLeft');
            const rightAction = getKeyboardResizeAction('ArrowRight');

            // Then each moves the edge by one step in its direction, so the column can be resized without a pointer
            expect(leftAction).toEqual({type: 'step', step: -KEYBOARD_STEP});
            expect(rightAction).toEqual({type: 'step', step: KEYBOARD_STEP});
        });

        it('toggles the fit on Space and Enter', () => {
            // Given a focused column edge
            // When Space and Enter are pressed
            const spaceAction = getKeyboardResizeAction(' ');
            const enterAction = getKeyboardResizeAction('Enter');

            // Then they toggle the fit, standing in for the pointer's click and double-click
            expect(spaceAction).toEqual({type: 'toggleFit'});
            expect(enterAction).toEqual({type: 'toggleFit'});
        });

        it('ignores other keys', () => {
            // Given a focused column edge
            // When keys with no meaning on an edge are pressed
            const tabAction = getKeyboardResizeAction('Tab');
            const upAction = getKeyboardResizeAction('ArrowUp');

            // Then they do nothing, so Tab and the like keep their usual behavior
            expect(tabAction).toBeUndefined();
            expect(upAction).toBeUndefined();
        });
    });

    describe('getToggleFitAction', () => {
        it('fits a column not already at its content width', () => {
            // Given a column whose content is 180px wide, either never stored or stored at another width
            const contentWidth = 180;

            // When the toggle is pressed
            const neverStoredAction = getToggleFitAction(contentWidth, undefined);
            const storedElsewhereAction = getToggleFitAction(contentWidth, 240);

            // Then it fits the column to its content
            expect(neverStoredAction).toBe('fit');
            expect(storedElsewhereAction).toBe('fit');
        });

        it('releases a column already at its content width', () => {
            // Given a column stored at its content width, and one whose tiny content width was clamped up to the minimum
            const fittedColumn = {contentWidth: 180, storedWidth: 180};
            const clampedFittedColumn = {contentWidth: 10, storedWidth: MIN_WIDTH};

            // When the toggle is pressed
            const actions = [fittedColumn, clampedFittedColumn].map(({contentWidth, storedWidth}) => getToggleFitAction(contentWidth, storedWidth));

            // Then each is released back to its resolved width, so pressing twice undoes the first press
            expect(actions).toEqual(['release', 'release']);
        });

        it('releases when the content width is unknown', () => {
            // Given a stored column whose content couldn't be measured
            const contentWidth = undefined;

            // When the toggle is pressed
            const action = getToggleFitAction(contentWidth, 240);

            // Then it can only release, since there's no content width to fit to
            expect(action).toBe('release');
        });
    });
});
