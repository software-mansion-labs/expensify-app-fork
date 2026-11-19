import type {SearchListFocusStop} from '@components/Search/SearchList/BaseSearchList/types';
import {buildGroupedFocusStops, getShowMoreFocusKey, resolveGroupedFocusStopIndex} from '@components/Search/SearchList/groupedFocusStops';
import type {GroupedFocusStop} from '@components/Search/SearchList/groupedFocusStops';
import type {SearchListItem} from '@components/Search/SearchList/ListItem/types';

import {splitGroupsIntoPairs} from '@libs/SearchUIUtils';

import CONST from '@src/CONST';

type MockGroup = {
    expenseCount?: number;
    pendingDeleteExpenseIndexes?: number[];
    hasMoreTransactions?: boolean;
    isLoadingTransactions?: boolean;
    transactionsOffset?: number;
};

/** Builds group rows keyed `group-<i>`, whose expenses are keyed `txn-<i>-<j>`. */
function createGroups(groups: MockGroup[]): SearchListItem[] {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- test fixtures are intentionally partial group rows
    return groups.map((group, i) => ({
        keyForList: `group-${i}`,
        transactionsQueryJSON: {hash: 100 + i},
        hasMoreTransactions: group.hasMoreTransactions,
        isLoadingTransactions: group.isLoadingTransactions,
        transactionsOffset: group.transactionsOffset,
        transactions: Array.from({length: group.expenseCount ?? 1}, (_, j) => ({
            keyForList: `txn-${i}-${j}`,
            transactionID: `${i}-${j}`,
            pendingAction: group.pendingDeleteExpenseIndexes?.includes(j) ? CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE : undefined,
        })),
    })) as unknown as SearchListItem[];
}

function stopKeys(stops: SearchListFocusStop[]) {
    return stops.map((stop) => stop.keyForList);
}

function indexOfKey(stops: SearchListFocusStop[], keyForList: string) {
    return stops.findIndex((stop) => stop.keyForList === keyForList);
}

function stopWithKey(stops: GroupedFocusStop[], keyForList: string): GroupedFocusStop {
    const stop = stops.find((candidate) => candidate.keyForList === keyForList);
    if (!stop) {
        throw new Error(`No stop for ${keyForList}`);
    }
    return stop;
}

/** Builds the stops of these groups, with the ones in `openGroupKeys` open, online unless told otherwise. */
function buildStops(groups: MockGroup[], openGroupKeys: string[] = [], {isOffline = false, pendingShowMoreGroupKey}: {isOffline?: boolean; pendingShowMoreGroupKey?: string} = {}) {
    return buildGroupedFocusStops({listData: createGroups(groups), expandedGroups: new Set(openGroupKeys), isOffline, pendingShowMoreGroupKey});
}

describe('buildGroupedFocusStops on the narrow layout', () => {
    it('gives a closed group one stop, so the arrow keys pass over it in one press', () => {
        // Given two closed groups, each a single list row
        // When the stops are built
        const stops = buildStops([{expenseCount: 2}, {expenseCount: 2}]);

        // Then each group is one stop on its own row, and none of their expenses can take focus
        expect(stopKeys(stops)).toEqual(['group-0', 'group-1']);
        expect(stops.map((stop) => stop.rowIndex)).toEqual([0, 1]);
        expect(stops.every((stop) => stop.isRow)).toBe(true);
    });

    it("adds an open group's expenses and its Show more after the group, on the group's own row", () => {
        // Given an open group that has more expenses to load, followed by a closed one
        // When the stops are built
        const stops = buildStops([{expenseCount: 2, hasMoreTransactions: true}, {}], ['group-0']);

        // Then the arrow keys walk the group, its expenses, its Show more, and then the next group
        expect(stopKeys(stops)).toEqual(['group-0', 'txn-0-0', 'txn-0-1', getShowMoreFocusKey('group-0'), 'group-1']);

        // And the nested stops live in the group's row, where no sticky header covers them, and know their place in the group
        const expense = stopWithKey(stops, 'txn-0-1');
        expect(expense).toEqual(expect.objectContaining({kind: 'expense', rowIndex: 0, isRow: false, groupKey: 'group-0', ordinal: 1}));
        expect(expense.stickyRowIndex).toBeUndefined();
        expect(stopWithKey(stops, getShowMoreFocusKey('group-0'))).toEqual(expect.objectContaining({kind: 'showMore', ordinal: 2}));
    });
});

describe('buildGroupedFocusStops on the wide layout', () => {
    it("puts an open group's expenses in its children row, under its sticky header, and gives the children row no stop", () => {
        // Given split rows: a header and a children row per group
        const {splitData} = splitGroupsIntoPairs(createGroups([{expenseCount: 2}, {}]));

        // When the first group is open
        const stops = buildGroupedFocusStops({listData: splitData, expandedGroups: new Set(['group-0']), isOffline: false});

        // Then the header rows are the group stops, and the children rows are only reached through their expenses
        expect(stopKeys(stops)).toEqual(['header_group-0', 'txn-0-0', 'txn-0-1', 'header_group-1']);
        expect(stopWithKey(stops, 'header_group-0')).toEqual(expect.objectContaining({kind: 'group', rowIndex: 0, isRow: true, groupKey: 'group-0'}));
        expect(stopWithKey(stops, 'txn-0-1')).toEqual(expect.objectContaining({rowIndex: 1, stickyRowIndex: 0, isRow: false, ordinal: 1}));
        expect(stopWithKey(stops, 'header_group-1').rowIndex).toBe(2);
    });
});

describe('buildGroupedFocusStops for Show more', () => {
    const showMoreKey = getShowMoreFocusKey('group-0');

    it('leaves Show more out while offline, where the link is hidden', () => {
        // Given an open group with more to load
        // When the app is offline
        const stops = buildStops([{hasMoreTransactions: true}], ['group-0'], {isOffline: true});

        // Then the group's expense is a stop, and Show more is not
        expect(stopKeys(stops)).toEqual(['group-0', 'txn-0-0']);
    });

    it('leaves Show more out once the group has loaded everything', () => {
        // Given an open group with nothing more to load
        // When the stops are built
        const stops = buildStops([{hasMoreTransactions: false}], ['group-0']);

        // Then the group's expense is a stop, and Show more is not
        expect(stopKeys(stops)).toEqual(['group-0', 'txn-0-0']);
    });

    it('leaves Show more out while the spinner replaces it, unless Enter on it is waiting for the page', () => {
        // Given an open group loading its second page, which shows the spinner in place of the link
        const groups = [{hasMoreTransactions: true, isLoadingTransactions: true, transactionsOffset: CONST.SEARCH.RESULTS_PAGE_SIZE}];

        // When nothing waits for the page
        const stopsWithoutPending = buildStops(groups, ['group-0']);

        // Then Show more is not a stop
        expect(stopKeys(stopsWithoutPending)).toEqual(['group-0', 'txn-0-0']);

        // When Enter on Show more waits for the page
        const stopsWithPending = buildStops(groups, ['group-0'], {pendingShowMoreGroupKey: 'group-0'});

        // Then its stop stays, so focus stays where it was
        expect(stopKeys(stopsWithPending)).toEqual(['group-0', 'txn-0-0', showMoreKey]);
    });
});

describe('buildGroupedFocusStops for pending deletes', () => {
    it('skips an expense pending delete online, where it is hidden, and counts the others without it', () => {
        // Given an open group whose middle expense is pending delete
        // When the stops are built online
        const stops = buildStops([{expenseCount: 3, pendingDeleteExpenseIndexes: [1]}], ['group-0']);

        // Then the hidden expense takes no focus, and the expense after it takes its place in the group
        expect(stopKeys(stops)).toEqual(['group-0', 'txn-0-0', 'txn-0-2']);
        expect(stopWithKey(stops, 'txn-0-2').ordinal).toBe(1);
    });

    it('keeps an expense pending delete offline, where it shows struck through', () => {
        // Given the same group
        // When the stops are built offline
        const stops = buildStops([{expenseCount: 3, pendingDeleteExpenseIndexes: [1]}], ['group-0'], {isOffline: true});

        // Then every expense is a stop
        expect(stopKeys(stops)).toEqual(['group-0', 'txn-0-0', 'txn-0-1', 'txn-0-2']);
    });
});

describe('resolveGroupedFocusStopIndex', () => {
    it('keeps focus on the same stop when rows above it change', () => {
        // Given focus on the second group, after an open group above it
        const before = buildStops([{expenseCount: 2}, {}], ['group-0']);
        const prevIndex = indexOfKey(before, 'group-1');

        // When the group above closes, so the focused group moves up
        const after = buildStops([{expenseCount: 2}, {}]);

        // Then focus follows the group, not the index
        expect(resolveGroupedFocusStopIndex(stopWithKey(before, 'group-1'), prevIndex, after)).toBe(indexOfKey(after, 'group-1'));
    });

    it('moves from Show more to the first expense of the page it loaded', () => {
        // Given focus on Show more after two expenses
        const before = buildStops([{expenseCount: 2, hasMoreTransactions: true}], ['group-0']);
        const showMore = stopWithKey(before, getShowMoreFocusKey('group-0'));

        // When the next page arrives with two more expenses, and Show more moves below them
        const after = buildStops([{expenseCount: 4, hasMoreTransactions: true}], ['group-0']);

        // Then focus lands on the first new expense rather than following Show more down
        expect(resolveGroupedFocusStopIndex(showMore, before.indexOf(showMore), after)).toBe(indexOfKey(after, 'txn-0-2'));
    });

    it("moves from Show more to the group's last expense when the page added none", () => {
        // Given focus on Show more
        const before = buildStops([{expenseCount: 2, hasMoreTransactions: true}], ['group-0']);
        const showMore = stopWithKey(before, getShowMoreFocusKey('group-0'));

        // When the page comes back empty and Show more goes away
        const after = buildStops([{expenseCount: 2, hasMoreTransactions: false}], ['group-0']);

        // Then focus stays in the group, on the expense above where Show more was
        expect(resolveGroupedFocusStopIndex(showMore, before.indexOf(showMore), after)).toBe(indexOfKey(after, 'txn-0-1'));
    });

    it('moves from an expense to its group when the group closes', () => {
        // Given focus on an expense of an open group
        const before = buildStops([{expenseCount: 2}, {}], ['group-0']);
        const expense = stopWithKey(before, 'txn-0-1');

        // When the group closes
        const after = buildStops([{expenseCount: 2}, {}]);

        // Then focus goes to the group that held it
        expect(resolveGroupedFocusStopIndex(expense, before.indexOf(expense), after)).toBe(indexOfKey(after, 'group-0'));
    });

    it("moves from a group's header row to the group's row when the layout turns narrow", () => {
        // Given focus on the second group's header on the wide layout
        const listData = createGroups([{}, {}]);
        const before = buildGroupedFocusStops({listData: splitGroupsIntoPairs(listData).splitData, expandedGroups: new Set(), isOffline: false});
        const header = stopWithKey(before, 'header_group-1');

        // When the layout turns narrow, where the group is one row under its own key
        const after = buildGroupedFocusStops({listData, expandedGroups: new Set(), isOffline: false});

        // Then focus stays on the same group
        expect(resolveGroupedFocusStopIndex(header, before.indexOf(header), after)).toBe(indexOfKey(after, 'group-1'));
    });

    it('clamps to the end of the list when the focused group is gone', () => {
        // Given focus on the last of three groups
        const before = buildStops([{}, {}, {}]);
        const lastGroup = stopWithKey(before, 'group-2');

        // When the list shrinks to one group
        const after = buildStops([{}]);

        // Then focus stays on the list, on its last stop
        expect(resolveGroupedFocusStopIndex(lastGroup, before.indexOf(lastGroup), after)).toBe(0);
    });
});
