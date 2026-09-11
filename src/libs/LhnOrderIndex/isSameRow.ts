import type {LhnIndexRow} from '@libs/SqlEngine/wasm/protocol';

/**
 * Whether a freshly built row would change anything at all. The two stores lean on this heavily:
 * `updateReportsToDisplayInLHN` gives a new entry to every report carrying a flag on every recheck, so a single
 * incoming message hands them about a third of the account, of which one row is genuinely different.
 */
function isSameRow(first: LhnIndexRow | undefined, second: LhnIndexRow): boolean {
    return (
        !!first &&
        first.bucket === second.bucket &&
        first.sortKey === second.sortKey &&
        first.lastVisibleActionCreated === second.lastVisibleActionCreated &&
        first.isUnread === second.isUnread &&
        first.isTodo === second.isTodo
    );
}

export default isSameRow;
