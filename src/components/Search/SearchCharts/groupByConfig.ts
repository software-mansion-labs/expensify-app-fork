import type {TransactionCardGroupListItemType, TransactionMemberGroupListItemType, TransactionWithdrawalIDGroupListItemType} from '@components/SelectionListWithSections/types';
import * as Expensicons from '@components/Icon/Expensicons';
import {
    isTransactionMemberGroupListItemType,
    isTransactionCardGroupListItemType,
    isTransactionWithdrawalIDGroupListItemType,
} from '@libs/SearchUIUtils';
import type IconAsset from '@src/types/utils/IconAsset';
import CONST from '@src/CONST';

/**
 * Union type of all grouped transaction item types
 */
type GroupedTransactionItem = TransactionMemberGroupListItemType | TransactionCardGroupListItemType | TransactionWithdrawalIDGroupListItemType;

type SearchGroupBy = (typeof CONST.SEARCH.GROUP_BY)[keyof typeof CONST.SEARCH.GROUP_BY];

type GroupByConfig = {
    /** Extract display label from grouped item */
    labelExtractor: (item: GroupedTransactionItem) => string;
    /** Default title for chart when no custom title provided */
    defaultTitle: string;
    /** Icon for chart header */
    icon: IconAsset;
};

/**
 * Configuration for each group-by type.
 * Used by SearchBarChart and SearchPieChart to extract labels and display defaults.
 */
const GROUP_BY_CONFIG: Record<SearchGroupBy, GroupByConfig> = {
    [CONST.SEARCH.GROUP_BY.FROM]: {
        labelExtractor: (item) => {
            if (isTransactionMemberGroupListItemType(item)) {
                return item.formattedFrom ?? '';
            }
            return '';
        },
        defaultTitle: 'By Person',
        icon: Expensicons.Users,
    },
    [CONST.SEARCH.GROUP_BY.CARD]: {
        labelExtractor: (item) => {
            if (isTransactionCardGroupListItemType(item)) {
                return item.formattedCardName ?? '';
            }
            return '';
        },
        defaultTitle: 'By Card',
        icon: Expensicons.CreditCard,
    },
    [CONST.SEARCH.GROUP_BY.WITHDRAWAL_ID]: {
        labelExtractor: (item) => {
            if (isTransactionWithdrawalIDGroupListItemType(item)) {
                return item.formattedWithdrawalID ?? '';
            }
            return '';
        },
        defaultTitle: 'By Withdrawal',
        icon: Expensicons.Bank,
    },
};

/**
 * Get label from a grouped transaction item based on its groupedBy type
 */
function getGroupedItemLabel(item: GroupedTransactionItem): string {
    if (isTransactionMemberGroupListItemType(item)) {
        return GROUP_BY_CONFIG[CONST.SEARCH.GROUP_BY.FROM].labelExtractor(item);
    }
    if (isTransactionCardGroupListItemType(item)) {
        return GROUP_BY_CONFIG[CONST.SEARCH.GROUP_BY.CARD].labelExtractor(item);
    }
    if (isTransactionWithdrawalIDGroupListItemType(item)) {
        return GROUP_BY_CONFIG[CONST.SEARCH.GROUP_BY.WITHDRAWAL_ID].labelExtractor(item);
    }
    return '';
}

/**
 * Type guard to check if item is any grouped transaction type
 */
function isGroupedTransactionItem(item: unknown): item is GroupedTransactionItem {
    return (
        typeof item === 'object' &&
        item !== null &&
        'groupedBy' in item &&
        typeof (item as GroupedTransactionItem).groupedBy === 'string'
    );
}

export {GROUP_BY_CONFIG, getGroupedItemLabel, isGroupedTransactionItem};
export type {GroupedTransactionItem, SearchGroupBy, GroupByConfig};
