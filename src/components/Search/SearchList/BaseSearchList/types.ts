import type {SearchListItem} from '@components/Search/SearchList/ListItem/types';
import type {SearchColumnType} from '@components/Search/types';
import type {ExtendedTargetedEvent} from '@components/SelectionList/ListItem/types';

import type {CardList, Transaction} from '@src/types/onyx';

import type {FlashListProps, FlashListRef} from '@shopify/flash-list';
import type {RefObject} from 'react';
import type {NativeSyntheticEvent} from 'react-native';

/** A place the arrow keys can move focus to: a whole row, or a target nested inside one, such as an open group's expense */
type SearchListFocusStop = {
    /** The key the stop is focused and highlighted by, which a nested target registers under */
    keyForList: string;

    /** Index in `data` of the row that renders the stop */
    rowIndex: number;

    /** Whether the stop is the row itself, which Enter selects through `onSelectRow`, rather than a target nested in it */
    isRow: boolean;

    /** Index of the sticky row that covers the top of the list while this stop is under it */
    stickyRowIndex?: number;
};

type BaseSearchListProps = Pick<
    FlashListProps<SearchListItem>,
    | 'onScroll'
    | 'contentContainerStyle'
    | 'onEndReached'
    | 'onEndReachedThreshold'
    | 'ListFooterComponent'
    | 'onViewableItemsChanged'
    | 'keyExtractor'
    | 'showsVerticalScrollIndicator'
    | 'onLayout'
    | 'stickyHeaderIndices'
    | 'stickyHeaderConfig'
    | 'overrideItemLayout'
> & {
    data: SearchListItem[];

    /** The select-all bar. Pinned above the list, or scrolled with the rows where the page header scrolls away too. */
    selectionTopBar?: React.JSX.Element;

    renderItem: (item: SearchListItem, index: number, onFocus?: (event: NativeSyntheticEvent<ExtendedTargetedEvent>) => void) => React.JSX.Element;

    /** The columns that might change to trigger re-render via extraData */
    columns: SearchColumnType[];

    /** The transactions that might trigger re-render via extraData */
    newTransactions: Transaction[];

    flattenedItemsLength: number;

    /** The callback, which is run when a row is pressed */
    onSelectRow: (item: SearchListItem) => void;

    ref: RefObject<FlashListRef<SearchListItem> | null>;

    /** Precomputed attendee-tracking boolean (derived from policy-for-moving-expenses) */
    isAttendeesEnabledForMovingPolicy?: boolean;

    /** Non-personal and workspace cards for triggering re-render via extraData */
    nonPersonalAndWorkspaceCards?: CardList;

    /** Function to determine item type for FlashList recycling */
    getItemType?: (item: SearchListItem, index: number) => string | number | undefined;

    /** Where the arrow keys move focus, in order. Without it they move from row to row. */
    focusStops?: readonly SearchListFocusStop[];

    /** Picks the stop to keep focus on when the focused stop moved or left `focusStops`, or -1 for none */
    resolveFocusStopIndex?: (prevStop: SearchListFocusStop, prevIndex: number, stops: readonly SearchListFocusStop[]) => number;

    /** Called after Enter activates a nested stop */
    onSelectFocusStop?: (stop: SearchListFocusStop) => void;
};

export default BaseSearchListProps;
export type {SearchListFocusStop};
