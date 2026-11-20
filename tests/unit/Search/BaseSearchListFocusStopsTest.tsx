import {act, fireEvent, render, screen} from '@testing-library/react-native';

import {PressableWithFeedback} from '@components/Pressable';
import type BaseSearchListProps from '@components/Search/SearchList/BaseSearchList/types';
import type {SearchListFocusStop} from '@components/Search/SearchList/BaseSearchList/types';
import type {SearchListItem} from '@components/Search/SearchList/ListItem/types';
import useSearchListFocusTarget from '@components/Search/SearchList/ListItem/useSearchListFocusTarget';
import type {ListItemFocusEventHandler} from '@components/SelectionList/ListItem/types';
import Text from '@components/Text';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type * as NativeNavigation from '@react-navigation/native';
import type {FlashListRef} from '@shopify/flash-list';

import React, {createRef} from 'react';
import {View} from 'react-native';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

type ShortcutCallback = (event?: {stopPropagation: () => void}) => void;

const shortcuts: Record<string, {callback: ShortcutCallback; isActive: boolean}> = {};

jest.mock('@hooks/useKeyboardShortcut', () => (key: {shortcutKey: string}, callback: ShortcutCallback, config?: {isActive?: boolean}) => {
    shortcuts[key.shortcutKey] = {callback, isActive: config?.isActive ?? true};
});

const mockRevealFocusStop = jest.fn();
jest.mock('@components/Search/SearchList/BaseSearchList/useRevealFocusStop', () => () => mockRevealFocusStop);

jest.mock('@components/Navigation/TabBarBottomContent/useTabBarCoveredHeight', () => () => 0);
jest.mock('@components/Navigation/TabBarBottomContent/useTabRootScrollProps', () => (contentContainerStyle: unknown) => ({contentContainerStyle}));

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof NativeNavigation>('@react-navigation/native'),
    useIsFocused: () => true,
    createNavigationContainerRef: jest.fn(() => ({
        getCurrentRoute: jest.fn(),
        addListener: jest.fn(() => jest.fn()),
        removeListener: jest.fn(),
        isReady: jest.fn(() => true),
        getState: jest.fn(),
    })),
}));

// Jest resolves the native list, which has no keyboard focus, so the web list is loaded by its file name.
const BaseSearchList = jest.requireActual<{default: React.ComponentType<BaseSearchListProps>}>('@components/Search/SearchList/BaseSearchList/index.tsx').default;

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- test rows only need their keys
const DATA = [{keyForList: 'group-0'}, {keyForList: 'group-1'}] as SearchListItem[];

const EXPENSE_STOP: SearchListFocusStop = {keyForList: 'txn-0', rowIndex: 0, isRow: false};

/** The first group is open with one expense inside its row, and the second group is closed. */
const STOPS_WITH_OPEN_GROUP: SearchListFocusStop[] = [{keyForList: 'group-0', rowIndex: 0, isRow: true}, EXPENSE_STOP, {keyForList: 'group-1', rowIndex: 1, isRow: true}];

const STOPS_WITH_CLOSED_GROUP: SearchListFocusStop[] = [
    {keyForList: 'group-0', rowIndex: 0, isRow: true},
    {keyForList: 'group-1', rowIndex: 1, isRow: true},
];

const activateExpense = jest.fn();

function ExpenseRow() {
    const {ref, isFocused, onFocus} = useSearchListFocusTarget({keyForList: EXPENSE_STOP.keyForList, activate: activateExpense});
    return (
        <PressableWithFeedback
            ref={ref}
            testID="expense"
            onFocus={onFocus}
            accessibilityRole={CONST.ROLE.BUTTON}
            accessibilityLabel="expense"
            sentryLabel={CONST.SENTRY_LABEL.SEARCH.EXPANDED_TRANSACTION_ROW}
        >
            <Text>{isFocused ? 'expense focused' : 'expense'}</Text>
        </PressableWithFeedback>
    );
}

function GroupRow({item, onFocus}: {item: SearchListItem; onFocus?: ListItemFocusEventHandler}) {
    return (
        <View>
            <PressableWithFeedback
                testID={`row-${item.keyForList}`}
                onFocus={onFocus}
                accessibilityRole={CONST.ROLE.BUTTON}
                accessibilityLabel={item.keyForList ?? ''}
                sentryLabel={CONST.SENTRY_LABEL.SEARCH.TRANSACTION_GROUP_LIST_ITEM}
            >
                <Text>{item.keyForList}</Text>
            </PressableWithFeedback>
            {item.keyForList === 'group-0' && <ExpenseRow />}
        </View>
    );
}

function renderList(focusStops: SearchListFocusStop[] | undefined, {onSelectRow = jest.fn(), onSelectFocusStop = jest.fn()} = {}) {
    const ref = createRef<FlashListRef<SearchListItem>>();
    const renderItem: BaseSearchListProps['renderItem'] = (item, index, onFocus) => (
        <GroupRow
            item={item}
            onFocus={onFocus}
        />
    );
    const listElement = (stops: SearchListFocusStop[] | undefined) => (
        <BaseSearchList
            data={DATA}
            columns={[]}
            newTransactions={[]}
            renderItem={renderItem}
            onSelectRow={onSelectRow}
            ref={ref}
            flattenedItemsLength={DATA.length}
            focusStops={stops}
            onSelectFocusStop={onSelectFocusStop}
        />
    );
    const result = render(listElement(focusStops));
    return {...result, rerenderWithStops: (stops: SearchListFocusStop[]) => result.rerender(listElement(stops))};
}

function pressKey(shortcutKey: string) {
    act(() => {
        const shortcut = shortcuts[shortcutKey];
        if (!shortcut?.isActive) {
            return;
        }
        shortcut.callback({stopPropagation: () => {}});
    });
}

beforeAll(() => Onyx.init({keys: ONYXKEYS}));

beforeEach(() => {
    mockRevealFocusStop.mockClear();
    activateExpense.mockClear();
});

afterEach(async () => {
    for (const key of Object.keys(shortcuts)) {
        delete shortcuts[key];
    }
    await Onyx.clear();
});

describe('BaseSearchList with focus stops', () => {
    it("moves the arrow keys through an open group's expense instead of jumping to the next group", async () => {
        // Given a list whose first group is open
        renderList(STOPS_WITH_OPEN_GROUP);

        // When the down arrow is pressed twice
        pressKey('ArrowDown');
        pressKey('ArrowDown');
        await waitForBatchedUpdates();

        // Then the expense inside the open group has focus, and the list was asked to bring it into view
        expect(screen.getByText('expense focused')).toBeOnTheScreen();
        expect(mockRevealFocusStop).toHaveBeenLastCalledWith(EXPENSE_STOP);
    });

    it('selects the row when Enter is pressed on a group', () => {
        // Given focus on the first group
        const onSelectRow = jest.fn();
        renderList(STOPS_WITH_OPEN_GROUP, {onSelectRow});
        pressKey('ArrowDown');

        // When Enter is pressed
        pressKey('Enter');

        // Then the group's row is selected, not anything nested in it
        expect(onSelectRow).toHaveBeenCalledWith(DATA.at(0));
        expect(activateExpense).not.toHaveBeenCalled();
    });

    it('does what a click does when Enter is pressed on an expense', () => {
        // Given focus on the expense inside the open group
        const onSelectRow = jest.fn();
        const onSelectFocusStop = jest.fn();
        renderList(STOPS_WITH_OPEN_GROUP, {onSelectRow, onSelectFocusStop});
        pressKey('ArrowDown');
        pressKey('ArrowDown');

        // When Enter is pressed
        pressKey('Enter');

        // Then the expense's own action runs, rather than selecting the group row that holds it
        expect(activateExpense).toHaveBeenCalledTimes(1);
        expect(onSelectFocusStop).toHaveBeenCalledWith(EXPENSE_STOP);
        expect(onSelectRow).not.toHaveBeenCalled();
    });

    it('moves focus to an expense that takes focus by Tab or click, without scrolling', () => {
        // Given a list whose first group is open
        renderList(STOPS_WITH_OPEN_GROUP);

        // When the expense itself takes focus
        const stopPropagation = jest.fn();
        fireEvent(screen.getByTestId('expense'), 'focus', {nativeEvent: {}, stopPropagation});

        // Then the event stops there, so the group row around it can't take focus back
        expect(stopPropagation).toHaveBeenCalled();

        // And Enter now acts on the expense, while the list didn't scroll to an element the user just reached
        pressKey('Enter');
        expect(activateExpense).toHaveBeenCalledTimes(1);
        expect(mockRevealFocusStop).not.toHaveBeenCalled();
    });

    it('keeps focus on the same group when the stops above it change, without scrolling', () => {
        // Given focus on the second group, below an open group
        const onSelectRow = jest.fn();
        const {rerenderWithStops} = renderList(STOPS_WITH_OPEN_GROUP, {onSelectRow});
        pressKey('ArrowDown');
        pressKey('ArrowDown');
        pressKey('ArrowDown');
        const revealCallCount = mockRevealFocusStop.mock.calls.length;

        // When the first group closes, so the focused group moves up one stop
        rerenderWithStops(STOPS_WITH_CLOSED_GROUP);

        // Then Enter selects the second group, and moving focus with the stops didn't scroll the list
        pressKey('Enter');
        expect(onSelectRow).toHaveBeenCalledWith(DATA.at(1));
        expect(mockRevealFocusStop).toHaveBeenCalledTimes(revealCallCount);
    });
});

describe('BaseSearchList without focus stops', () => {
    it('brings each row the arrow keys reach into view the same way as a focus stop', () => {
        // Given a list that moves focus from row to row, as ungrouped Search does
        renderList(undefined);

        // When the down arrow is pressed twice
        pressKey('ArrowDown');
        pressKey('ArrowDown');

        // Then the second row is revealed as a row stop, so it only scrolls as far as needed and clears the floating header
        expect(mockRevealFocusStop).toHaveBeenLastCalledWith({keyForList: 'group-1', rowIndex: 1, isRow: true});
    });
});
