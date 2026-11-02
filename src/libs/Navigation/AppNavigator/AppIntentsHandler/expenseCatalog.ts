import {getDecodedCategoryName} from '@libs/CategoryUtils';
import {getCleanedTagName, getTagLists} from '@libs/PolicyUtils';
import {isExpenseReport, isOpenExpenseReport} from '@libs/ReportUtils';
import {getAmount, getCategory, getCreated, getCurrency, getDescription, getMerchant, getTag, isMerchantMissing} from '@libs/TransactionUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {PolicyCategories, PolicyTagLists, Report, Transaction} from '@src/types/onyx';

import type {AppIntentEntity} from 'expo-app-intents';
import type {OnyxCollection} from 'react-native-onyx';

/** The catalog is stored in UserDefaults, so only the newest expenses are published */
const MAX_CATALOG_EXPENSES = 200;

/** What the expense catalog needs from an expense report */
type CatalogReport = {
    ownerAccountID?: number;
    policyID?: string;
    isOpen: boolean;
};

/** What the expense catalog needs from an expense */
type CatalogTransaction = {
    transactionID: string;
    reportID?: string;
    merchant: string;
    amountInCents: number;
    currency: string;
    date: string;
    category: string;
    tag: string;
    description: string;
};

/** Sorts yyyy-MM-dd dates newest first. They compare as plain strings, so no locale is involved. */
function compareDatesDescending(a: string, b: string): number {
    if (a === b) {
        return 0;
    }
    return a > b ? -1 : 1;
}

function catalogReportsSelector(reports: OnyxCollection<Report>): Record<string, CatalogReport> {
    const catalogReports: Record<string, CatalogReport> = {};
    for (const report of Object.values(reports ?? {})) {
        if (!report?.reportID || !isExpenseReport(report)) {
            continue;
        }
        catalogReports[report.reportID] = {ownerAccountID: report.ownerAccountID, policyID: report.policyID, isOpen: isOpenExpenseReport(report)};
    }
    return catalogReports;
}

function catalogTransactionsSelector(transactions: OnyxCollection<Transaction>): CatalogTransaction[] {
    const catalogTransactions: CatalogTransaction[] = [];
    for (const transaction of Object.values(transactions ?? {})) {
        if (!transaction?.transactionID || transaction.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE) {
            continue;
        }
        catalogTransactions.push({
            transactionID: transaction.transactionID,
            reportID: transaction.reportID,
            merchant: isMerchantMissing(transaction) ? '' : getMerchant(transaction),
            amountInCents: getAmount(transaction),
            currency: getCurrency(transaction),
            date: getCreated(transaction).slice(0, 10),
            category: getCategory(transaction),
            tag: getTag(transaction),
            description: getDescription(transaction),
        });
    }
    return catalogTransactions;
}

/**
 * Builds the expenses Siri can search and edit: the current user's unreported expenses and the ones on their own
 * expense reports, newest first. `canEdit` marks the ones that are not submitted yet, which are the only ones Siri edits.
 */
function buildExpenseCatalog(
    transactions: CatalogTransaction[] | undefined,
    reports: Record<string, CatalogReport> | undefined,
    accountID: number,
    defaultPolicyID: string | undefined,
): AppIntentEntity[] {
    const ownExpenses: Array<{transaction: CatalogTransaction; policyID?: string; canEdit: boolean}> = [];
    for (const transaction of transactions ?? []) {
        const isUnreported = !transaction.reportID || transaction.reportID === CONST.REPORT.UNREPORTED_REPORT_ID;
        const report = transaction.reportID ? reports?.[transaction.reportID] : undefined;
        if (isUnreported) {
            // Unreported expenses have no workspace yet, so they take the categories and tags of the default one
            ownExpenses.push({transaction, policyID: defaultPolicyID, canEdit: true});
        } else if (report && report.ownerAccountID === accountID) {
            ownExpenses.push({transaction, policyID: report.policyID, canEdit: report.isOpen});
        }
    }

    return ownExpenses
        .sort((a, b) => compareDatesDescending(a.transaction.date, b.transaction.date))
        .slice(0, MAX_CATALOG_EXPENSES)
        .map(({transaction, policyID, canEdit}) => ({
            id: transaction.transactionID,
            title: transaction.merchant || transaction.description || 'Expense',
            subtitle: transaction.date,
            hideInSpotlight: true,
            metadata: {
                merchant: transaction.merchant,
                amountInCents: String(transaction.amountInCents),
                currency: transaction.currency,
                date: transaction.date,
                category: transaction.category,
                tag: transaction.tag,
                description: transaction.description,
                ...(policyID ? {policyID} : {}),
                canEdit: canEdit ? 'true' : 'false',
            },
        }));
}

function getCatalogPolicyIDs(expenseCatalog: AppIntentEntity[]): string[] {
    return [...new Set(expenseCatalog.map((expense) => expense.metadata?.policyID).filter((policyID): policyID is string => !!policyID))];
}

/** Builds the enabled categories of every workspace in the expense catalog, so Siri can only pick ones that exist */
function buildCategoryCatalog(policyIDs: string[], allPolicyCategories: OnyxCollection<PolicyCategories>): AppIntentEntity[] {
    return policyIDs.flatMap((policyID) =>
        Object.values(allPolicyCategories?.[`${ONYXKEYS.COLLECTION.POLICY_CATEGORIES}${policyID}`] ?? {})
            .filter((category) => category.enabled && category.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE)
            .map((category) => ({
                id: `${policyID}/${category.name}`,
                title: getDecodedCategoryName(category.name),
                hideInSpotlight: true,
                metadata: {policyID, name: category.name},
            })),
    );
}

/** Builds the enabled first-level tags of every workspace in the expense catalog */
function buildTagCatalog(policyIDs: string[], allPolicyTags: OnyxCollection<PolicyTagLists>): AppIntentEntity[] {
    return policyIDs.flatMap((policyID) => {
        const firstTagList = getTagLists(allPolicyTags?.[`${ONYXKEYS.COLLECTION.POLICY_TAGS}${policyID}`]).at(0);
        return Object.values(firstTagList?.tags ?? {})
            .filter((tag) => tag.enabled && tag.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE)
            .map((tag) => ({
                id: `${policyID}/${tag.name}`,
                title: getCleanedTagName(tag.name),
                hideInSpotlight: true,
                metadata: {policyID, name: tag.name},
            }));
    });
}

export {buildCategoryCatalog, buildExpenseCatalog, buildTagCatalog, catalogReportsSelector, catalogTransactionsSelector, getCatalogPolicyIDs};
