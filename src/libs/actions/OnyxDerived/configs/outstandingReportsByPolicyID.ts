import {isExpenseReport} from '@libs/ReportUtils';

import createOnyxDerivedValueConfig from '@userActions/OnyxDerived/createOnyxDerivedValueConfig';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {OutstandingReportsByPolicyIDDerivedValue, Report} from '@src/types/onyx';

// Where each report currently sits in the derived map (keyed by the FULL report key, matching the
// derived value's entry keys), so an incremental update can remove it from its previous policy
// bucket when it moves, stops qualifying, or is deleted.
let reportIDToPolicyIDMapping: Record<string, string> = {};

/**
 * Whether the report belongs in the outstanding map. Kept in sync with getOutstandingReportsForUser:
 * an expense report on a workspace, open or submitted, not pending deletion.
 */
function isOutstanding(report: Report | undefined): report is Report & {policyID: string} {
    return (
        !!report &&
        isExpenseReport(report) &&
        !!report.policyID &&
        report?.pendingFields?.preview !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE &&
        (report.stateNum ?? CONST.REPORT.STATE_NUM.OPEN) <= CONST.REPORT.STATE_NUM.SUBMITTED
    );
}

export default createOnyxDerivedValueConfig({
    key: ONYXKEYS.DERIVED.OUTSTANDING_REPORTS_BY_POLICY_ID,
    dependencies: [ONYXKEYS.COLLECTION.REPORT],
    compute: ([reports], {sourceValues, currentValue}) => {
        if (!reports) {
            return {};
        }

        // With a delta, only the changed reports are reprocessed — previously this config rescanned
        // the ENTIRE report collection on every report_ write (it had no incremental path at all).
        const reportsUpdates = sourceValues?.[ONYXKEYS.COLLECTION.REPORT];
        const reportKeysToProcess = reportsUpdates && currentValue ? Object.keys(reportsUpdates) : Object.keys(reports);

        const outstandingReportsByPolicyID: OutstandingReportsByPolicyIDDerivedValue = reportsUpdates && currentValue ? {...currentValue} : {};

        // Clone each touched policy bucket once, so the cached previous value is never mutated.
        const clonedPolicyIDs = new Set<string>();
        const ensureCloned = (policyID: string) => {
            if (clonedPolicyIDs.has(policyID) || !outstandingReportsByPolicyID[policyID]) {
                return;
            }
            outstandingReportsByPolicyID[policyID] = {...outstandingReportsByPolicyID[policyID]};
            clonedPolicyIDs.add(policyID);
        };

        for (const reportKey of reportKeysToProcess) {
            const report = reports[reportKey];

            // Remove from the previous bucket when the report moved policies, stopped qualifying, or was deleted.
            const previousPolicyID = reportIDToPolicyIDMapping[reportKey];
            if (previousPolicyID && previousPolicyID !== report?.policyID && outstandingReportsByPolicyID[previousPolicyID]) {
                ensureCloned(previousPolicyID);
                delete outstandingReportsByPolicyID[previousPolicyID][reportKey];
                if (Object.keys(outstandingReportsByPolicyID[previousPolicyID]).length === 0) {
                    delete outstandingReportsByPolicyID[previousPolicyID];
                }
            }

            if (!isOutstanding(report)) {
                const currentPolicyID = report?.policyID ?? previousPolicyID;
                if (currentPolicyID && outstandingReportsByPolicyID[currentPolicyID]) {
                    ensureCloned(currentPolicyID);
                    delete outstandingReportsByPolicyID[currentPolicyID][reportKey];
                    if (Object.keys(outstandingReportsByPolicyID[currentPolicyID]).length === 0) {
                        delete outstandingReportsByPolicyID[currentPolicyID];
                    }
                }
                delete reportIDToPolicyIDMapping[reportKey];
                continue;
            }

            if (!outstandingReportsByPolicyID[report.policyID]) {
                outstandingReportsByPolicyID[report.policyID] = {};
                clonedPolicyIDs.add(report.policyID);
            } else {
                ensureCloned(report.policyID);
            }
            const policyBucket = outstandingReportsByPolicyID[report.policyID];
            if (policyBucket) {
                policyBucket[reportKey] = report;
            }
            reportIDToPolicyIDMapping[reportKey] = report.policyID;
        }

        return outstandingReportsByPolicyID;
    },
    // On cache clear, drop the cross-compute state so the map is rebuilt from scratch (see the engine's resetForClear).
    onReset: () => {
        reportIDToPolicyIDMapping = {};
    },
});
