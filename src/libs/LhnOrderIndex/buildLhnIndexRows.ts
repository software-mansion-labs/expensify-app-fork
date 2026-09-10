import type {ReportsToDisplayInLHN} from '@hooks/useSidebarOrderedReports';

import {getReportName} from '@libs/ReportNameUtils';
import {isArchivedNonExpenseReport} from '@libs/ReportUtils';
import SidebarUtils from '@libs/SidebarUtils';
import type {LhnIndexRow} from '@libs/SqlEngine/wasm/protocol';
import {LHN_BUCKET} from '@libs/SqlEngine/wasm/protocol';

import ONYXKEYS from '@src/ONYXKEYS';

import type {LhnIndexInputs} from './types';

type DisplayedReport = ReportsToDisplayInLHN[string];

/**
 * Which of the five LHN groups a report belongs to. It is `categorizeReportsForLHN` with the branches kept in the
 * same order, over one report instead of the whole displayed set.
 */
function getBucket(report: DisplayedReport, isArchived: boolean, hasDraft: boolean): number {
    if (report.isPinned || report.requiresAttention) {
        return LHN_BUCKET.PINNED_AND_GBR;
    }
    if (report.hasErrorsOtherThanFailedReceipt && !isArchived) {
        return LHN_BUCKET.ERROR;
    }
    if (hasDraft) {
        return LHN_BUCKET.DRAFT;
    }
    return isArchived ? LHN_BUCKET.ARCHIVED : LHN_BUCKET.NON_ARCHIVED;
}

/**
 * One row of the LHN index. The sort key comes from the same `buildSortKey` the JS sort uses, so the engine orders
 * on the App's own key rather than on a name SQLite would collate its own way.
 */
function buildLhnIndexRow(report: DisplayedReport, inputs: LhnIndexInputs): LhnIndexRow {
    const reportID = report.reportID;
    const privateIsArchived = inputs.reportNameValuePairs?.[`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${reportID}`]?.private_isArchived;
    const isArchived = isArchivedNonExpenseReport(report, !!privateIsArchived);
    // The same name the sidebar's own categorize step reads, sourced from the derived attributes.
    const displayName = getReportName(report, inputs.reportAttributes?.[reportID]?.reportName);

    return {
        reportID,
        bucket: getBucket(report, isArchived, !!inputs.draftComments?.[`${ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}${reportID}`]),
        sortKey: SidebarUtils.buildSortKey(displayName),
        lastVisibleActionCreated: report.lastVisibleActionCreated ?? '',
        isUnread: !!report.isUnreadReport,
        isTodo: SidebarUtils.getIsTodoReportForInboxTab(report),
    };
}

/** The rows for a list of report ids, skipping ids the LHN no longer displays. */
function buildLhnIndexRows(reportIDs: readonly string[], inputs: LhnIndexInputs): LhnIndexRow[] {
    const rows: LhnIndexRow[] = [];
    for (const reportID of reportIDs) {
        const report = inputs.reportsToDisplay[`${ONYXKEYS.COLLECTION.REPORT}${reportID}`];
        if (report) {
            rows.push(buildLhnIndexRow(report, inputs));
        }
    }
    return rows;
}

export {buildLhnIndexRow, buildLhnIndexRows, getBucket};
