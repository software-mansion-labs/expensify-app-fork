import {optionsOrderBy} from '@libs/OptionsListUtils';

import type {OptionIndexRow} from './types';

type IndexMatches = {
    ids: string[];

    /** Whether rows matched beyond the limit, so a wider window would return more of them. */
    hasMore: boolean;
};

function getRowOrderKey(row: OptionIndexRow): string {
    return row.orderKey;
}

/**
 * The best `limit` rows whose text contains every term. The ranking is the router's own bounded heap, so the ids
 * come back in the order the list renders them and the scan never sorts more than the window holds.
 */
function matchIndexRows(rows: Iterable<OptionIndexRow>, terms: string[], limit: number, shouldRankAscending = false): IndexMatches {
    const isMatch = (row: OptionIndexRow) => row.isSelectable && terms.every((term) => row.searchText.includes(term));
    const {options, hasMore} = optionsOrderBy(rows, getRowOrderKey, limit, isMatch, shouldRankAscending);

    return {ids: options.map((row) => row.id), hasMore};
}

export default matchIndexRows;
