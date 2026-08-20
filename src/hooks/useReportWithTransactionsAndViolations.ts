import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report, Transaction, TransactionViolation} from '@src/types/onyx';

import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';

import {useMemo} from 'react';

import useNetwork from './useNetwork';
import useOnyx from './useOnyx';
import useQueriedReportTransactionsAndViolations from './useQueriedReportTransactionsAndViolations';

const DEFAULT_FILTERED_TRANSACTIONS: Transaction[] = [];

function useReportWithTransactionsAndViolations(reportID?: string): [OnyxEntry<Report>, Transaction[], OnyxCollection<TransactionViolation[]>] {
    const [report] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`);

    // Lazy-Onyx POC: computed on demand (indexed query + targeted member reads) instead of being
    // sliced out of the whole-app derived value.
    const {transactions, violations} = useQueriedReportTransactionsAndViolations(reportID);
    const {isOffline} = useNetwork();
    const filteredTransactions = useMemo(
        () => Object.values(transactions).filter((transaction) => isOffline || transaction?.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE),
        [transactions, isOffline],
    );

    return [report, filteredTransactions ?? DEFAULT_FILTERED_TRANSACTIONS, violations];
}

export default useReportWithTransactionsAndViolations;
