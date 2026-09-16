import getNonEmptyStringOnyxID from '@libs/getNonEmptyStringOnyxID';
import {buildPersonalDetailShell, processReport} from '@libs/OptionsListUtils';
import type {LazyHydrationContext, OptionList, PersonalDetailShell, SearchOption} from '@libs/OptionsListUtils/types';

import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';

import type {OptionIndex} from './OptionIndex';
import type {SearchCandidates, SearchOptionsFormatConfig, SearchOptionsIndexInputs} from './types';

/** The context the shell of a contact captures, assembled from the same snapshots the rows were built from. */
function buildHydrationContext(inputs: SearchOptionsIndexInputs, formatConfig: SearchOptionsFormatConfig): LazyHydrationContext {
    return {
        personalDetails: inputs.personalDetails,
        policiesCollection: inputs.policies,
        reportAttributesDerived: inputs.reportAttributes,
        privateIsArchivedMap: inputs.privateIsArchivedMap,
        conciergeReportID: inputs.conciergeReportID,
        currentUserAccountID: inputs.currentUserAccountID,
        policyTags: formatConfig.allPolicyTags,
        visibleReportActionsData: formatConfig.visibleReportActionsData ?? {},
        dateFnsLocale: formatConfig.dateFnsLocale,
        translate: formatConfig.translate,
        convertToDisplayString: formatConfig.convertToDisplayString,
    };
}

function buildReportOptions(reportIDs: string[], inputs: SearchOptionsIndexInputs, formatConfig: SearchOptionsFormatConfig): Array<SearchOption<Report>> {
    const reportOptions: Array<SearchOption<Report>> = [];

    for (const reportID of reportIDs) {
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
                currentUserAccountID: inputs.currentUserAccountID,
                convertToDisplayString: formatConfig.convertToDisplayString,
                reportAttributesDerived: inputs.reportAttributes,
                policyTags: formatConfig.allPolicyTags?.[`${ONYXKEYS.COLLECTION.POLICY_TAGS}${getNonEmptyStringOnyxID(report.policyID)}`],
                visibleReportActionsData: formatConfig.visibleReportActionsData,
                isTrackIntentUser: formatConfig.isTrackIntentUser,
                sortedActions: formatConfig.sortedActions,
            },
            inputs.rules,
        );
        if (reportOption) {
            reportOptions.push(reportOption);
        }
    }

    return reportOptions;
}

/** A contact shell displays the account's 1:1 DM report when it has one, which is where its avatar comes from. */
function buildContactShells(accountIDs: string[], index: OptionIndex, formatConfig: SearchOptionsFormatConfig): PersonalDetailShell[] {
    const inputs = index.getInputs();
    const context = buildHydrationContext(inputs, formatConfig);
    const shells: PersonalDetailShell[] = [];

    for (const accountID of accountIDs) {
        const detail = inputs.personalDetails?.[accountID];
        if (!detail) {
            continue;
        }
        const dmReportID = index.dmReportIDByAccountID.get(Number(accountID));
        const dmReport = dmReportID ? inputs.reports?.[`${ONYXKEYS.COLLECTION.REPORT}${dmReportID}`] : undefined;
        shells.push(buildPersonalDetailShell(detail, dmReport ?? undefined, context, inputs.rules));
    }

    return shells;
}

/**
 * The option list `getSearchOptions` expects, built the way `createFilteredOptionList` builds it but only for the
 * candidates of one query instead of every report and contact of the account.
 */
function buildCandidateOptionList(candidates: SearchCandidates, index: OptionIndex, formatConfig: SearchOptionsFormatConfig): OptionList {
    return {
        reports: buildReportOptions(candidates.reportIDs, index.getInputs(), formatConfig),
        personalDetails: buildContactShells(candidates.accountIDs, index, formatConfig),
    };
}

export default buildCandidateOptionList;
