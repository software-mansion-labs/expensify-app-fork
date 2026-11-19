type ScrollDeltaToRevealParams = {
    /** Distance from the top of the viewport to the top of the row, negative when the row starts above it */
    top: number;

    height: number;

    viewportHeight: number;

    /** How much of the viewport's top is covered */
    topInset: number;

    /** How much of the viewport's bottom is covered */
    bottomInset: number;
};

/**
 * How far a list has to scroll to bring a focused row fully into view, given where the row sits in the list's
 * viewport and what covers the viewport's edges (a sticky header at the top, a floating tab bar at the bottom).
 * @returns how far to scroll down (positive) or up (negative), or 0 when the row is already fully visible
 */
function getScrollDeltaToReveal({top, height, viewportHeight, topInset, bottomInset}: ScrollDeltaToRevealParams): number {
    const visibleTop = topInset;
    const visibleBottom = viewportHeight - bottomInset;
    const bottom = top + height;

    // A row taller than the visible area can't fit, so its top is shown, where its content starts.
    if (top < visibleTop || height > visibleBottom - visibleTop) {
        return top - visibleTop;
    }
    if (bottom > visibleBottom) {
        return bottom - visibleBottom;
    }
    return 0;
}

export default getScrollDeltaToReveal;
