import ONYXKEYS from '@src/ONYXKEYS';
import type {Transaction, TransactionViolations} from '@src/types/onyx';
import type {ReportTransactionsAndViolationsDerivedValue} from '@src/types/onyx/DerivedValues';

import type {OnyxCollection} from 'react-native-onyx';

import {useMemo} from 'react';

import useOnyx from './useOnyx';

/**
 * Subscribes only to the violations of the given transactions instead of the whole collection, so a violation change
 * in an unrelated report does not re-render the consumer.
 *
 * Lazy-Onyx POC (A4-T1): reads the REPORT_TRANSACTIONS_AND_VIOLATIONS derived value (a per-report
 * grouping maintained incrementally) instead of subscribing to the whole transactionViolations_
 * collection — a collection-root subscription would force the entire collection to hydrate.
 * The returned shape is identical to the previous implementation: one entry per requested
 * transaction, keyed by the full violation key, with `undefined` for violation-less transactions.
 */
function useReportTransactionViolations(transactions: Transaction[]) {
    const violationLookups = useMemo(() => transactions.map((transaction) => ({transactionID: transaction.transactionID, reportID: transaction.reportID})), [transactions]);
    return useOnyx(ONYXKEYS.DERIVED.REPORT_TRANSACTIONS_AND_VIOLATIONS, {
        selector: (derived: ReportTransactionsAndViolationsDerivedValue | undefined): OnyxCollection<TransactionViolations> => {
            const result: OnyxCollection<TransactionViolations> = {};
            for (const {transactionID, reportID} of violationLookups) {
                const key = `${ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS}${transactionID}` as const;
                result[key] = reportID ? derived?.[reportID]?.violations?.[key] : undefined;
            }
            return result;
        },
    });
}

export default useReportTransactionViolations;
