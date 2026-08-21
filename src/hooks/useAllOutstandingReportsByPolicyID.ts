import {isExpenseReport} from '@libs/ReportUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {OutstandingReportsByPolicyIDDerivedValue, Report} from '@src/types/onyx';

import {useMemo} from 'react';

import useDrainedOnyxQuery from './useDrainedOnyxQuery';

/** One fetch typically covers every outstanding report; loadMore drains the rare larger sets. */
const REPORTS_BATCH_SIZE = 500;
const REPORTS_MAX_WINDOW = 10000;

/**
 * Whether the report belongs in the outstanding map — kept identical to the retired
 * OUTSTANDING_REPORTS_BY_POLICY_ID derived config's predicate (and to getOutstandingReportsForUser):
 * an expense report on a workspace, open or submitted, not pending deletion.
 */
function isOutstandingReport(report: Report | undefined): report is Report & {policyID: string} {
    return (
        !!report &&
        isExpenseReport(report) &&
        !!report.policyID &&
        report?.pendingFields?.preview !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE &&
        (report.stateNum ?? CONST.REPORT.STATE_NUM.OPEN) <= CONST.REPORT.STATE_NUM.SUBMITTED
    );
}

/**
 * Groups outstanding reports by policyID into the exact shape the retired derived value had:
 * `{[policyID]: {[report_<id>]: Report}}`. Pure — also used by tests to build the map from a seeded
 * report collection.
 */
function buildOutstandingReportsByPolicyID(reports: Record<string, Report | undefined>): OutstandingReportsByPolicyIDDerivedValue {
    const outstandingReportsByPolicyID: OutstandingReportsByPolicyIDDerivedValue = {};
    for (const [reportKey, report] of Object.entries(reports)) {
        if (!isOutstandingReport(report)) {
            continue;
        }
        let policyBucket = outstandingReportsByPolicyID[report.policyID];
        if (!policyBucket) {
            policyBucket = {};
            outstandingReportsByPolicyID[report.policyID] = policyBucket;
        }
        policyBucket[reportKey] = report;
    }
    return outstandingReportsByPolicyID;
}

/**
 * All outstanding reports across every policy, computed ON DEMAND (lazy-Onyx POC, derived
 * retirement): a live indexed query over expense reports replaces the retired
 * OUTSTANDING_REPORTS_BY_POLICY_ID derived value, whose engine had to subscribe to (and therefore
 * hydrate) the entire report collection to maintain the map. Only expense-type rows are read and
 * parsed; the state/pending-deletion conditions are applied in JS because `stateNum` may be absent
 * (counts as OPEN, which the SQL `lte` would wrongly exclude) and `pendingFields.preview` is a
 * nested field the query DSL cannot reach. Returns `undefined` until the first read completes,
 * matching the previous useOnyx semantics.
 */
function useAllOutstandingReportsByPolicyID(): OutstandingReportsByPolicyIDDerivedValue | undefined {
    const {items, isComplete} = useDrainedOnyxQuery(ONYXKEYS.COLLECTION.REPORT, {
        where: [{field: 'type', operator: 'eq', value: CONST.REPORT.TYPE.EXPENSE}],
        orderBy: {field: 'reportID', direction: 'asc'},
        batchSize: REPORTS_BATCH_SIZE,
        maxWindowSize: REPORTS_MAX_WINDOW,
    });

    return useMemo(() => {
        if (!isComplete) {
            return undefined;
        }
        const reports: Record<string, Report | undefined> = {};
        for (const item of items) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the query DSL returns untyped rows; every report_ collection value is a Report
            reports[item.key] = item.value as Report;
        }
        return buildOutstandingReportsByPolicyID(reports);
    }, [items, isComplete]);
}

export default useAllOutstandingReportsByPolicyID;
export {isOutstandingReport, buildOutstandingReportsByPolicyID};
