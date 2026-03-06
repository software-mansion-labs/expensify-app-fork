import Button from '@components/Button';
import {ChartHeader} from '@components/Charts';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import {getColumnsToShow} from '@libs/SearchUIUtils';
import ROUTES from '@src/ROUTES';
import type {SearchDataTypes} from '@src/types/onyx/SearchResults';
import type SearchResults from '@src/types/onyx/SearchResults';
import React from 'react';
import {View} from 'react-native';
import type {TransactionGroupHeaderGroupItem} from '@components/SelectionListWithSections/Search/getTransactionGroupHeader';
import getTransactionGroupHeader from '@components/SelectionListWithSections/Search/getTransactionGroupHeader';
import SearchTableHeader from '@components/SelectionListWithSections/SearchTableHeader';
import TransactionItemRow from '@components/TransactionItemRow';
import CONST from '@src/CONST';
import type {ListItem} from '@components/SelectionList/types';
import type {TransactionListItemType} from '@components/SelectionListWithSections/types';
import {SEARCH_GROUP_BY_CONFIG} from './SearchGroupByConfig';
import type {SearchGroupBy, SearchQueryJSON} from './types';

function SearchTablePreview({
    query,
    queryJSON,
    groupBy,
    chartTitle,
    data,
    type,
    searchResults,
}: {
    query: string;
    queryJSON: SearchQueryJSON;
    groupBy: SearchGroupBy | undefined;
    chartTitle: string;
    data: ListItem[];
    type: SearchDataTypes;
    searchResults: SearchResults | undefined;
}) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const {accountID} = useCurrentUserPersonalDetails();

    const icons = useMemoizedLazyExpensifyIcons(['Users', 'CreditCard', 'Send', 'Folder', 'Basket', 'Tag', 'Calendar']);

    if (!queryJSON) {
        return null;
    }

    const {titleIconName} = groupBy ? SEARCH_GROUP_BY_CONFIG[groupBy] : {};
    const titleIcon = titleIconName ? icons[titleIconName] : undefined;
    const columns = getColumnsToShow(accountID, searchResults?.data ?? ({} as SearchResults['data']), undefined, false, queryJSON.type, groupBy).filter(
        (column) => column !== CONST.SEARCH.TABLE_COLUMNS.ACTION,
    );

    const headerCommonProps = {
        onCheckboxPress: () => {},
        isDisabled: false as const,
        columns,
        canSelectMultiple: false as const,
        isSelectAllChecked: false,
        isIndeterminate: false,
        onDownArrowClick: undefined,
        isExpanded: false,
        isFocused: false,
    };

    return (
        <View style={[styles.barChartContainer, styles.highlightBG, styles.gap5, shouldUseNarrowLayout ? styles.p5 : styles.p8]}>
            <ChartHeader
                title={chartTitle}
                titleIcon={titleIcon}
            />

            {!shouldUseNarrowLayout && (
                <View style={[styles.ph3, styles.flex1]}>
                    <SearchTableHeader
                        canSelectMultiple={false}
                        columns={columns}
                        type={type}
                        onSortPress={() => {}}
                        sortOrder={queryJSON.sortOrder}
                        sortBy={queryJSON.sortBy}
                        shouldShowYear={false}
                        isAmountColumnWide={false}
                        isTaxAmountColumnWide={false}
                        shouldShowSorting
                        groupBy={groupBy}
                    />
                </View>
            )}

            <View style={styles.gap5}>
                {data.map((item) => {
                    if (groupBy) {
                        return getTransactionGroupHeader(item as TransactionGroupHeaderGroupItem, groupBy, headerCommonProps);
                    }
                    const transactionItem = item as TransactionListItemType;
                    const amountColumnSize = transactionItem.isAmountColumnWide ? CONST.SEARCH.TABLE_COLUMN_SIZES.WIDE : CONST.SEARCH.TABLE_COLUMN_SIZES.NORMAL;
                    const taxAmountColumnSize = transactionItem.isTaxAmountColumnWide ? CONST.SEARCH.TABLE_COLUMN_SIZES.WIDE : CONST.SEARCH.TABLE_COLUMN_SIZES.NORMAL;
                    const dateColumnSize = transactionItem.shouldShowYear ? CONST.SEARCH.TABLE_COLUMN_SIZES.WIDE : CONST.SEARCH.TABLE_COLUMN_SIZES.NORMAL;
                    const submittedColumnSize = transactionItem.shouldShowYearSubmitted ? CONST.SEARCH.TABLE_COLUMN_SIZES.WIDE : CONST.SEARCH.TABLE_COLUMN_SIZES.NORMAL;
                    const approvedColumnSize = transactionItem.shouldShowYearApproved ? CONST.SEARCH.TABLE_COLUMN_SIZES.WIDE : CONST.SEARCH.TABLE_COLUMN_SIZES.NORMAL;
                    const postedColumnSize = transactionItem.shouldShowYearPosted ? CONST.SEARCH.TABLE_COLUMN_SIZES.WIDE : CONST.SEARCH.TABLE_COLUMN_SIZES.NORMAL;
                    const exportedColumnSize = transactionItem.shouldShowYearExported ? CONST.SEARCH.TABLE_COLUMN_SIZES.WIDE : CONST.SEARCH.TABLE_COLUMN_SIZES.NORMAL;
                    return (
                        <TransactionItemRow
                            key={item.keyForList}
                            transactionItem={transactionItem}
                            report={transactionItem.report}
                            shouldUseNarrowLayout={shouldUseNarrowLayout}
                            columns={columns}
                            shouldShowRadioButton={false}
                            shouldShowCheckbox={false}
                            isSelected={false}
                            shouldShowTooltip={false}
                            dateColumnSize={dateColumnSize}
                            submittedColumnSize={submittedColumnSize}
                            approvedColumnSize={approvedColumnSize}
                            postedColumnSize={postedColumnSize}
                            exportedColumnSize={exportedColumnSize}
                            amountColumnSize={amountColumnSize}
                            taxAmountColumnSize={taxAmountColumnSize}
                        />
                    );
                })}
            </View>
            <Button
                small={!shouldUseNarrowLayout}
                text={translate('common.view')}
                style={!shouldUseNarrowLayout && styles.alignSelfStart}
                onPress={() => Navigation.navigate(ROUTES.SEARCH_ROOT.getRoute({query: `${query} view:table`}))}
            />
        </View>
    );
}

export default SearchTablePreview;
