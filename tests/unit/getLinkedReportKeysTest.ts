import getLinkedReportKeys from '@libs/getLinkedReportKeys';

import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';

const reportKey = (reportID: string) => `${ONYXKEYS.COLLECTION.REPORT}${reportID}`;

function toCollection(reports: Report[]): Record<string, Report> {
    return Object.fromEntries(reports.map((report) => [reportKey(report.reportID), report]));
}

describe('getLinkedReportKeys', () => {
    it('should link the displayed parent, chat, threads and expense reports of an updated report', () => {
        // Given a chat with a thread and an expense report, all displayed, and an unrelated chat
        const reports = toCollection([{reportID: '1'}, {reportID: '2', parentReportID: '1'}, {reportID: '3', chatReportID: '1'}, {reportID: '4'}]);

        // When the chat is updated, and then when its thread is updated
        const linkedToChat = getLinkedReportKeys([reportKey('1')], reports, reports);
        const linkedToThread = getLinkedReportKeys([reportKey('2')], reports, reports);

        // Then the chat links to the thread and the expense report, the thread links back to the chat, and the unrelated chat is never linked
        expect(linkedToChat.sort()).toEqual([reportKey('2'), reportKey('3')]);
        expect(linkedToThread).toEqual([reportKey('1')]);
    });

    it('should skip linked reports that are not displayed', () => {
        // Given a displayed thread whose parent chat is hidden, and a hidden thread of a displayed chat
        const reports = toCollection([{reportID: '1'}, {reportID: '2', parentReportID: '1'}, {reportID: '3'}, {reportID: '4', parentReportID: '3'}]);
        const displayedReports = {[reportKey('2')]: reports[reportKey('2')], [reportKey('3')]: reports[reportKey('3')]};

        // When the displayed thread and the displayed chat are updated
        const linkedKeys = getLinkedReportKeys([reportKey('2'), reportKey('3')], reports, displayedReports);

        // Then nothing is linked, because only displayed reports are rechecked and both updated reports are rechecked anyway
        expect(linkedKeys).toEqual([]);
    });

    it('should link the chat a moved expense report left', () => {
        // Given an expense report displayed in chat 1, which then moves to chat 2
        const displayedReports = toCollection([{reportID: '1'}, {reportID: '2'}, {reportID: '3', chatReportID: '1'}]);
        const reports = {...displayedReports, [reportKey('3')]: {reportID: '3', chatReportID: '2'}};

        // When the moved expense report is updated
        const linkedKeys = getLinkedReportKeys([reportKey('3')], reports, displayedReports);

        // Then both the chat it left and the chat it joined are linked
        expect(linkedKeys.sort()).toEqual([reportKey('1'), reportKey('2')]);
    });
});
