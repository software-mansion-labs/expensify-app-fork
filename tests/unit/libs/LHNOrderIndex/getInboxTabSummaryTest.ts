import DateUtils from '@libs/DateUtils';
import getInboxTabSummary from '@libs/LHNOrderIndex/getInboxTabSummary';
import type {LHNOrder} from '@libs/LHNOrderIndex/types';

import CONST from '@src/CONST';

import {addMinutes, startOfDay, subMinutes, subMonths} from 'date-fns';

/** The cutoff getInboxTabSummary measures against: the start of today, CONST.INBOX_TAB_STALE_UNREAD_MONTHS ago. */
const staleCutoff = () => subMonths(startOfDay(new Date()), CONST.INBOX_TAB_STALE_UNREAD_MONTHS);

function createOrder(order: Partial<LHNOrder>): LHNOrder {
    return {reportIDs: [], todoReportIDs: [], unreadReportIDs: [], oldestUnreadActionCreated: undefined, ...order};
}

describe('getInboxTabSummary', () => {
    it('should return zero counts and no stale report for an empty order', () => {
        // Given an empty order

        // When it is summarized
        const summary = getInboxTabSummary(createOrder({}));

        // Then both tabs are empty and nothing is stale
        expect(summary).toEqual({counts: {[CONST.INBOX_TAB.TODO]: 0, [CONST.INBOX_TAB.UNREAD]: 0}, hasStaleUnreadReport: false});
    });

    it('should count the To-do and Unread tabs independently', () => {
        // Given three To-do reports and two unread ones, one of them in both tabs
        const order = createOrder({reportIDs: ['1', '2', '3', '4', '5'], todoReportIDs: ['1', '2', '4'], unreadReportIDs: ['3', '4'], oldestUnreadActionCreated: DateUtils.getDBTime()});

        // When it is summarized
        const summary = getInboxTabSummary(order);

        // Then each tab counts its own reports
        expect(summary.counts).toEqual({[CONST.INBOX_TAB.TODO]: 3, [CONST.INBOX_TAB.UNREAD]: 2});
    });

    it('should flag a stale unread report when its newest message predates the cutoff', () => {
        // Given an unread report whose newest message is four months old
        const order = createOrder({unreadReportIDs: ['1'], oldestUnreadActionCreated: DateUtils.getDBTime(subMonths(new Date(), 4).valueOf())});

        // When it is summarized
        const summary = getInboxTabSummary(order);

        // Then the Unread tab has a stale report
        expect(summary.hasStaleUnreadReport).toBe(true);
    });

    it('should not flag an unread report whose newest message is recent', () => {
        // Given an unread report whose newest message is a month old
        const order = createOrder({unreadReportIDs: ['1'], oldestUnreadActionCreated: DateUtils.getDBTime(subMonths(new Date(), 1).valueOf())});

        // When it is summarized
        const summary = getInboxTabSummary(order);

        // Then nothing is stale
        expect(summary.hasStaleUnreadReport).toBe(false);
    });

    it('should treat a message just before the cutoff as stale and one just after it as fresh', () => {
        // Given unread reports a minute either side of the cutoff
        const stale = createOrder({unreadReportIDs: ['1'], oldestUnreadActionCreated: DateUtils.getDBTime(subMinutes(staleCutoff(), 1).valueOf())});
        const fresh = createOrder({unreadReportIDs: ['1'], oldestUnreadActionCreated: DateUtils.getDBTime(addMinutes(staleCutoff(), 1).valueOf())});

        // When they are summarized

        // Then only the one before the cutoff is stale
        expect(getInboxTabSummary(stale).hasStaleUnreadReport).toBe(true);
        expect(getInboxTabSummary(fresh).hasStaleUnreadReport).toBe(false);
    });
});
