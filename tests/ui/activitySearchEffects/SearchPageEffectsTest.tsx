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

import {turnOffMobileSelectionMode} from '@libs/actions/MobileSelectionMode';
import {clearFooterConversion, openSearch, search} from '@libs/actions/Search';
import * as SearchQueryUtils from '@libs/SearchQueryUtils';

import SearchPage from '@pages/Search/SearchPage';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';

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

    it('does not turn the mobile selection mode off on a cover cycle (audit 6.2 and 6.3)', () => {
        // Given a rendered Search page
        renderSearchPage();
        const turnOffCalls = trackCalls(mockedTurnOffMobileSelectionMode);

        // When the screen gets covered and revealed again
        harness.cover();
        harness.uncover();

        // Then the selection mode is left alone, because the screen stayed the topmost Search route
        expect(turnOffCalls()).toBe(0);
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
