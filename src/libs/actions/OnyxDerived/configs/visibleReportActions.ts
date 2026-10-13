import {isActionableWhisperRequiringWritePermission, isActionOfType, isConciergeCategoryOptions, shouldReportActionBeVisible} from '@libs/ReportActionsUtils';
import {isSupportTicket} from '@libs/ReportUtils';

import createOnyxDerivedValueConfig from '@userActions/OnyxDerived/createOnyxDerivedValueConfig';
import {getMemberIDs} from '@userActions/OnyxDerived/utils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report, ReportAction, ReportActions} from '@src/types/onyx';
import type {VisibleReportActionsDerivedValue} from '@src/types/onyx/DerivedValues';

/**
 * Returns true if the action's visibility depends on runtime context that can't be cached,
 * such as write permissions, policy settings, or sibling actions.
 */
function shouldSkipCachingAction(action: ReportAction): boolean {
    return isActionableWhisperRequiringWritePermission(action) || isConciergeCategoryOptions(action) || isActionOfType(action, CONST.REPORT.ACTIONS.TYPE.MARKED_REIMBURSED);
}

/**
 * Builds a report's action-visibility map (keyed by `reportActionID`) from its full set of report
 * actions. Rebuilding the whole map rather than updating individual entries keeps deletions correct:
 * a removed action is absent from `reportActions`, so it drops out of the result.
 */
function computeReportVisibility(reportActions: ReportActions, currentUserAccountID: number | undefined, report: Report | undefined): Record<string, boolean> {
    const reportVisibility: Record<string, boolean> = {};
    const isSupportTicketReport = isSupportTicket(report);

    for (const [actionID, action] of Object.entries(reportActions)) {
        if (!action) {
            continue;
        }
        // Skip deprecated keys (e.g. sequenceNumber-keyed duplicates) so they
        // cannot overwrite the canonical entry's visibility with false.
        if (actionID !== action.reportActionID) {
            continue;
        }
        if (shouldSkipCachingAction(action)) {
            continue;
        }
        reportVisibility[action.reportActionID] = shouldReportActionBeVisible(action, actionID, undefined, currentUserAccountID, undefined, isSupportTicketReport);
    }

    return reportVisibility;
}

export default createOnyxDerivedValueConfig({
    key: ONYXKEYS.DERIVED.VISIBLE_REPORT_ACTIONS,
    // REPORT dependency is needed for the support ticket check, which reads only the report the actions belong to.
    // SESSION dependency is needed for whisper targeting when user changes.
    dependencies: [ONYXKEYS.COLLECTION.REPORT_ACTIONS, ONYXKEYS.SESSION, ONYXKEYS.COLLECTION.REPORT],
    // Every change copies the map and rebuilds the changed report's visibility from scratch.
    skipNullRemoval: true,
    compute: ([allReportActions, session, allReports], {sourceValues, currentValue, triggeredKeys}): VisibleReportActionsDerivedValue => {
        if (!allReportActions) {
            return {};
        }

        const currentUserAccountID = session?.accountID;

        // Recompute only the reports whose actions or report changed when we have a usable delta. Otherwise
        // recompute everything: on first load, when there's no delta, or on a SESSION change (the
        // user changed, which affects whisper targeting for every report). SESSION is checked via
        // triggeredKeys, not sourceValues, so a session cleared to `undefined` still forces the full recompute.
        const isIncremental = !!sourceValues && !triggeredKeys?.has(ONYXKEYS.SESSION) && !!currentValue;

        const result: VisibleReportActionsDerivedValue = isIncremental ? {...currentValue} : {};
        const reportIDsToProcess = isIncremental
            ? new Set([
                  ...getMemberIDs(ONYXKEYS.COLLECTION.REPORT_ACTIONS, sourceValues[ONYXKEYS.COLLECTION.REPORT_ACTIONS]),
                  ...getMemberIDs(ONYXKEYS.COLLECTION.REPORT, sourceValues[ONYXKEYS.COLLECTION.REPORT]),
              ])
            : getMemberIDs(ONYXKEYS.COLLECTION.REPORT_ACTIONS, allReportActions);

        for (const reportID of reportIDsToProcess) {
            const reportActions = allReportActions[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportID}`];

            // The report has no actions (removed entirely, or only its report changed), so it is dropped from the result.
            if (!reportActions) {
                delete result[reportID];
                continue;
            }

            result[reportID] = computeReportVisibility(reportActions, currentUserAccountID, allReports?.[`${ONYXKEYS.COLLECTION.REPORT}${reportID}`]);
        }

        return result;
    },
});
