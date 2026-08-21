import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';

import type {OnyxCollection} from 'react-native-onyx';

import {useMemo} from 'react';

import {isOutstandingReport} from './useAllOutstandingReportsByPolicyID';
import useDrainedOnyxQuery from './useDrainedOnyxQuery';

const REPORTS_BATCH_SIZE = 500;
const REPORTS_MAX_WINDOW = 10000;

/**
 * One policy's outstanding reports (the retired derived value's per-policy bucket: keyed by the
 * FULL report key), computed on demand via a live indexed query (`where policyID = X`, over the
 * report_/policyID index) — nothing here hydrates the report collection. State/pending-deletion
 * conditions are applied in JS (see useAllOutstandingReportsByPolicyID for why). Returns
 * `undefined` until the first read completes.
 */
function useOutstandingReportsForPolicy(policyID?: string): OnyxCollection<Report> {
    // Hooks can't be conditional — an undefined policyID queries for a value no report has
    // (the query DSL needs a defined scalar, so '' is a deliberate match-nothing probe, not a fallback ID).
    const {items, isComplete} = useDrainedOnyxQuery(ONYXKEYS.COLLECTION.REPORT, {
        where: [
            // eslint-disable-next-line rulesdir/no-default-id-values -- see above: '' matches no report by design
            {field: 'policyID', operator: 'eq', value: policyID ?? ''},
            {field: 'type', operator: 'eq', value: CONST.REPORT.TYPE.EXPENSE},
        ],
        orderBy: {field: 'reportID', direction: 'asc'},
        batchSize: REPORTS_BATCH_SIZE,
        maxWindowSize: REPORTS_MAX_WINDOW,
    });

    return useMemo(() => {
        if (!isComplete) {
            return undefined;
        }
        const outstandingReports: NonNullable<OnyxCollection<Report>> = {};
        for (const item of items) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the query DSL returns untyped rows; every report_ collection value is a Report
            const report = item.value as Report;
            if (!isOutstandingReport(report)) {
                continue;
            }
            outstandingReports[item.key] = report;
        }
        return outstandingReports;
    }, [items, isComplete]);
}

export default useOutstandingReportsForPolicy;
