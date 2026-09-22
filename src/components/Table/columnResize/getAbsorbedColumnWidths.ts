import CONST from '@src/CONST';

const {MIN_WIDTH} = CONST.TABLES.COLUMN_RESIZE;

/**
 * Where the columns after a resized one end up.
 *
 * The width the user took has to come from somewhere, and it comes equally from the columns after the one they
 * dragged that they have not sized themselves. That is what makes a drag read as moving one edge: the columns before
 * it never move, the ones the user already sized keep what they were given, and the rest share the difference rather
 * than being re-laid out from their content.
 *
 * Each absorber is floored at the narrowest a column may be. Whatever they can't give up is simply not given up: the
 * row ends up wider than the table and scrolls, instead of a column collapsing to nothing.
 *
 * The shares are rounded cumulatively rather than one at a time, so they add up to the whole delta instead of
 * drifting from it by up to a px per column — which the table would otherwise show as a hairline of slack appearing
 * and disappearing at the end of the row while a column is dragged.
 *
 * Shared by the drag, which applies this to the DOM as the pointer moves, and by the resolver, which applies it to
 * the stored widths on every render. They have to agree, or the columns would jump the moment a drag is released.
 */
function getAbsorbedColumnWidths(absorberStartWidths: number[], delta: number): number[] {
    const absorberCount = absorberStartWidths.length;
    let takenSoFar = 0;

    return absorberStartWidths.map((startWidth, index) => {
        const take = Math.round(((index + 1) * delta) / absorberCount) - takenSoFar;

        takenSoFar += take;

        return Math.max(Math.round(startWidth) - take, MIN_WIDTH);
    });
}

export default getAbsorbedColumnWidths;
