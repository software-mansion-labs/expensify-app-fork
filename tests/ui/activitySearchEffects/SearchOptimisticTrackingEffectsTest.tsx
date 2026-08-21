import {act, screen} from '@testing-library/react-native';

import useOptimisticSearchTracking from '@components/Search/hooks/useOptimisticSearchTracking';
import useStableOptimisticSortedData from '@components/Search/hooks/useStableOptimisticSortedData';
import type {SearchListItem} from '@components/Search/SearchList/ListItem/types';
import type {SearchQueryJSON} from '@components/Search/types';

import {flushDeferredWrite, getOptimisticWatchKey, hasDeferredWrite} from '@libs/deferredLayoutWrite';
import {buildSearchQueryJSON} from '@libs/SearchQueryUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type SearchResults from '@src/types/onyx/SearchResults';

import React from 'react';
import {View} from 'react-native';

import createCoverCycleHarness, {NON_TOP_SCREEN_BEHAVIOR, createSubjectStore} from '../../utils/NonTopScreenBehaviorCycleTestUtils';

/**
 * Temporary suite for the Activity rollout audit of the Search screen, covering the optimistic expense lifecycle
 * `<Search>` runs while the server snapshot catches up. See the sibling `SearchHookEffectsTest` for how the behavior
 * under test is selected.
 *
 * The two hooks are driven together here, the way `useSearchSnapshot` calls them, because the rollback timer is
 * armed by the second one and cleaned up by the first one.
 */

const OPTIMISTIC_TRANSACTION_ID = '1';
const OPTIMISTIC_WATCH_KEY: `${typeof ONYXKEYS.COLLECTION.TRANSACTION}${string}` = `${ONYXKEYS.COLLECTION.TRANSACTION}${OPTIMISTIC_TRANSACTION_ID}`;
const ROLLBACK_GRACE_MS = 3_000;
const SAFETY_TIMEOUT_MS = 10_000;

jest.mock('@libs/Navigation/TransitionTracker', () => ({
    runAfterTransitions: jest.fn(),
}));

jest.mock('@libs/deferredLayoutWrite', () => ({
    hasDeferredWrite: jest.fn(() => true),
    getOptimisticWatchKey: jest.fn(),
    flushDeferredWrite: jest.fn(),
}));

jest.mock('@libs/telemetry/submitFollowUpAction', () => ({
    getPendingSubmitFollowUpAction: jest.fn(),
}));

const harness = createCoverCycleHarness();
const mockedFlushDeferredWrite = jest.mocked(flushDeferredWrite);
const mockedHasDeferredWrite = jest.mocked(hasDeferredWrite);
const mockedGetOptimisticWatchKey = jest.mocked(getOptimisticWatchKey);

const QUERY_JSON = buildTestQueryJSON('type:expense status:all');
const SEARCH_RESULTS: SearchResults = {
    search: {
        type: CONST.SEARCH.DATA_TYPES.EXPENSE,
        offset: 0,
        hash: QUERY_JSON.hash,
        isLoading: false,
        hasMoreResults: false,
        hasResults: true,
        sortBy: CONST.SEARCH.TABLE_COLUMNS.DATE,
        sortOrder: CONST.SEARCH.SORT_ORDER.DESC,
    },
    data: {},
};

const sortedDataStore = createSubjectStore<SearchListItem[]>([]);

/** Parses a query for the tests and fails loudly instead of handing a partially built object to the hooks. */
function buildTestQueryJSON(query: string): SearchQueryJSON {
    const parsed = buildSearchQueryJSON(query);
    if (!parsed) {
        throw new Error(`Could not parse the test query: ${query}`);
    }
    return parsed;
}

/** Snapshots a mock's call count so an assertion can read the calls the cover and uncover cycle added. */
function trackCalls(mock: {mock: {calls: unknown[]}}) {
    const callsBefore = mock.mock.calls.length;
    return () => mock.mock.calls.length - callsBefore;
}

/**
 * The row of the expense the user just created. Only the transaction ID is read by the lifecycle under test, and
 * building a full list item would mean building the whole report and policy graph behind it.
 */
function buildOptimisticListItem(): SearchListItem {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the lifecycle under test reads the transaction ID alone
    return {
        transactionID: OPTIMISTIC_TRANSACTION_ID,
        keyForList: OPTIMISTIC_WATCH_KEY,
        pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.ADD,
    } as unknown as SearchListItem;
}

function OptimisticTrackingProbe() {
    const {showPendingExpensePlaceholder, trackingState} = useOptimisticSearchTracking({
        searchResults: SEARCH_RESULTS,
        queryJSON: QUERY_JSON,
        transactions: undefined,
        reportActions: undefined,
    });
    const {stableSortedData} = useStableOptimisticSortedData(sortedDataStore.useValue(), SEARCH_RESULTS, trackingState);

    // The state under test is rendered rather than written to a variable outside the probe, so a hidden screen is
    // measured through what it last committed.
    return <View testID={`searchRows-${stableSortedData.length}`}>{!!showPendingExpensePlaceholder && <View testID="pendingExpensePlaceholder" />}</View>;
}

/** Advances the clock the way waiting on the screen does, so a timer armed before the cover can still fire. */
function advanceClock(durationMs: number) {
    act(() => {
        jest.advanceTimersByTime(durationMs);
    });
}

beforeEach(() => {
    jest.clearAllMocks();
    harness.install();
    mockedHasDeferredWrite.mockReturnValue(true);
    mockedGetOptimisticWatchKey.mockReturnValue(OPTIMISTIC_WATCH_KEY);
    sortedDataStore.setValue([]);
});

afterEach(() => {
    jest.useRealTimers();
});

describe(`The optimistic expense lifecycle under the ${NON_TOP_SCREEN_BEHAVIOR} behavior`, () => {
    it('keeps the deferred write pending while the screen is covered (audit 11.1)', () => {
        // Given a screen that mounted with a deferred write waiting for its layout
        harness.renderSubject(<OptimisticTrackingProbe />);
        const flushCalls = trackCalls(mockedFlushDeferredWrite);

        // When the screen gets covered
        harness.cover();

        // Then the write is not flushed, because the cleanup belongs to leaving Search, not to being covered
        expect(flushCalls()).toBe(0);
    });

    it('rolls the optimistic row back after the grace period that started before the cover (audit 11.2)', () => {
        // Given a screen showing an optimistically created expense
        harness.renderSubject(<OptimisticTrackingProbe />);
        sortedDataStore.setValue([buildOptimisticListItem()]);
        harness.settle();
        expect(screen.getByTestId('searchRows-1')).toBeTruthy();

        // When the row disappears from the results and the screen gets covered while the rollback counts down
        sortedDataStore.setValue([]);
        harness.settle();
        harness.cover();
        harness.uncover();
        advanceClock(ROLLBACK_GRACE_MS + 500);

        // Then the row is gone: a covered screen must not leave a phantom expense in the list forever
        expect(screen.getByTestId('searchRows-0')).toBeTruthy();
    });

    it('dismisses the pending expense placeholder on the safety timeout that started before the cover (audit 11.3)', () => {
        // Given a screen waiting for an optimistic expense that never arrives
        harness.renderSubject(<OptimisticTrackingProbe />);
        expect(screen.getByTestId('pendingExpensePlaceholder')).toBeTruthy();

        // When most of the safety timeout passes, the screen gets covered, and the rest of it passes
        advanceClock(SAFETY_TIMEOUT_MS - 2_000);
        harness.cover();
        harness.uncover();
        advanceClock(2_500);

        // Then the placeholder is gone instead of being restarted from zero by the reveal
        expect(screen.queryByTestId('pendingExpensePlaceholder')).toBeNull();
    });
});
