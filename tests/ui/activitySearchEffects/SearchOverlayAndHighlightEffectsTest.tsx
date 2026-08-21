import {act, screen} from '@testing-library/react-native';

import {ScrollOffsetContext} from '@components/ScrollOffsetContextProvider';
import useScrollRestoration from '@components/Search/primitives/useScrollRestoration';
import type {SearchQueryJSON} from '@components/Search/types';

import useSearchHighlightAndScroll from '@hooks/useSearchHighlightAndScroll';
import useSearchOverlay from '@hooks/useSearchOverlay';

import {search} from '@libs/actions/Search';
import {mergeTransactionIdsHighlightOnSearchRoute} from '@libs/actions/Transaction';
import {hasDeferredWrite} from '@libs/deferredLayoutWrite';
import {buildSearchQueryJSON} from '@libs/SearchQueryUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {SearchResults, Transaction} from '@src/types/onyx';

import type {FlashListRef} from '@shopify/flash-list';
import type {OnyxCollection} from 'react-native-onyx';

import React, {useRef} from 'react';
import {View} from 'react-native';

import createCoverCycleHarness, {NON_TOP_SCREEN_BEHAVIOR, createSubjectStore} from '../../utils/NonTopScreenBehaviorCycleTestUtils';

/**
 * Temporary suite for the Activity rollout audit of the Search screen, covering the overlay, the highlight and the
 * scroll restoration hooks. See the sibling `SearchHookEffectsTest` for how the behavior under test is selected.
 */

const mockOnyxValues = new Map<string, unknown>();

jest.mock('@libs/Navigation/TransitionTracker', () => ({
    runAfterTransitions: jest.fn(),
}));

jest.mock('@hooks/useOnyx', () => ({
    __esModule: true,
    default: (key: string, options?: {selector?: (value: unknown) => unknown}) => {
        const value = mockOnyxValues.get(key);
        return [options?.selector ? options.selector(value) : value, {status: 'loaded'}];
    },
}));

jest.mock('@hooks/useNetwork', () => ({
    __esModule: true,
    default: () => ({isOffline: false}),
}));

jest.mock('@hooks/usePolicyForMovingExpenses', () => ({
    __esModule: true,
    default: () => ({policyForMovingExpensesID: undefined}),
}));

jest.mock('@components/OnyxListItemProvider', () => ({
    useSession: () => ({accountID: 1}),
}));

jest.mock('@libs/deferredLayoutWrite', () => ({
    hasDeferredWrite: jest.fn(() => false),
}));

jest.mock('@libs/Navigation/Navigation', () => ({
    getIsFullscreenPreInsertedUnderRHP: () => false,
}));

jest.mock('@libs/Navigation/helpers/isSearchTopmostFullScreenRoute', () => ({
    __esModule: true,
    default: () => true,
}));

jest.mock('@libs/actions/Search', () => ({
    search: jest.fn(() => Promise.resolve(200)),
}));

jest.mock('@libs/actions/Transaction', () => ({
    mergeTransactionIdsHighlightOnSearchRoute: jest.fn(),
}));

const harness = createCoverCycleHarness();
const mockedSearch = jest.mocked(search);
const mockedMergeHighlights = jest.mocked(mergeTransactionIdsHighlightOnSearchRoute);
const mockedHasDeferredWrite = jest.mocked(hasDeferredWrite);

/** Parses a query for the tests and fails loudly instead of handing a partially built object to the hooks. */
function buildTestQueryJSON(query: string): SearchQueryJSON {
    const parsed = buildSearchQueryJSON(query);
    if (!parsed) {
        throw new Error(`Could not parse the test query: ${query}`);
    }
    return parsed;
}

/** Builds a transaction fixture carrying only the field the hooks under test read. */
function buildTransactionFixture(transactionID: string): Transaction {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the fixture carries only what is read
    return {transactionID} as Transaction;
}

const QUERY_JSON = buildTestQueryJSON('type:expense status:all');
const TRANSACTION_KEY = `${ONYXKEYS.COLLECTION.TRANSACTION}t1`;
const SECOND_TRANSACTION_KEY = `${ONYXKEYS.COLLECTION.TRANSACTION}t2`;

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the fixture carries only what is read
const SEARCH_RESULTS = {
    search: {type: CONST.SEARCH.DATA_TYPES.EXPENSE, offset: 0, hash: QUERY_JSON.hash, isLoading: false, hasMoreResults: false},
    data: {[TRANSACTION_KEY]: {transactionID: 't1'}},
} as unknown as SearchResults;

/** Snapshots a mock's call count so an assertion can read the calls the cover and uncover cycle added. */
function trackCalls(mock: {mock: {calls: unknown[]}}) {
    const callsBefore = mock.mock.calls.length;
    return () => mock.mock.calls.length - callsBefore;
}

function SearchOverlayProbe() {
    const {isOverlayActive} = useSearchOverlay({
        searchResults: undefined,
        queryJSON: QUERY_JSON,
        shouldUseNarrowLayout: false,
        isMobileSelectionModeEnabled: false,
        currentSearchKey: CONST.SEARCH.SEARCH_KEYS.EXPENSES,
    });
    return <View testID={`overlayActive-${isOverlayActive}`} />;
}

type HighlightProbeState = {
    searchResults: SearchResults;
    transactions: OnyxCollection<Transaction>;
    previousTransactions: OnyxCollection<Transaction>;
};

const highlightStore = createSubjectStore<HighlightProbeState>({
    searchResults: SEARCH_RESULTS,
    transactions: {[TRANSACTION_KEY]: buildTransactionFixture('t1')},
    previousTransactions: {[TRANSACTION_KEY]: buildTransactionFixture('t1')},
});

function HighlightProbe() {
    const state = highlightStore.useValue();
    const {newSearchResultKeys} = useSearchHighlightAndScroll({
        searchResults: state.searchResults,
        transactions: state.transactions,
        previousTransactions: state.previousTransactions,
        reportActions: undefined,
        previousReportActions: undefined,
        queryJSON: QUERY_JSON,
        searchKey: CONST.SEARCH.SEARCH_KEYS.EXPENSES,
        offset: 0,
        shouldCalculateTotals: false,
        shouldUseLiveData: false,
    });
    return <View testID={`queuedHighlights-${newSearchResultKeys?.size ?? 0}`} />;
}

const scrollToOffset = jest.fn();

function ScrollRestorationProbe() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the stub carries only the method used
    const listRef = useRef({scrollToOffset} as unknown as FlashListRef<unknown>);
    useScrollRestoration(listRef);
    return <View testID="probe" />;
}

const scrollOffsetContextValue = {
    saveScrollOffset: () => {},
    getScrollOffset: () => 120,
    saveScrollIndex: () => {},
    getScrollIndex: () => undefined,
    cleanStaleScrollOffsets: () => {},
};

/** Reads the overlay state the probe rendered, which stays readable while the screen is covered. */
function getOverlayActive() {
    return screen.queryByTestId('overlayActive-true', {includeHiddenElements: true}) !== null;
}

/** Reads how many rows the highlight hook has queued for its animation. */
function getQueuedHighlightCount() {
    for (const count of [0, 1, 2]) {
        if (screen.queryByTestId(`queuedHighlights-${count}`, {includeHiddenElements: true})) {
            return count;
        }
    }
    throw new Error('The highlight probe did not render');
}

function withScrollOffsetContext(children: React.ReactElement) {
    return <ScrollOffsetContext.Provider value={scrollOffsetContextValue}>{children}</ScrollOffsetContext.Provider>;
}

beforeEach(() => {
    jest.clearAllMocks();
    harness.install();
    mockOnyxValues.clear();
    mockedHasDeferredWrite.mockReturnValue(false);
    mockedSearch.mockImplementation(() => Promise.resolve(200));
    highlightStore.setValue({
        searchResults: SEARCH_RESULTS,
        transactions: {[TRANSACTION_KEY]: buildTransactionFixture('t1')},
        previousTransactions: {[TRANSACTION_KEY]: buildTransactionFixture('t1')},
    });
});

afterEach(() => {
    jest.useRealTimers();
});

describe(`Search overlay and highlight hooks under the ${NON_TOP_SCREEN_BEHAVIOR} behavior`, () => {
    describe('useSearchOverlay', () => {
        it('keeps a dismissed overlay dismissed across a cover cycle (audit 4.1)', () => {
            // Given an overlay that never armed, because nothing deferred a write
            harness.renderSubject(<SearchOverlayProbe />);
            expect(getOverlayActive()).toBe(false);

            // When the screen gets covered and revealed again
            harness.cover();
            harness.uncover();

            // Then the ready list stays visible instead of getting covered by the static overlay again
            expect(getOverlayActive()).toBe(false);
        });

        it('dismisses an armed overlay on the safety timeout that started before the cover (audit 4.2)', () => {
            // Given an overlay armed by a deferred write
            mockedHasDeferredWrite.mockReturnValue(true);
            harness.renderSubject(<SearchOverlayProbe />);
            expect(getOverlayActive()).toBe(true);

            // When most of the safety timeout passes, the screen gets covered and revealed, and the rest passes
            act(() => {
                jest.advanceTimersByTime(4000);
            });
            harness.cover();
            harness.uncover();
            act(() => {
                jest.advanceTimersByTime(1500);
            });

            // Then the overlay is gone, because its five second safety timeout ran to the end
            expect(getOverlayActive()).toBe(false);
        });
    });

    describe('useSearchHighlightAndScroll', () => {
        it('does not trigger another search when nothing changed (audit 7.1)', () => {
            // Given a mounted highlight hook with a settled result set
            harness.renderSubject(<HighlightProbe />);
            harness.firePendingCallbacks();
            const searchCalls = trackCalls(mockedSearch);

            // When the screen gets covered and revealed again with the same data
            harness.cover();
            harness.uncover();
            harness.firePendingCallbacks();

            // Then no refetch is queued, because no transaction arrived
            expect(searchCalls()).toBe(0);
        });

        it('triggers exactly one search for a transaction that arrived while covered (audit 7.1)', () => {
            // Given a mounted highlight hook
            harness.renderSubject(<HighlightProbe />);
            harness.firePendingCallbacks();
            const searchCalls = trackCalls(mockedSearch);

            // When a new transaction lands while the screen is covered
            harness.cover();
            highlightStore.setValue({
                searchResults: SEARCH_RESULTS,
                transactions: {
                    [TRANSACTION_KEY]: buildTransactionFixture('t1'),
                    [SECOND_TRANSACTION_KEY]: buildTransactionFixture('t2'),
                },
                previousTransactions: {[TRANSACTION_KEY]: buildTransactionFixture('t1')},
            });
            harness.settle();
            harness.firePendingCallbacks();
            harness.uncover();
            harness.firePendingCallbacks();

            // Then the snapshot is refetched once, not once per lifecycle step
            expect(searchCalls()).toBe(1);
        });

        it('keeps the queued highlight flags while the screen is covered (audit 7.3)', () => {
            // Given queued highlight flags for the current search type
            mockOnyxValues.set(ONYXKEYS.TRANSACTION_IDS_HIGHLIGHT_ON_SEARCH_ROUTE, {[CONST.SEARCH.DATA_TYPES.EXPENSE]: {t1: true}});
            harness.renderSubject(<HighlightProbe />);
            const mergeCalls = trackCalls(mockedMergeHighlights);

            // When the screen gets covered and revealed again
            harness.cover();
            harness.uncover();

            // Then nothing wipes the flags, so the row still highlights when the user comes back
            expect(mockedMergeHighlights).not.toHaveBeenCalledWith(QUERY_JSON.type, null);
            expect(mergeCalls()).toBe(0);
        });

        it('does not replay a highlight that already finished (audit 7.4)', () => {
            // Given a highlight that was queued and then reset after its animation window
            mockOnyxValues.set(ONYXKEYS.TRANSACTION_IDS_HIGHLIGHT_ON_SEARCH_ROUTE, {[CONST.SEARCH.DATA_TYPES.EXPENSE]: {t1: true}});
            harness.renderSubject(<HighlightProbe />);
            act(() => {
                jest.advanceTimersByTime(CONST.ANIMATED_HIGHLIGHT_START_DURATION + 100);
            });
            expect(getQueuedHighlightCount()).toBe(0);

            // When the screen gets covered and revealed again
            harness.cover();
            harness.uncover();

            // Then the same row is not queued for the highlight animation a second time
            expect(getQueuedHighlightCount()).toBe(0);
        });
    });

    describe('useScrollRestoration', () => {
        it('reports how often the saved scroll offset is re-applied (audit 8.2)', () => {
            // Given a list that restored its offset on mount
            harness.renderSubject(<ScrollRestorationProbe />, withScrollOffsetContext);
            harness.settle();
            const scrollCalls = trackCalls(scrollToOffset);

            // When the screen gets covered and revealed again
            harness.cover();
            harness.uncover();
            harness.settle();

            // Then the offset is applied once for the regained focus, which is what it already does today
            expect(scrollCalls()).toBe(1);
        });
    });
});
