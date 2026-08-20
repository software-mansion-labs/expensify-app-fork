import useDrainedOnyxQuery from '@hooks/useDrainedOnyxQuery';
import useOnyx from '@hooks/useOnyx';
import usePolicy from '@hooks/usePolicy';
import useViolationsForTransactionIDs from '@hooks/useViolationsForTransactionIDs';

import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy, Report, Transaction} from '@src/types/onyx';
import type {ReportTransactionsAndViolationsDerivedValue} from '@src/types/onyx/DerivedValues';
import type {OnyxValueWithOfflineFeedback} from '@src/types/onyx/OnyxCommon';

import {useMemo} from 'react';

import type PolicyData from './types';

const QUERY_BATCH_SIZE = 500;
const QUERY_MAX_WINDOW = 10000;

/**
 * Retrieves policy tags, categories, reports and their associated transactions and violations.
 *
 * Lazy-Onyx POC (derived retirement): the policy's reports come from a live indexed query
 * (`where policyID = X`), their transactions from one `reportID IN (...)` query, and violations from
 * targeted member reads — replacing the whole-app REPORT_TRANSACTIONS_AND_VIOLATIONS derived value
 * and the whole-report-collection selector, neither of which could be served without hydrating
 * entire collections.
 *
 * @param policyID The ID of the policy to retrieve data for.
 * @returns An object containing policy data
 */
function usePolicyData(policyID?: string): PolicyData {
    const policy = usePolicy(policyID);
    const [tags] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY_TAGS}${policyID}`);
    const [categories] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY_CATEGORIES}${policyID}`);

    const {items: reportItems} = useDrainedOnyxQuery(ONYXKEYS.COLLECTION.REPORT, {
        where: [{field: 'policyID', operator: 'eq', value: policyID ?? ''}],
        orderBy: {field: 'reportID', direction: 'asc'},
        batchSize: QUERY_BATCH_SIZE,
        maxWindowSize: QUERY_MAX_WINDOW,
    });

    const reportIDs = useMemo(() => reportItems.map((item) => item.key.replace(ONYXKEYS.COLLECTION.REPORT, '')), [reportItems]);

    const {items: transactionItems} = useDrainedOnyxQuery(ONYXKEYS.COLLECTION.TRANSACTION, {
        where: [{field: 'reportID', operator: 'in', value: reportIDs.length > 0 ? reportIDs : ['']}],
        orderBy: {field: 'created', direction: 'asc'},
        batchSize: QUERY_BATCH_SIZE,
        maxWindowSize: QUERY_MAX_WINDOW,
    });

    const transactionIDs = useMemo(() => transactionItems.map((item) => item.key.replace(ONYXKEYS.COLLECTION.TRANSACTION, '')), [transactionItems]);
    const {violations} = useViolationsForTransactionIDs(transactionIDs);

    // Group transactions and their violations per report, keyed by bare reportID — the exact shape
    // the derived value used to provide. Only reports that HAVE transactions are included, matching
    // the previous semantics.
    const transactionsAndViolations = useMemo(() => {
        const grouped: ReportTransactionsAndViolationsDerivedValue = {};
        for (const item of transactionItems) {
            const transaction = item.value as Transaction;
            const reportID = transaction?.reportID;
            if (!reportID) {
                continue;
            }
            if (!grouped[reportID]) {
                grouped[reportID] = {transactions: {}, violations: {}};
            }
            grouped[reportID].transactions[item.key] = transaction;
            const violationKey = `${ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS}${transaction.transactionID}`;
            const transactionViolations = violations[violationKey];
            if (transactionViolations) {
                grouped[reportID].violations[violationKey] = transactionViolations;
            }
        }
        return grouped;
    }, [transactionItems, violations]);

    const reports = useMemo(
        () =>
            reportItems
                .map((item) => item.value as Report)
                .filter((report) => {
                    const reportID = report?.reportID;
                    return !!reportID && !!transactionsAndViolations[reportID];
                }),
        [reportItems, transactionsAndViolations],
    );

    return {
        transactionsAndViolations,
        tags: tags ?? {},
        categories: categories ?? {},
        policy: policy as OnyxValueWithOfflineFeedback<Policy>,
        reports: reports as Array<OnyxValueWithOfflineFeedback<Report>>,
    };
}

export default usePolicyData;
