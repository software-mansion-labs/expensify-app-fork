import type {ValueOf} from 'type-fest';

import type {LHNOrderReport} from './types';

import LHN_ORDER_BUCKET from './LHN_ORDER_BUCKET';

/** Which LHN group a report belongs to. Pinned and GBR reports come first, then errors that are not archived, then drafts. */
function getLHNOrderBucket(report: LHNOrderReport, isArchived: boolean, hasDraft: boolean): ValueOf<typeof LHN_ORDER_BUCKET> {
    if (report.isPinned || report.requiresAttention) {
        return LHN_ORDER_BUCKET.PINNED_AND_GBR;
    }
    if (report.hasErrorsOtherThanFailedReceipt && !isArchived) {
        return LHN_ORDER_BUCKET.ERROR;
    }
    if (hasDraft) {
        return LHN_ORDER_BUCKET.DRAFT;
    }
    return isArchived ? LHN_ORDER_BUCKET.ARCHIVED : LHN_ORDER_BUCKET.NON_ARCHIVED;
}

export default getLHNOrderBucket;
