import getScrollDeltaToReveal from '@components/Search/SearchList/BaseSearchList/getScrollDeltaToReveal';

const ROW_HEIGHT = 48;
const VIEWPORT = {viewportHeight: 600, topInset: 0, bottomInset: 0};

describe('getScrollDeltaToReveal', () => {
    it("doesn't scroll to a row that is already fully visible", () => {
        // Given a row in the middle of the viewport
        // When it takes focus
        const delta = getScrollDeltaToReveal({...VIEWPORT, top: 200, height: ROW_HEIGHT});

        // Then the list stays where it is
        expect(delta).toBe(0);
    });

    it('scrolls up only far enough to clear the sticky header over a row above it', () => {
        // Given a row partly under a 40px sticky group header
        // When it takes focus
        const delta = getScrollDeltaToReveal({...VIEWPORT, topInset: 40, top: 20, height: ROW_HEIGHT});

        // Then the list scrolls up by the part of the row the header covers
        expect(delta).toBe(-20);
    });

    it('scrolls down only far enough to clear the tab bar over a row below it', () => {
        // Given a row partly under a 72px floating tab bar
        // When it takes focus
        const delta = getScrollDeltaToReveal({...VIEWPORT, bottomInset: 72, top: 500, height: ROW_HEIGHT});

        // Then the list scrolls down by the part of the row the tab bar covers, which ends 20px below the visible area
        expect(delta).toBe(20);
    });

    it('shows the top of a row taller than the visible area', () => {
        // Given a row that can't fit, starting below the top of the viewport
        // When it takes focus
        const delta = getScrollDeltaToReveal({...VIEWPORT, top: 100, height: 900});

        // Then the list brings its top, where its content starts, to the top of the viewport
        expect(delta).toBe(100);
    });

    it('scrolls one row height when the next row is just below the viewport', () => {
        // Given the last fully visible row ends at the bottom of the viewport, and the next row starts right there
        const nextRowTop = 600;

        // When the down arrow moves focus to the next row
        const delta = getScrollDeltaToReveal({...VIEWPORT, top: nextRowTop, height: ROW_HEIGHT});

        // Then the list scrolls by exactly that row, instead of moving it to the top
        expect(delta).toBe(ROW_HEIGHT);
    });
});
