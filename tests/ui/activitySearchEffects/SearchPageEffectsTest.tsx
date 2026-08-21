import {act} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import FullScreenBlockingViewContextProvider from '@components/FullScreenBlockingViewContextProvider';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import Search from '@components/Search';
import {SearchContextProvider} from '@components/Search/SearchContextProvider';
import SearchLoadingSkeleton from '@components/Search/SearchLoadingSkeleton';
import {PlaybackContextProvider} from '@components/VideoPlayerContexts/PlaybackContext';

import useNetwork from '@hooks/useNetwork';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useSearchShouldCalculateTotals from '@hooks/useSearchShouldCalculateTotals';

import {turnOffMobileSelectionMode} from '@libs/actions/MobileSelectionMode';
import {clearFooterConversion, openSearch, search} from '@libs/actions/Search';
import isSearchTopmostFullScreenRoute from '@libs/Navigation/helpers/isSearchTopmostFullScreenRoute';
import * as SearchQueryUtils from '@libs/SearchQueryUtils';
import {cancelNavigateToReportsSpansIfSame} from '@libs/telemetry/navigateToReportsSpans';

import SearchPage from '@pages/Search/SearchPage';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';
import type {SearchResults} from '@src/types/onyx';

import type {ComponentProps} from 'react';

import {PortalProvider} from '@gorhom/portal';
import React from 'react';
import Onyx from 'react-native-onyx';

import createCoverCycleHarness, {NON_TOP_SCREEN_BEHAVIOR} from '../../utils/NonTopScreenBehaviorCycleTestUtils';

/**
 * Temporary suite for the Activity rollout audit of the Search screen, running the real page and the real Search
 * component through a cover and uncover cycle. See the sibling `SearchHookEffectsTest` for how the behavior under
 * test is selected.
 */

const SEARCH_QUERY = 'type:expense status:all';
const queryJSON = SearchQueryUtils.buildSearchQueryJSON(SEARCH_QUERY);
const mockSearchQuery = SearchQueryUtils.buildSearchQueryString(queryJSON);
const mockResetVideoPlayerData = jest.fn();

jest.mock('@libs/Navigation/TransitionTracker', () => ({
    runAfterTransitions: jest.fn(),
}));

// The Search providers live above the navigator in the app, so the one navigation hook they call is stubbed here
// instead of moving them inside the covered screen, which would put them under the wrapper under test.
jest.mock('@react-navigation/native', () => {
    const actual = jest.requireActual<Record<string, unknown>>('@react-navigation/native');
    return {
        ...actual,
        useNavigation: jest.fn(() => ({getState: () => undefined, isFocused: () => true})),
    };
});

jest.mock('@hooks/useResponsiveLayout', () => jest.fn());
jest.mock('@hooks/useNetwork', () => jest.fn());
jest.mock('@hooks/useSearchShouldCalculateTotals', () => ({__esModule: true, default: jest.fn(() => false)}));

jest.mock('@hooks/useRootNavigationState', () => ({
    __esModule: true,
    default: (selector: (state: unknown) => unknown) =>
        selector({
            index: 0,
            routes: [
                {
                    name: 'SearchFullscreenNavigator',
                    state: {
                        index: 0,
                        routes: [{name: 'Search_Root', params: {q: mockSearchQuery}}],
                    },
                },
            ],
        }),
}));

jest.mock('@libs/actions/Search', () => {
    const actual = jest.requireActual<Record<string, unknown>>('@libs/actions/Search');
    return {
        ...actual,
        search: jest.fn(() => Promise.resolve(200)),
        openSearch: jest.fn(),
        clearFooterConversion: jest.fn(),
    };
});

jest.mock('@libs/actions/MobileSelectionMode', () => ({
    turnOffMobileSelectionMode: jest.fn(),
}));

jest.mock('@libs/telemetry/navigateToReportsSpans', () => {
    const actual = jest.requireActual<Record<string, unknown>>('@libs/telemetry/navigateToReportsSpans');
    return {
        ...actual,
        // The only call site of this one is the mount cleanup under test, unlike the other cancel helpers, which the
        // empty-state bail-out path also calls during render.
        cancelNavigateToReportsSpansIfSame: jest.fn(),
    };
});

// The helper reads the app-wide navigation ref, which the harness stack is not attached to. Driving it explicitly is
// what tells the two ways of covering Search apart: an RHP leaves Search the topmost fullscreen route, another
// fullscreen route does not.
jest.mock('@libs/Navigation/helpers/isSearchTopmostFullScreenRoute', () => ({__esModule: true, default: jest.fn(() => false)}));

jest.mock('@components/VideoPlayerContexts/PlaybackContext', () => {
    const actual = jest.requireActual<Record<string, unknown>>('@components/VideoPlayerContexts/PlaybackContext');
    return {
        ...actual,
        usePlaybackActionsContext: () => ({resetVideoPlayerData: mockResetVideoPlayerData}),
    };
});

const harness = createCoverCycleHarness();
const mockedSearch = jest.mocked(search);
const mockedOpenSearch = jest.mocked(openSearch);
const mockedClearFooterConversion = jest.mocked(clearFooterConversion);
const mockedTurnOffMobileSelectionMode = jest.mocked(turnOffMobileSelectionMode);
const mockedUseNetwork = jest.mocked(useNetwork);
const mockedUseResponsiveLayout = jest.mocked(useResponsiveLayout);
const mockedUseSearchShouldCalculateTotals = jest.mocked(useSearchShouldCalculateTotals);
const mockedIsSearchTopmostFullScreenRoute = jest.mocked(isSearchTopmostFullScreenRoute);
const mockedCancelNavigateToReportsSpansIfSame = jest.mocked(cancelNavigateToReportsSpansIfSame);

/** Snapshots a mock's call count so an assertion can read the calls the cover and uncover cycle added. */
function trackCalls(mock: {mock: {calls: unknown[]}}) {
    const callsBefore = mock.mock.calls.length;
    return () => mock.mock.calls.length - callsBefore;
}

function withProviders(children: React.ReactElement) {
    return (
        <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider, PlaybackContextProvider, FullScreenBlockingViewContextProvider]}>
            <PortalProvider>
                <SearchContextProvider>{children}</SearchContextProvider>
            </PortalProvider>
        </ComposeProviders>
    );
}

// SearchPage never reads the navigation prop, and typing the harness stack as the real Search navigator would add
// no coverage here, so the screen props are built for the shape the component declares.
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the props carry only what the page reads
const searchPageProps = {
    route: {key: 'Search_Root-test', name: SCREENS.SEARCH.ROOT, params: {q: SEARCH_QUERY}},
    navigation: undefined,
} as unknown as ComponentProps<typeof SearchPage>;

function renderSearchPage() {
    return harness.renderSubject(<SearchPage {...searchPageProps} />, withProviders);
}

/**
 * One expense entry, which is what `isSearchResultsEmpty` counts. The list itself still renders its empty state
 * here: building a snapshot the section builder accepts needs the whole report, policy and personal details graph,
 * and none of the assertions below read the rows.
 */
function buildSnapshotDataWithOneExpense(): SearchResults['data'] {
    const transactionKey: `${typeof ONYXKEYS.COLLECTION.TRANSACTION}1` = `${ONYXKEYS.COLLECTION.TRANSACTION}1`;

    return {
        [transactionKey]: {
            transactionID: '1',
            reportID: '1',
            amount: -5000,
            currency: 'USD',
            created: '2024-12-21',
            merchant: 'Expense',
            category: '',
            tag: '',
            comment: {comment: ''},
        },
    };
}

/** Seeds a result set with one entry, so a later reveal can see the results turn empty. */
async function seedNonEmptySnapshot() {
    await act(async () => {
        await Onyx.merge(`${ONYXKEYS.COLLECTION.SNAPSHOT}${queryJSON?.hash}`, {
            search: {hasResults: true},
            data: buildSnapshotDataWithOneExpense(),
        });
    });
}

beforeAll(() => {
    Onyx.init({keys: ONYXKEYS});
});

beforeEach(async () => {
    jest.clearAllMocks();
    harness.install();
    mockedUseResponsiveLayout.mockReturnValue({...CONST.NAVIGATION_TESTS.DEFAULT_USE_RESPONSIVE_LAYOUT_VALUE, shouldUseNarrowLayout: true, isSmallScreenWidth: true});
    mockedUseNetwork.mockReturnValue({isOffline: false} as ReturnType<typeof useNetwork>);
    mockedSearch.mockImplementation(() => Promise.resolve(200));

    await act(async () => {
        await Onyx.set(`${ONYXKEYS.COLLECTION.SNAPSHOT}${queryJSON?.hash}`, {
            search: {
                type: CONST.SEARCH.DATA_TYPES.EXPENSE,
                offset: 0,
                hash: queryJSON?.hash,
                isLoading: false,
                hasMoreResults: false,
                hasResults: false,
                state: CONST.SEARCH.SNAPSHOT_STATE.LOADED,
            },
            data: {},
        });
    });
});

afterEach(async () => {
    await act(async () => {
        await Onyx.clear();
    });
    jest.useRealTimers();
});

describe(`SearchPage under the ${NON_TOP_SCREEN_BEHAVIOR} behavior`, () => {
    it('keeps the video player data of a covered screen (audit 1.1)', () => {
        // Given a rendered Search page on the wide layout, which is the only one that resets the player
        mockedUseResponsiveLayout.mockReturnValue({...CONST.NAVIGATION_TESTS.DEFAULT_USE_RESPONSIVE_LAYOUT_VALUE, shouldUseNarrowLayout: false, isSmallScreenWidth: false});
        renderSearchPage();
        const resetCalls = trackCalls(mockResetVideoPlayerData);

        // When the screen gets covered and revealed again
        harness.cover();
        harness.uncover();

        // Then nothing resets the player, because the user never left Search
        expect(resetCalls()).toBe(0);
    });

    it('keeps the converted footer totals of a covered screen (audit 1.2)', () => {
        // Given a rendered Search page
        renderSearchPage();
        const clearCalls = trackCalls(mockedClearFooterConversion);

        // When the screen gets covered and revealed again
        harness.cover();
        harness.uncover();

        // Then the totals survive, because the cleanup belongs to leaving Search, not to being covered
        expect(clearCalls()).toBe(0);
    });

    it('does not refetch the snapshot of an unchanged query (audit 6.1)', () => {
        // Given a rendered Search page whose snapshot already loaded, with the heavy Search component mounted
        const rendered = renderSearchPage();
        harness.firePendingCallbacks();
        expect(rendered.UNSAFE_getByType(Search)).toBeTruthy();
        const searchCalls = trackCalls(mockedSearch);

        // When the screen gets covered and revealed again
        harness.cover();
        harness.uncover();
        harness.firePendingCallbacks();

        // Then the same query does not hit the API again
        expect(searchCalls()).toBe(0);
    });

    it('does not turn the mobile selection mode off when another fullscreen route covers Search (audit 6.2 and 6.3)', () => {
        // Given a rendered Search page that a non-Search fullscreen route is about to cover
        mockedIsSearchTopmostFullScreenRoute.mockReturnValue(false);
        renderSearchPage();
        const turnOffCalls = trackCalls(mockedTurnOffMobileSelectionMode);

        // When the screen gets covered and revealed again
        harness.cover();
        harness.uncover();

        // Then the selection mode is left alone, because the user never left the Search they selected in
        expect(turnOffCalls()).toBe(0);
    });

    it('does not turn the mobile selection mode off when an RHP covers Search (audit 6.3, the RHP case)', () => {
        // Given a rendered Search page under an RHP, which leaves Search the topmost fullscreen route
        mockedIsSearchTopmostFullScreenRoute.mockReturnValue(true);
        renderSearchPage();
        const turnOffCalls = trackCalls(mockedTurnOffMobileSelectionMode);

        // When the RHP opens and closes again
        harness.cover();
        harness.uncover();

        // Then the guard on the cleanup holds and the selection mode survives, which is the common case: most of
        // what covers Search is an RHP, not another fullscreen route
        expect(turnOffCalls()).toBe(0);
    });

    it('keeps the cost of a reveal flat across repeated cycles (audit 6.1)', () => {
        // Given a rendered Search page with the heavy Search component mounted
        const rendered = renderSearchPage();
        harness.firePendingCallbacks();
        expect(rendered.UNSAFE_getByType(Search)).toBeTruthy();

        // When the user opens and closes something over Search three times
        const searchesPerCycle = harness.measureCycles(3, mockedSearch);

        // Then every cycle costs the same: a request per reveal is bad enough, a request count that grows with the
        // number of reveals would be a leak on top of it
        expect(new Set(searchesPerCycle).size).toBe(1);
    });

    it('does not fall back to the loading skeleton after a reveal (audit 6.4)', () => {
        // Given a rendered Search page that already shows its content
        const rendered = renderSearchPage();
        harness.firePendingCallbacks();
        expect(rendered.UNSAFE_queryByType(SearchLoadingSkeleton)).toBeNull();

        // When the screen gets covered and revealed again
        harness.cover();
        harness.uncover();
        harness.firePendingCallbacks();

        // Then the list stays on screen instead of being replaced by the skeleton of a restarted defer cycle
        expect(rendered.UNSAFE_queryByType(SearchLoadingSkeleton)).toBeNull();
    });

    it('keeps the interactive Search component mounted across a cover cycle (audit 5.2)', () => {
        // Given a page that already transitioned from its static phase to the interactive Search component
        const rendered = renderSearchPage();
        harness.firePendingCallbacks();
        expect(rendered.UNSAFE_getByType(Search)).toBeTruthy();

        // When the screen gets covered and revealed again
        harness.cover();
        harness.uncover();
        harness.firePendingCallbacks();

        // Then it stays interactive instead of falling back to the lightweight static list
        expect(rendered.UNSAFE_queryByType(Search)).toBeTruthy();
    });

    it('reports what an empty result set delivered while covered does on a reveal (audit 6.11)', async () => {
        // Given a page whose result set is not empty
        await seedNonEmptySnapshot();
        const rendered = renderSearchPage();
        harness.firePendingCallbacks();
        expect(rendered.UNSAFE_getByType(Search)).toBeTruthy();

        // When the result set empties out while the screen is covered
        harness.cover();
        const turnOffCalls = trackCalls(mockedTurnOffMobileSelectionMode);
        await act(async () => {
            await Onyx.set(`${ONYXKEYS.COLLECTION.SNAPSHOT}${queryJSON?.hash}`, {
                search: {
                    type: CONST.SEARCH.DATA_TYPES.EXPENSE,
                    offset: 0,
                    hash: queryJSON?.hash,
                    isLoading: false,
                    hasMoreResults: false,
                    hasResults: false,
                    state: CONST.SEARCH.SNAPSHOT_STATE.LOADED,
                },
                data: {},
            });
        });
        harness.settle();
        harness.uncover();
        harness.firePendingCallbacks();

        // Then the reveal drops the selection once, for a change the user never saw happen
        expect(turnOffCalls()).toBe(1);
    });

    it('reports what the totals retry does when the search finishes while covered (audit 6.12)', async () => {
        // Given a page whose in-flight search armed the retry that fetches the totals
        mockedUseSearchShouldCalculateTotals.mockReturnValue(true);
        await act(async () => {
            await Onyx.merge(`${ONYXKEYS.COLLECTION.SNAPSHOT}${queryJSON?.hash}`, {search: {isLoading: true}});
        });
        const rendered = renderSearchPage();
        harness.firePendingCallbacks();
        expect(rendered.UNSAFE_getByType(Search)).toBeTruthy();

        // When the search finishes while the screen is covered
        harness.cover();
        const searchCalls = trackCalls(mockedSearch);
        await act(async () => {
            await Onyx.merge(`${ONYXKEYS.COLLECTION.SNAPSHOT}${queryJSON?.hash}`, {search: {isLoading: false}});
        });
        harness.settle();
        harness.uncover();
        harness.firePendingCallbacks();

        // Then the reveal fetches the totals once, not once per effect that survived the cover
        expect(searchCalls()).toBe(1);
    });

    it('keeps the navigate-to-reports spans of a screen covered before its first layout (audit 6.2, the telemetry branch)', () => {
        // Given a mounted Search component whose list has not reported a layout yet, so the spans are still open
        const rendered = renderSearchPage();
        harness.firePendingCallbacks();
        expect(rendered.UNSAFE_getByType(Search)).toBeTruthy();
        const cancelIfSameCalls = trackCalls(mockedCancelNavigateToReportsSpansIfSame);

        // When the screen gets covered
        harness.cover();

        // Then the spans stay open, because the cleanup that cancels them belongs to leaving Search
        expect(cancelIfSameCalls()).toBe(0);
    });

    it('reports how often the page-level setup calls openSearch (audit 2.3)', () => {
        // Given a rendered Search page
        renderSearchPage();
        const openSearchCalls = trackCalls(mockedOpenSearch);

        // When the screen gets covered and revealed again
        harness.cover();
        harness.uncover();

        // Then the focus-driven call runs once for the regained focus, which is what it already does today
        expect(openSearchCalls()).toBe(1);
    });
});
