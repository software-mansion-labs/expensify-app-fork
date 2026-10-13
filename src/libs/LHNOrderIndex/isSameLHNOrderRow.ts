import type {LHNOrderRow} from './types';

function isSameLHNOrderRow(first: LHNOrderRow, second: LHNOrderRow): boolean {
    return (
        first.reportID === second.reportID &&
        first.bucket === second.bucket &&
        first.displayName === second.displayName &&
        first.lastVisibleActionCreated === second.lastVisibleActionCreated &&
        first.isUnread === second.isUnread &&
        first.isTodo === second.isTodo
    );
}

export default isSameLHNOrderRow;
