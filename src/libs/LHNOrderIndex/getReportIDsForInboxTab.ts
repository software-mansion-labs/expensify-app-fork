import CONST from '@src/CONST';

import type {ValueOf} from 'type-fest';

import type {LHNOrder} from './types';

/** The ordered report IDs an Inbox tab lists: everything on All, reports requiring action on To-do, unread reports on Unread. */
function getReportIDsForInboxTab(order: LHNOrder, tab: ValueOf<typeof CONST.INBOX_TAB>): string[] {
    switch (tab) {
        case CONST.INBOX_TAB.TODO:
            return order.todoReportIDs;
        case CONST.INBOX_TAB.UNREAD:
            return order.unreadReportIDs;
        default:
            return order.reportIDs;
    }
}

export default getReportIDsForInboxTab;
