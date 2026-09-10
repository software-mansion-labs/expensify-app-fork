import {buildPersonalDetailsOptions, processReport} from '@libs/OptionsListUtils';
import type {OptionList, SearchOption} from '@libs/OptionsListUtils';

import ONYXKEYS from '@src/ONYXKEYS';
import type {PersonalDetails, Report} from '@src/types/onyx';

import type {SearchCandidateIDs, SearchOptionsFormatConfig, SearchOptionsIndexInputs} from './types';

/**
 * Turns the matcher's ids into the option list `getSearchOptions` expects, built the way `createFilteredOptionList`
 * builds it, but only for the candidates instead of every report and contact of the account.
 */
function buildCandidateOptionList(
    candidates: SearchCandidateIDs,
    inputs: SearchOptionsIndexInputs,
    dmReportIDByAccountID: ReadonlyMap<number, string>,
    formatConfig: SearchOptionsFormatConfig,
): OptionList {
    const reports: Array<SearchOption<Report>> = [];
    for (const reportID of candidates.reportIDs) {
        const report = inputs.reports?.[`${ONYXKEYS.COLLECTION.REPORT}${reportID}`];
        if (!report) {
            continue;
        }
        const {reportOption} = processReport(
            report,
            inputs.personalDetails,
            inputs.privateIsArchivedMap[`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${reportID}`],
            inputs.policies?.[`${ONYXKEYS.COLLECTION.POLICY}${report.policyID}`],
            inputs.conciergeReportID,
            formatConfig.dateFnsLocale,
            {
                convertToDisplayString: formatConfig.convertToDisplayString,
                reportAttributesDerived: inputs.reportAttributes,
                visibleReportActionsData: formatConfig.visibleReportActionsData,
                isTrackIntentUser: formatConfig.isTrackIntentUser,
                sortedActions: formatConfig.sortedActions,
                currentUserAccountID: inputs.currentUserAccountID,
            },
        );
        if (reportOption) {
            reports.push(reportOption);
        }
    }

    const reportMapForAccountIDs: Record<number, Report> = {};
    const candidateDetails: PersonalDetails[] = [];
    for (const accountIDString of candidates.accountIDs) {
        const detail = inputs.personalDetails?.[accountIDString];
        if (!detail) {
            continue;
        }
        candidateDetails.push(detail);
        const accountID = Number(accountIDString);
        const dmReportID = dmReportIDByAccountID.get(accountID);
        const dmReport = dmReportID ? inputs.reports?.[`${ONYXKEYS.COLLECTION.REPORT}${dmReportID}`] : undefined;
        if (dmReport) {
            reportMapForAccountIDs[accountID] = dmReport;
        }
    }

    const personalDetails = buildPersonalDetailsOptions(
        reportMapForAccountIDs,
        {
            personalDetails: inputs.personalDetails,
            policiesCollection: inputs.policies,
            reportAttributesDerived: inputs.reportAttributes,
            policyTags: formatConfig.allPolicyTags,
            visibleReportActionsData: formatConfig.visibleReportActionsData ?? {},
            privateIsArchivedMap: inputs.privateIsArchivedMap,
            conciergeReportID: inputs.conciergeReportID,
            currentUserAccountID: inputs.currentUserAccountID,
            dateFnsLocale: formatConfig.dateFnsLocale,
            translate: formatConfig.translate,
            convertToDisplayString: formatConfig.convertToDisplayString,
        },
        candidateDetails,
    );

    return {reports, personalDetails};
}

export default buildCandidateOptionList;
