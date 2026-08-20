import type {Transaction} from '@src/types/onyx';

import type {OnyxCollection} from 'react-native-onyx';

import useQueriedReportTransactionsAndViolations from './useQueriedReportTransactionsAndViolations';

function useReportTransactionsCollection(reportID?: string): OnyxCollection<Transaction> {
    // Lazy-Onyx POC: an on-demand indexed query for this report's transactions instead of a
    // selector over the whole-app derived value.
    const {transactions} = useQueriedReportTransactionsAndViolations(reportID);
    return transactions;
}

export default useReportTransactionsCollection;
