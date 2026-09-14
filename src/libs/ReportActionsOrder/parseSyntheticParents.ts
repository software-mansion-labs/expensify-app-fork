import {ID_SEPARATOR, PAIR_SEPARATOR} from '@libs/SqlEngine/wasm/reportActionsTable';

/**
 * Reads the one value the worker returns for the synthetic rows of an order: which ids the display list adds and
 * which action each one was expanded from. Report action ids hold neither separator.
 */
function parseSyntheticParents(pairs: string): Map<string, string> {
    const parents = new Map<string, string>();
    if (pairs.length === 0) {
        return parents;
    }
    for (const pair of pairs.split(ID_SEPARATOR)) {
        const separatorIndex = pair.indexOf(PAIR_SEPARATOR);
        if (separatorIndex <= 0) {
            continue;
        }
        parents.set(pair.slice(0, separatorIndex), pair.slice(separatorIndex + 1));
    }
    return parents;
}

export default parseSyntheticParents;
