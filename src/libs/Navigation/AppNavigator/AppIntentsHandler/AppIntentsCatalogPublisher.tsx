import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useDefaultExpensePolicy from '@hooks/useDefaultExpensePolicy';
import useOnyx from '@hooks/useOnyx';
import useTodoCounts from '@hooks/useTodoCounts';

import Log from '@libs/Log';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type {AppIntentEntity} from 'expo-app-intents';

import {setEntityCatalogAsync} from 'expo-app-intents';
import {useEffect} from 'react';

import {buildCategoryCatalog, buildExpenseCatalog, buildTagCatalog, catalogReportsSelector, catalogTransactionsSelector, getCatalogPolicyIDs} from './expenseCatalog';
import {APP_INTENT_ENTITY_KINDS} from './types';

function publishCatalog(kind: string, entities: AppIntentEntity[]) {
    setEntityCatalogAsync(kind, entities).catch((error: unknown) => Log.warn('[AppIntents] Could not publish a catalog', {kind, error}));
}

/**
 * Publishes the data Siri reads without opening the app: the user's expenses with the categories and tags of their
 * workspaces, used to find and edit expenses, and the to-do counts read out by "What do I need to do". The catalogs
 * are stored natively, so they are still there after the app is closed.
 */
function AppIntentsCatalogPublisher() {
    const {accountID} = useCurrentUserPersonalDetails();
    const defaultExpensePolicy = useDefaultExpensePolicy();
    const [catalogTransactions] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION, {selector: catalogTransactionsSelector});
    const [catalogReports] = useOnyx(ONYXKEYS.COLLECTION.REPORT, {selector: catalogReportsSelector});
    const [allPolicyCategories] = useOnyx(ONYXKEYS.COLLECTION.POLICY_CATEGORIES);
    const [allPolicyTags] = useOnyx(ONYXKEYS.COLLECTION.POLICY_TAGS);
    const {counts} = useTodoCounts();
    const submitCount = counts[CONST.SEARCH.SEARCH_KEYS.SUBMIT];
    const approveCount = counts[CONST.SEARCH.SEARCH_KEYS.APPROVE];
    const payCount = counts[CONST.SEARCH.SEARCH_KEYS.PAY];
    const exportCount = counts[CONST.SEARCH.SEARCH_KEYS.EXPORT];

    const expenseCatalog = buildExpenseCatalog(catalogTransactions, catalogReports, accountID, defaultExpensePolicy?.id);
    const policyIDs = getCatalogPolicyIDs(expenseCatalog);

    useEffect(() => {
        publishCatalog(APP_INTENT_ENTITY_KINDS.EXPENSE, expenseCatalog);
    }, [expenseCatalog]);

    useEffect(() => {
        publishCatalog(APP_INTENT_ENTITY_KINDS.EXPENSE_CATEGORY, buildCategoryCatalog(policyIDs, allPolicyCategories));
        publishCatalog(APP_INTENT_ENTITY_KINDS.EXPENSE_TAG, buildTagCatalog(policyIDs, allPolicyTags));
    }, [policyIDs, allPolicyCategories, allPolicyTags]);

    useEffect(() => {
        const summary = {
            id: 'summary',
            title: 'To-dos',
            hideInSpotlight: true,
            metadata: {
                [CONST.SEARCH.SEARCH_KEYS.SUBMIT]: String(submitCount),
                [CONST.SEARCH.SEARCH_KEYS.APPROVE]: String(approveCount),
                [CONST.SEARCH.SEARCH_KEYS.PAY]: String(payCount),
                [CONST.SEARCH.SEARCH_KEYS.EXPORT]: String(exportCount),
            },
        };
        publishCatalog(APP_INTENT_ENTITY_KINDS.TODO_SUMMARY, [summary]);
    }, [submitCount, approveCount, payCount, exportCount]);

    return null;
}

export default AppIntentsCatalogPublisher;
