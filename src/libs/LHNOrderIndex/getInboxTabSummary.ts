import DateUtils from '@libs/DateUtils';

import CONST from '@src/CONST';

import {startOfDay, subMonths} from 'date-fns';

import type {LHNOrder} from './types';

type InboxTabSummary = {
    counts: Record<typeof CONST.INBOX_TAB.TODO | typeof CONST.INBOX_TAB.UNREAD, number>;
    /** Whether an unread report's newest message is older than CONST.INBOX_TAB_STALE_UNREAD_MONTHS. */
    hasStaleUnreadReport: boolean;
};

/** Summarizes the order for the Inbox tab row: the count badge of the To-do and Unread tabs, and whether an unread report went stale. */
function getInboxTabSummary(order: LHNOrder): InboxTabSummary {
    const staleUnreadTime = DateUtils.getDBTime(subMonths(startOfDay(new Date()), CONST.INBOX_TAB_STALE_UNREAD_MONTHS).valueOf());
    return {
        counts: {
            [CONST.INBOX_TAB.TODO]: order.todoReportIDs.length,
            [CONST.INBOX_TAB.UNREAD]: order.unreadReportIDs.length,
        },
        hasStaleUnreadReport: order.oldestUnreadActionCreated !== undefined && order.oldestUnreadActionCreated < staleUnreadTime,
    };
}

export default getInboxTabSummary;
