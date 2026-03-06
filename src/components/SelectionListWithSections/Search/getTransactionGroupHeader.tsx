import React from 'react';
import type {SearchGroupBy, SearchColumnType} from '@components/Search/types';
import type {
    TransactionCardGroupListItemType,
    TransactionCategoryGroupListItemType,
    TransactionMemberGroupListItemType,
    TransactionMerchantGroupListItemType,
    TransactionMonthGroupListItemType,
    TransactionQuarterGroupListItemType,
    TransactionTagGroupListItemType,
    TransactionWeekGroupListItemType,
    TransactionWithdrawalIDGroupListItemType,
    TransactionYearGroupListItemType,
    ListItem,
} from '@components/SelectionListWithSections/types';
import CONST from '@src/CONST';
import CardListItemHeader from './CardListItemHeader';
import CategoryListItemHeader from './CategoryListItemHeader';
import MemberListItemHeader from './MemberListItemHeader';
import MerchantListItemHeader from './MerchantListItemHeader';
import MonthListItemHeader from './MonthListItemHeader';
import QuarterListItemHeader from './QuarterListItemHeader';
import TagListItemHeader from './TagListItemHeader';
import WeekListItemHeader from './WeekListItemHeader';
import WithdrawalIDListItemHeader from './WithdrawalIDListItemHeader';
import YearListItemHeader from './YearListItemHeader';

/**
 * Common props passed to all transaction group header components (Member, Card, Category, etc.).
 * Used by both the full search table (TransactionGroupListItem) and the search table preview.
 */
type TransactionGroupHeaderCommonProps<TItem extends ListItem = ListItem> = {
    onCheckboxPress?: (item: TItem) => void;
    isDisabled?: boolean | null;
    columns?: SearchColumnType[];
    canSelectMultiple: boolean | undefined;
    isSelectAllChecked?: boolean;
    isIndeterminate?: boolean;
    onDownArrowClick?: () => void;
    isExpanded?: boolean;
    isFocused?: boolean;
};

/**
 * Group item shape used for transaction group headers. Accepts the full transaction group
 * list item type (with transactions, etc.) or the preview grouped item (label-only).
 */
type TransactionGroupHeaderGroupItem =
    | TransactionMemberGroupListItemType
    | TransactionCardGroupListItemType
    | TransactionWithdrawalIDGroupListItemType
    | TransactionCategoryGroupListItemType
    | TransactionMerchantGroupListItemType
    | TransactionTagGroupListItemType
    | TransactionMonthGroupListItemType
    | TransactionWeekGroupListItemType
    | TransactionYearGroupListItemType
    | TransactionQuarterGroupListItemType;

/**
 * Renders the appropriate header component for a transaction group based on groupBy.
 * Single source of truth for the groupBy → header mapping and types.
 */
function getTransactionGroupHeader<TItem extends ListItem>(
    groupItem: TransactionGroupHeaderGroupItem,
    groupBy: SearchGroupBy,
    props: TransactionGroupHeaderCommonProps<TItem>,
): React.JSX.Element {
    const headers: Record<SearchGroupBy, React.JSX.Element> = {
        [CONST.SEARCH.GROUP_BY.FROM]: (
            <MemberListItemHeader
                member={groupItem as TransactionMemberGroupListItemType}
                onCheckboxPress={props.onCheckboxPress}
                isDisabled={props.isDisabled}
                columns={props.columns}
                canSelectMultiple={props.canSelectMultiple}
                isSelectAllChecked={props.isSelectAllChecked}
                isIndeterminate={props.isIndeterminate}
                onDownArrowClick={props.onDownArrowClick}
                isExpanded={props.isExpanded}
            />
        ),
        [CONST.SEARCH.GROUP_BY.CARD]: (
            <CardListItemHeader
                card={groupItem as TransactionCardGroupListItemType}
                onCheckboxPress={props.onCheckboxPress}
                isDisabled={props.isDisabled}
                columns={props.columns}
                isFocused={props.isFocused}
                canSelectMultiple={props.canSelectMultiple}
                isSelectAllChecked={props.isSelectAllChecked}
                isIndeterminate={props.isIndeterminate}
                onDownArrowClick={props.onDownArrowClick}
                isExpanded={props.isExpanded}
            />
        ),
        [CONST.SEARCH.GROUP_BY.WITHDRAWAL_ID]: (
            <WithdrawalIDListItemHeader
                withdrawalID={groupItem as TransactionWithdrawalIDGroupListItemType}
                onCheckboxPress={props.onCheckboxPress}
                isDisabled={props.isDisabled}
                columns={props.columns}
                canSelectMultiple={props.canSelectMultiple}
                isSelectAllChecked={props.isSelectAllChecked}
                isIndeterminate={props.isIndeterminate}
                onDownArrowClick={props.onDownArrowClick}
                isExpanded={props.isExpanded}
            />
        ),
        [CONST.SEARCH.GROUP_BY.CATEGORY]: (
            <CategoryListItemHeader
                category={groupItem as TransactionCategoryGroupListItemType}
                onCheckboxPress={props.onCheckboxPress}
                isDisabled={props.isDisabled}
                columns={props.columns}
                canSelectMultiple={props.canSelectMultiple}
                isSelectAllChecked={props.isSelectAllChecked}
                isIndeterminate={props.isIndeterminate}
                onDownArrowClick={props.onDownArrowClick}
                isExpanded={props.isExpanded}
            />
        ),
        [CONST.SEARCH.GROUP_BY.MERCHANT]: (
            <MerchantListItemHeader
                merchant={groupItem as TransactionMerchantGroupListItemType}
                onCheckboxPress={props.onCheckboxPress}
                isDisabled={props.isDisabled}
                columns={props.columns}
                canSelectMultiple={props.canSelectMultiple}
                isSelectAllChecked={props.isSelectAllChecked}
                isIndeterminate={props.isIndeterminate}
                onDownArrowClick={props.onDownArrowClick}
                isExpanded={props.isExpanded}
            />
        ),
        [CONST.SEARCH.GROUP_BY.TAG]: (
            <TagListItemHeader
                tag={groupItem as TransactionTagGroupListItemType}
                onCheckboxPress={props.onCheckboxPress}
                isDisabled={props.isDisabled}
                columns={props.columns}
                canSelectMultiple={props.canSelectMultiple}
                isSelectAllChecked={props.isSelectAllChecked}
                isIndeterminate={props.isIndeterminate}
                onDownArrowClick={props.onDownArrowClick}
                isExpanded={props.isExpanded}
            />
        ),
        [CONST.SEARCH.GROUP_BY.MONTH]: (
            <MonthListItemHeader
                month={groupItem as TransactionMonthGroupListItemType}
                onCheckboxPress={props.onCheckboxPress}
                isDisabled={props.isDisabled}
                columns={props.columns}
                canSelectMultiple={props.canSelectMultiple}
                isSelectAllChecked={props.isSelectAllChecked}
                isIndeterminate={props.isIndeterminate}
                onDownArrowClick={props.onDownArrowClick}
                isExpanded={props.isExpanded}
            />
        ),
        [CONST.SEARCH.GROUP_BY.WEEK]: (
            <WeekListItemHeader
                week={groupItem as TransactionWeekGroupListItemType}
                onCheckboxPress={props.onCheckboxPress}
                isDisabled={props.isDisabled}
                columns={props.columns}
                canSelectMultiple={props.canSelectMultiple}
                isSelectAllChecked={props.isSelectAllChecked}
                isIndeterminate={props.isIndeterminate}
                onDownArrowClick={props.onDownArrowClick}
                isExpanded={props.isExpanded}
            />
        ),
        [CONST.SEARCH.GROUP_BY.YEAR]: (
            <YearListItemHeader
                year={groupItem as TransactionYearGroupListItemType}
                onCheckboxPress={props.onCheckboxPress}
                isDisabled={props.isDisabled}
                columns={props.columns}
                canSelectMultiple={props.canSelectMultiple}
                isSelectAllChecked={props.isSelectAllChecked}
                isIndeterminate={props.isIndeterminate}
                onDownArrowClick={props.onDownArrowClick}
                isExpanded={props.isExpanded}
            />
        ),
        [CONST.SEARCH.GROUP_BY.QUARTER]: (
            <QuarterListItemHeader
                quarter={groupItem as TransactionQuarterGroupListItemType}
                onCheckboxPress={props.onCheckboxPress}
                isDisabled={props.isDisabled}
                columns={props.columns}
                canSelectMultiple={props.canSelectMultiple}
                isSelectAllChecked={props.isSelectAllChecked}
                isIndeterminate={props.isIndeterminate}
                onDownArrowClick={props.onDownArrowClick}
                isExpanded={props.isExpanded}
            />
        ),
    };

    return headers[groupBy];
}

export type {TransactionGroupHeaderGroupItem};
export default getTransactionGroupHeader;
