import type {LHNOrderRow, LocaleCompare} from './types';

import LHN_ORDER_BUCKET from './LHN_ORDER_BUCKET';

type LHNOrderComparator = (first: LHNOrderRow, second: LHNOrderRow) => number;

function isRecencyBucket(bucket: LHNOrderRow['bucket']): boolean {
    return bucket === LHN_ORDER_BUCKET.NON_ARCHIVED || bucket === LHN_ORDER_BUCKET.ARCHIVED;
}

/**
 * The LHN order as one comparison between two rows. The group comes first. In the most recent priority mode the
 * non-archived and archived groups then order by the newest visible action, with reports that have none last. The
 * name comes next, by sort key and then by locale, and the report ID last, so two different reports never compare
 * equal and the order is the same whichever way it was built.
 */
function createLHNOrderComparator(isInDefaultMode: boolean, localeCompare: LocaleCompare): LHNOrderComparator {
    return (first, second) => {
        if (first.bucket !== second.bucket) {
            return first.bucket - second.bucket;
        }
        if (isInDefaultMode && isRecencyBucket(first.bucket) && first.lastVisibleActionCreated !== second.lastVisibleActionCreated) {
            return first.lastVisibleActionCreated < second.lastVisibleActionCreated ? 1 : -1;
        }
        if (first.sortKey !== second.sortKey) {
            return first.sortKey < second.sortKey ? -1 : 1;
        }
        const nameOrder = first.displayName === second.displayName ? 0 : localeCompare(first.displayName, second.displayName);
        if (nameOrder !== 0) {
            return nameOrder;
        }
        if (first.reportID === second.reportID) {
            return 0;
        }
        return first.reportID < second.reportID ? -1 : 1;
    };
}

export default createLHNOrderComparator;
export type {LHNOrderComparator};
