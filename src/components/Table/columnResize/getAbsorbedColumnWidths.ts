import CONST from '@src/CONST';

const {MIN_WIDTH} = CONST.TABLES.COLUMN_RESIZE;

/**
 * Splits a resize delta equally among the absorbing columns (floored at the minimum, overflow scrolls), rounded cumulatively
 * so shares sum exactly. Shared by the drag and the resolver so columns don't jump on release.
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
