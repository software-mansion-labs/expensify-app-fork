import ONYXKEYS from '@src/ONYXKEYS';
import type {Transaction, TransactionViolations} from '@src/types/onyx';

import type {OnyxCollection, ResultMetadata} from 'react-native-onyx';

import {useMemo} from 'react';

import useViolationsForTransactionIDs from './useViolationsForTransactionIDs';

/**
 * Violations of the given transactions, computed on demand (lazy-Onyx POC): targeted member reads
 * kept live by a scoped write watcher — no whole-collection or derived-value subscription. The
 * returned shape matches the previous implementations: one entry per requested transaction, keyed by
 * the full violation key, with `undefined` for violation-less transactions, wrapped in a
 * useOnyx-style [value, metadata] tuple.
 */
function useReportTransactionViolations(transactions: Transaction[]): [OnyxCollection<TransactionViolations>, ResultMetadata] {
    const transactionIDs = useMemo(() => transactions.map((transaction) => transaction.transactionID), [transactions]);
    const {violations, isLoaded} = useViolationsForTransactionIDs(transactionIDs);

    const result = useMemo(() => {
        const violationsByKey: OnyxCollection<TransactionViolations> = {};
        for (const transactionID of transactionIDs) {
            const key = `${ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS}${transactionID}` as const;
            violationsByKey[key] = violations[key];
        }
        return violationsByKey;
    }, [transactionIDs, violations]);

    return useMemo(() => [result, {status: isLoaded ? 'loaded' : 'loading'}], [result, isLoaded]);
}

export default useReportTransactionViolations;
