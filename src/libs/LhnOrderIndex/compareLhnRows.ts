import type {LhnIndexRow, LhnPriorityMode} from '@libs/SqlEngine/wasm/protocol';
import {LHN_FIRST_RECENCY_BUCKET} from '@libs/SqlEngine/wasm/protocol';

/**
 * The LHN order as one comparison between two rows: the `ORDER BY` of `../SqlEngine/wasm/lhnTable.ts` written in JS.
 * The group comes first, then recency inside the two groups the default priority mode orders by recency, then the
 * sort key, then the report id so that no two rows of different reports ever compare equal.
 */
function compareLhnRows(first: LhnIndexRow, second: LhnIndexRow, priorityMode: LhnPriorityMode): number {
    if (first.bucket !== second.bucket) {
        return first.bucket - second.bucket;
    }
    if (priorityMode === 'default' && first.bucket >= LHN_FIRST_RECENCY_BUCKET && first.lastVisibleActionCreated !== second.lastVisibleActionCreated) {
        return first.lastVisibleActionCreated < second.lastVisibleActionCreated ? 1 : -1;
    }
    if (first.sortKey !== second.sortKey) {
        return first.sortKey < second.sortKey ? -1 : 1;
    }
    if (first.reportID === second.reportID) {
        return 0;
    }
    return first.reportID < second.reportID ? -1 : 1;
}

export default compareLhnRows;
