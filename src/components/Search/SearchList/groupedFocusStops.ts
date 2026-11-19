/**
 * The arrow-key focus stops of the grouped expense list: each group, then the expenses and the "Show more" link of
 * every open group. An open group's expenses live inside one list row, so without these the arrow keys would jump
 * over them from one group to the next.
 */
import isTransactionGroupListItemType from '@libs/isTransactionGroupListItemType';
import {isTransactionPendingDelete} from '@libs/TransactionUtils';

import type {SearchListFocusStop} from './BaseSearchList/types';
import type {SearchListItem, TransactionGroupListItemType, TransactionListItemType} from './ListItem/types';

import getGroupShowMoreState from './ListItem/getGroupShowMoreState';
import {isGroupChildrenContainerItem, isGroupHeaderItem} from './ListItem/types';

type GroupedFocusStopKind = 'group' | 'expense' | 'showMore' | 'row';

type GroupedFocusStop = SearchListFocusStop & {
    kind: GroupedFocusStopKind;

    /** The group's own key, the same on wide and narrow layouts, unlike the key of its header row */
    groupKey?: string;

    /** An expense's position among its group's expenses, or for "Show more", the position the next page starts at */
    ordinal?: number;
};

type BuildGroupedFocusStopsParams = {
    /** The rows the list renders, where wide layouts split each group into a header row and a children row */
    listData: SearchListItem[];

    /** Keys of the open groups */
    expandedGroups: ReadonlySet<string>;

    isOffline: boolean;

    /** The group whose "Show more" was pressed with Enter and whose next page hasn't arrived yet */
    pendingShowMoreGroupKey?: string;
};

function getShowMoreFocusKey(groupKey: string) {
    return `showMore_${groupKey}`;
}

/** The expenses an open group shows. Online, a pending delete is hidden, so it can't take focus. */
function getFocusableExpenses(group: TransactionGroupListItemType, isOffline: boolean): TransactionListItemType[] {
    if (isOffline) {
        return group.transactions;
    }
    return group.transactions.filter((transaction) => !isTransactionPendingDelete(transaction));
}

function isGroupedFocusStop(stop: SearchListFocusStop): stop is GroupedFocusStop {
    return 'kind' in stop;
}

function addOpenGroupStops(
    stops: GroupedFocusStop[],
    group: TransactionGroupListItemType,
    groupKey: string,
    position: Pick<SearchListFocusStop, 'rowIndex' | 'stickyRowIndex'>,
    {isOffline, pendingShowMoreGroupKey}: Pick<BuildGroupedFocusStopsParams, 'isOffline' | 'pendingShowMoreGroupKey'>,
) {
    const expenses = getFocusableExpenses(group, isOffline);
    for (const [ordinal, transaction] of expenses.entries()) {
        stops.push({kind: 'expense', keyForList: transaction.keyForList, isRow: false, groupKey, ordinal, ...position});
    }

    const {shouldShowMoreButton} = getGroupShowMoreState({
        isExpenseReportType: false,
        transactionsCount: group.transactions.length,
        hasMoreResults: group.hasMoreTransactions,
        isLoading: group.isLoadingTransactions,
        offset: group.transactionsOffset,
        isOffline,
    });

    // While the next page loads, the spinner replaces the link. Its stop stays, so focus waits there for the new expenses.
    if (shouldShowMoreButton || pendingShowMoreGroupKey === groupKey) {
        stops.push({kind: 'showMore', keyForList: getShowMoreFocusKey(groupKey), isRow: false, groupKey, ordinal: expenses.length, ...position});
    }
}

function buildGroupedFocusStops({listData, expandedGroups, isOffline, pendingShowMoreGroupKey}: BuildGroupedFocusStopsParams): GroupedFocusStop[] {
    const stops: GroupedFocusStop[] = [];
    const openGroupParams = {isOffline, pendingShowMoreGroupKey};

    for (const [rowIndex, item] of listData.entries()) {
        // Focus is tracked by key, so a row without one can't be told apart from the others.
        if (!item.keyForList || isGroupChildrenContainerItem(item)) {
            continue;
        }

        if (isGroupHeaderItem(item)) {
            const groupKey = item.groupKeyForList;
            stops.push({kind: 'group', keyForList: item.keyForList, rowIndex, isRow: true, groupKey});

            // The group's expenses render in the children row right below its header, which sticks to the top over them.
            if (expandedGroups.has(groupKey)) {
                addOpenGroupStops(stops, item, groupKey, {rowIndex: rowIndex + 1, stickyRowIndex: rowIndex}, openGroupParams);
            }
            continue;
        }

        if (isTransactionGroupListItemType(item)) {
            const groupKey = item.keyForList;
            stops.push({kind: 'group', keyForList: groupKey, rowIndex, isRow: true, groupKey});
            if (expandedGroups.has(groupKey)) {
                addOpenGroupStops(stops, item, groupKey, {rowIndex}, openGroupParams);
            }
            continue;
        }

        stops.push({kind: 'row', keyForList: item.keyForList, rowIndex, isRow: true});
    }

    return stops;
}

/**
 * Picks where focus goes when the stops change under it:
 * - from "Show more" to the first expense of the page it loaded, or to the group's last expense when it loaded none
 * - to the same stop, wherever it moved
 * - to its group, when the group closed under one of its expenses or its header row changed key with the layout
 * - otherwise to the same position, clamped to the end of the list
 */
function resolveGroupedFocusStopIndex(prevStop: SearchListFocusStop, prevIndex: number, stops: readonly SearchListFocusStop[]): number {
    const prev = isGroupedFocusStop(prevStop) ? prevStop : undefined;
    const prevGroupKey = prev?.groupKey;
    const isPrevShowMore = prev?.kind === 'showMore';
    const isPrevGroupStop = (stop: SearchListFocusStop, kind: GroupedFocusStopKind): stop is GroupedFocusStop =>
        isGroupedFocusStop(stop) && stop.kind === kind && stop.groupKey === prevGroupKey;

    if (isPrevShowMore) {
        const firstNewExpenseIndex = stops.findIndex((stop) => isPrevGroupStop(stop, 'expense') && stop.ordinal === prev?.ordinal);
        if (firstNewExpenseIndex >= 0) {
            return firstNewExpenseIndex;
        }
    }

    const sameStopIndex = stops.findIndex((stop) => stop.keyForList === prevStop.keyForList);
    if (sameStopIndex >= 0) {
        return sameStopIndex;
    }

    if (prevGroupKey) {
        const lastExpenseIndex = isPrevShowMore ? stops.findLastIndex((stop) => isPrevGroupStop(stop, 'expense')) : -1;
        if (lastExpenseIndex >= 0) {
            return lastExpenseIndex;
        }
        const groupIndex = stops.findIndex((stop) => isPrevGroupStop(stop, 'group'));
        if (groupIndex >= 0) {
            return groupIndex;
        }
    }

    return Math.min(prevIndex, stops.length - 1);
}

export {buildGroupedFocusStops, resolveGroupedFocusStopIndex, getShowMoreFocusKey, getFocusableExpenses, isGroupedFocusStop};
export type {GroupedFocusStop};
