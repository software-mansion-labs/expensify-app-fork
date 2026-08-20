import ONYXKEYS from '@src/ONYXKEYS';
import type {Transaction, TransactionViolation} from '@src/types/onyx';

import {useMemo} from 'react';

import useDrainedOnyxQuery from './useDrainedOnyxQuery';
import useViolationsForTransactionIDs from './useViolationsForTransactionIDs';

type QueriedReportTransactionsAndViolations = {
    /** The report's transactions keyed by their full Onyx key (`transactions_<id>`), matching the retired derived value's shape. */
    transactions: Record<string, Transaction>;
    /** Non-empty violation lists keyed by their full Onyx key (`transactionViolations_<id>`). */
    violations: Record<string, TransactionViolation[]>;
    isLoaded: boolean;
};

/** One transaction fetch typically covers a whole report; loadMore drains the rare larger ones. */
const TRANSACTIONS_BATCH_SIZE = 500;
const TRANSACTIONS_MAX_WINDOW = 10000;

/**
 * A report's transactions and violations, computed ON DEMAND (lazy-Onyx POC, derived retirement):
 * transactions come from a live indexed query (`where reportID = X`, backed by the
 * `transactions_/reportID` index) and violations from targeted member reads for exactly those
 * transactions (kept live by a scoped write watcher). Nothing here hydrates a whole collection —
 * this replaces reads of the REPORT_TRANSACTIONS_AND_VIOLATIONS derived value, whose engine had to
 * subscribe to (and therefore hydrate) both full collections to serve any single report.
 */
function useQueriedReportTransactionsAndViolations(reportID?: string): QueriedReportTransactionsAndViolations {
    // Hooks can't be conditional — an undefined reportID queries for a value no transaction has.
    // Consumers expect the COMPLETE set (the derived value had no windowing), hence the drained query.
    const {items, isComplete} = useDrainedOnyxQuery(ONYXKEYS.COLLECTION.TRANSACTION, {
        where: [{field: 'reportID', operator: 'eq', value: reportID ?? ''}],
        orderBy: {field: 'created', direction: 'asc'},
        batchSize: TRANSACTIONS_BATCH_SIZE,
        maxWindowSize: TRANSACTIONS_MAX_WINDOW,
    });

    const transactions = useMemo(() => {
        const result: Record<string, Transaction> = {};
        for (const item of items) {
            result[item.key] = item.value as Transaction;
        }
        return result;
    }, [items]);

    const transactionIDs = useMemo(() => items.map((item) => item.key.replace(ONYXKEYS.COLLECTION.TRANSACTION, '')), [items]);
    const {violations, isLoaded: areViolationsLoaded} = useViolationsForTransactionIDs(transactionIDs);

    const isLoaded = isComplete && areViolationsLoaded;

    return useMemo(() => ({transactions, violations, isLoaded}), [transactions, violations, isLoaded]);
}

export default useQueriedReportTransactionsAndViolations;
export type {QueriedReportTransactionsAndViolations};
