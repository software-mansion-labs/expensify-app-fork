import {useCurrencyListActions} from '@hooks/useCurrencyList';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useDelegateAccountID from '@hooks/useDelegateAccountID';
import useOnyx from '@hooks/useOnyx';
import usePermissions from '@hooks/usePermissions';
import {usePersonalDetailsByIDs} from '@hooks/usePersonalDetails';
import usePersonalPolicy from '@hooks/usePersonalPolicy';

import {updateMultipleMoneyRequests} from '@libs/actions/IOU/BulkEdit';
import Log from '@libs/Log';
import Navigation from '@libs/Navigation/Navigation';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {TransactionChanges} from '@src/types/onyx/Transaction';

import {useEffect, useRef} from 'react';

import type {ExpensesEdit} from './types';

/** Bulk edit keys tag changes by tag list level, and Siri only offers the first level */
const FIRST_TAG_LIST_INDEX = '0';

type ApplyExpensesEditProps = {
    /** The change Siri asked for */
    edit: ExpensesEdit;

    /** Called once the change is applied or cannot be */
    onDone: () => void;
};

/**
 * Writes the category, tag or description Siri asked for onto several expenses with the same bulk edit the Search
 * page uses, one workspace at a time, then opens Search on the changed expenses. It is only mounted while a Siri
 * request is in progress, so it can read every expense and report without slowing down the rest of the app.
 */
function ApplyExpensesEdit({edit, onDone}: ApplyExpensesEditProps) {
    const {isBetaEnabledOrUnknown} = usePermissions();
    const {getCurrencyDecimals, getCurrencySymbol} = useCurrencyListActions();
    const {accountID: currentUserAccountID} = useCurrentUserPersonalDetails();
    const personalPolicy = usePersonalPolicy();
    const delegateAccountID = useDelegateAccountID();
    const [policies, policiesMetadata] = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    const [allTransactions, transactionsMetadata] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION);
    const [allReports, reportsMetadata] = useOnyx(ONYXKEYS.COLLECTION.REPORT);
    const [allReportActions, reportActionsMetadata] = useOnyx(ONYXKEYS.COLLECTION.REPORT_ACTIONS);
    const [allPolicyTags] = useOnyx(ONYXKEYS.COLLECTION.POLICY_TAGS);
    const [allPolicyTagsLoadingStates] = useOnyx(ONYXKEYS.COLLECTION.RAM_ONLY_POLICY_TAGS_LOADING_STATE);
    const [allPolicyCategories] = useOnyx(ONYXKEYS.COLLECTION.POLICY_CATEGORIES);
    const [allTransactionViolations] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS);
    const [reportNameValuePairs] = useOnyx(ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS);
    const [rules] = useOnyx(ONYXKEYS.COLLECTION.RULE);
    const transactionIDs = edit.groups.flatMap((group) => group.transactionIDs);
    const [personalDetailsList] = usePersonalDetailsByIDs(
        transactionIDs.map((transactionID) => {
            const iouReportID = allTransactions?.[`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`]?.reportID;
            return allReports?.[`${ONYXKEYS.COLLECTION.REPORT}${iouReportID}`]?.ownerAccountID;
        }),
    );

    const isLoaded = [policiesMetadata, transactionsMetadata, reportsMetadata, reportActionsMetadata].every((metadata) => metadata.status === 'loaded');
    const hasAppliedEdit = useRef(false);

    useEffect(() => {
        if (!isLoaded || hasAppliedEdit.current) {
            return;
        }
        hasAppliedEdit.current = true;

        for (const group of edit.groups) {
            const changes: TransactionChanges = {};
            if (group.category) {
                changes.category = group.category;
            }
            if (group.tag) {
                changes.tag = group.tag;
            }
            if (edit.description) {
                changes.comment = edit.description;
            }

            try {
                updateMultipleMoneyRequests({
                    isVendorMatchingBetaEnabled: isBetaEnabledOrUnknown(CONST.BETAS.VENDOR_MATCHING),
                    transactionIDs: group.transactionIDs,
                    changes,
                    bulkEditTagChanges: group.tag ? {[FIRST_TAG_LIST_INDEX]: group.tag} : undefined,
                    policy: policies?.[`${ONYXKEYS.COLLECTION.POLICY}${group.policyID}`],
                    reports: allReports,
                    transactions: allTransactions,
                    reportActions: allReportActions,
                    policyCategories: allPolicyCategories,
                    policyTags: allPolicyTags,
                    policyTagsLoadingStates: allPolicyTagsLoadingStates,
                    violations: allTransactionViolations,
                    reportNameValuePairs,
                    allPolicies: policies,
                    currentUserAccountID,
                    delegateAccountID,
                    personalPolicyOutputCurrency: personalPolicy?.outputCurrency,
                    personalDetailsList,
                    getCurrencyDecimals,
                    getCurrencySymbol,
                    rules,
                });
            } catch (error) {
                Log.warn('[AppIntents] Could not edit the expenses', {policyID: group.policyID, error});
            }
        }

        if (edit.query) {
            Navigation.navigate(ROUTES.SEARCH_ROOT.getRoute({query: edit.query}));
        }
        onDone();
    });

    return null;
}

export default ApplyExpensesEdit;
