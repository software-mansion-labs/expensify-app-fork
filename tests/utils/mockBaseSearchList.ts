import {act} from '@testing-library/react-native';

/**
 * Test-only wrapper around `BaseSearchList` that still renders the real list, but captures its `onSelectRow`, `data`,
 * focus stops and `onSelectFocusStop`. The list only calls those two callbacks when Enter is pressed on what has focus,
 * so this lets a test press Enter on any row or focus stop.
 *
 * Wire it up with `jest.mock('@components/Search/SearchList/BaseSearchList', ...)` returning this module's default export
 * through `jest.requireActual`, and call `resetMockBaseSearchList` in `beforeEach`.
 */
import type {SearchListFocusStop} from '@components/Search/SearchList/BaseSearchList/types';
import type {SearchListItem} from '@components/Search/SearchList/ListItem/types';

import type React from 'react';

import {createElement} from 'react';

type CapturedListProps = {
    onSelectRow: (item: SearchListItem) => void;
    data: SearchListItem[];
    focusStops?: readonly SearchListFocusStop[];
    onSelectFocusStop?: (stop: SearchListFocusStop) => void;
};

const capturedListProps: Partial<CapturedListProps> = {};

// BaseSearchList is mocked with this module, so a plain import would return this mock instead of the real list.
const ActualBaseSearchList = jest.requireActual<{default: React.ComponentType<CapturedListProps>}>('@components/Search/SearchList/BaseSearchList').default;

function MockBaseSearchList(props: CapturedListProps) {
    capturedListProps.onSelectRow = props.onSelectRow;
    capturedListProps.data = props.data;
    capturedListProps.focusStops = props.focusStops;
    capturedListProps.onSelectFocusStop = props.onSelectFocusStop;
    return createElement(ActualBaseSearchList, props);
}

/** Presses Enter on the first row the list renders that matches, the way the list does when that row has keyboard focus. */
function pressEnterOnListRow(isRow: (item: SearchListItem) => boolean, rowDescription: string) {
    const row = capturedListProps.data?.find(isRow);
    if (!row) {
        throw new Error(`No row for ${rowDescription}`);
    }
    act(() => capturedListProps.onSelectRow?.(row));
}

/** The keys of the stops the arrow keys move through, in order. */
function getFocusStopKeys(): string[] {
    return capturedListProps.focusStops?.map((stop) => stop.keyForList) ?? [];
}

/** Tells the view that Enter was pressed on the focus stop with this key. The stop's own action isn't run. */
function pressEnterOnFocusStop(keyForList: string) {
    const stop = capturedListProps.focusStops?.find((candidate) => candidate.keyForList === keyForList);
    if (!stop) {
        throw new Error(`No focus stop for ${keyForList}`);
    }
    act(() => capturedListProps.onSelectFocusStop?.(stop));
}

function resetMockBaseSearchList() {
    capturedListProps.onSelectRow = undefined;
    capturedListProps.data = undefined;
    capturedListProps.focusStops = undefined;
    capturedListProps.onSelectFocusStop = undefined;
}

export default MockBaseSearchList;
export {getFocusStopKeys, pressEnterOnFocusStop, pressEnterOnListRow, resetMockBaseSearchList};
