import {ID_SEPARATOR} from '@libs/SqlEngine/wasm/reportActionsTable';

/**
 * Splits the one value the worker returns for a whole order. Report action ids are digit strings, so the
 * separator can never occur inside one.
 */
function splitOrderedIDs(ids: string): string[] {
    return ids.length > 0 ? ids.split(ID_SEPARATOR) : [];
}

export default splitOrderedIDs;
