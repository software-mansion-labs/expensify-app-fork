import {getReportName} from '@libs/ReportNameUtils';
import {isArchivedNonExpenseReport} from '@libs/ReportUtils';

import ONYXKEYS from '@src/ONYXKEYS';

import type {LHNOrderInputs, LHNOrderReport, LHNOrderRow} from './types';

import buildSortKey from './buildSortKey';
import getLHNOrderBucket from './getLHNOrderBucket';

/** Whether the report's name-value pairs mark it as archived. */
function hasArchiveFlag(reportID: string, reportNameValuePairs: LHNOrderInputs['reportNameValuePairs']): boolean {
    return !!reportNameValuePairs?.[`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${reportID}`]?.private_isArchived;
}

function hasDraftComment(reportID: string, draftComments: LHNOrderInputs['draftComments']): boolean {
    return !!draftComments?.[`${ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}${reportID}`];
}

function buildLHNOrderRow(report: LHNOrderReport, inputs: LHNOrderInputs): LHNOrderRow {
    const {reportID} = report;
    const isArchived = isArchivedNonExpenseReport(report, hasArchiveFlag(reportID, inputs.reportNameValuePairs));
    const displayName = getReportName(report, inputs.reportAttributes?.[reportID]?.reportName);

    return {
        reportID,
        bucket: getLHNOrderBucket(report, isArchived, hasDraftComment(reportID, inputs.draftComments)),
        displayName,
        sortKey: buildSortKey(displayName),
        lastVisibleActionCreated: report.lastVisibleActionCreated ?? '',
        isUnread: !!report.isUnreadReport,
        // The To-do tab lists the reports with an outstanding GBR (requiresAttention) or RBR (errors).
        isTodo: !!report.requiresAttention || !!report.hasErrorsOtherThanFailedReceipt,
    };
}

export default buildLHNOrderRow;
export {hasArchiveFlag, hasDraftComment};
