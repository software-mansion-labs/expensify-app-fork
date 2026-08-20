import {getTransactionViolations} from '@libs/TransactionUtils';

import ONYXKEYS from '@src/ONYXKEYS';
import {personalDetailsLoginSelector} from '@src/selectors/PersonalDetails';
import type {TransactionViolations} from '@src/types/onyx';

import useCurrentUserPersonalDetails from './useCurrentUserPersonalDetails';
import useOnyx from './useOnyx';
import useQueriedReportTransactionsAndViolations from './useQueriedReportTransactionsAndViolations';

function useTransactionsAndViolationsForReport(reportID?: string) {
    // Lazy-Onyx POC: the report's transactions/violations are computed on demand (indexed query +
    // targeted member reads) instead of being sliced out of the whole-app derived value.
    const {transactions, violations, isLoaded} = useQueriedReportTransactionsAndViolations(reportID);
    const currentUserDetails = useCurrentUserPersonalDetails();
    const [report] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`);
    const [reportOwnerLogin] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST, {selector: personalDetailsLoginSelector(report?.ownerAccountID)});
    const [policy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${report?.policyID}`);

    const filteredViolations: Record<string, TransactionViolations> = {};
    for (const transactionViolationKey of Object.keys(violations)) {
        const transactionID = transactionViolationKey.split('_').at(1) ?? '';
        const transaction = transactions[`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`];
        filteredViolations[transactionViolationKey] =
            getTransactionViolations(transaction, violations, currentUserDetails.email ?? '', currentUserDetails.accountID, report, reportOwnerLogin, policy) ?? [];
    }

    return {transactions, violations: filteredViolations, isLoaded};
}

export default useTransactionsAndViolationsForReport;
