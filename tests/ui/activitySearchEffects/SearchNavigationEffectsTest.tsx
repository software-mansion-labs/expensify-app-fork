import {act} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import FullScreenBlockingViewContextProvider from '@components/FullScreenBlockingViewContextProvider';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import {SearchContextProvider} from '@components/Search/SearchContextProvider';
import {PlaybackContextProvider} from '@components/VideoPlayerContexts/PlaybackContext';

import useNetwork from '@hooks/useNetwork';
import useResponsiveLayout from '@hooks/useResponsiveLayout';

import {flushDeferredWrite, hasDeferredWrite} from '@libs/deferredLayoutWrite';
import * as SearchQueryUtils from '@libs/SearchQueryUtils';

import Navigation from '@navigation/Navigation';

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
 * Temporary suite for the Activity rollout audit of the Search screen, covering the two effects of
 * `components/Search/index.tsx` that only run once the render bails out to the error state: the navigation params
 * rewrite and the dependency-free flush. See the sibling `SearchHookEffectsTest` for how the behavior under test is
 * selected.
 *
 * Both need the app-wide navigation module, which the harness stack is not attached to, so it is stubbed here rather
 * than driven through a real navigator.
 */

const SEARCH_QUERY = 'type:expense status:all';
const queryJSON = SearchQueryUtils.buildSearchQueryJSON(SEARCH_QUERY);
const mockSearchQuery = SearchQueryUtils.buildSearchQueryString(queryJSON);

jest.mock('@libs/Navigation/TransitionTracker', () => ({
    runAfterTransitions: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
    const actual = jest.requireActual<Record<string, unknown>>('@react-navigation/native');
    return {
        ...actual,
        useNavigation: jest.fn(() => ({getState: () => undefined, isFocused: () => true})),
    };
});

jest.mock('@navigation/Navigation', () => {
    const actual = jest.requireActual<{default: Record<string, unknown>}>('@navigation/Navigation');
    return {
        ...actual,
        __esModule: true,
        default: {
            ...actual.default,
            getActiveRouteWithoutParams: jest.fn(() => '/'),
            setParams: jest.fn(),
        },
    };
});

jest.mock('@libs/deferredLayoutWrite', () => ({
    hasDeferredWrite: jest.fn(() => false),
    getOptimisticWatchKey: jest.fn(),
    flushDeferredWrite: jest.fn(),
}));

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
    };
});

const harness = createCoverCycleHarness();
const mockedSetParams = jest.mocked(Navigation.setParams);
const mockedFlushDeferredWrite = jest.mocked(flushDeferredWrite);
const mockedHasDeferredWrite = jest.mocked(hasDeferredWrite);
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

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the props carry only what the page reads
const searchPageProps = {
    route: {key: 'Search_Root-test', name: SCREENS.SEARCH.ROOT, params: {q: SEARCH_QUERY}},
    navigation: undefined,
} as unknown as ComponentProps<typeof SearchPage>;

/** Seeds the snapshot the failing search leaves behind, which is what puts the screen on the error path. */
async function seedFailedSnapshot() {
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
            errors: {someError: 'Search failed'},
        });
    });
}

beforeAll(() => {
    Onyx.init({keys: ONYXKEYS});
});

beforeEach(() => {
    jest.clearAllMocks();
    harness.install();
    mockedUseResponsiveLayout.mockReturnValue({...CONST.NAVIGATION_TESTS.DEFAULT_USE_RESPONSIVE_LAYOUT_VALUE, shouldUseNarrowLayout: true, isSmallScreenWidth: true});
    mockedUseNetwork.mockReturnValue({isOffline: false} as ReturnType<typeof useNetwork>);
    mockedHasDeferredWrite.mockReturnValue(false);
    jest.mocked(Navigation.getActiveRouteWithoutParams).mockReturnValue('/');
});

afterEach(async () => {
    await act(async () => {
        await Onyx.clear();
    });
    jest.useRealTimers();
});

describe(`The Search error path under the ${NON_TOP_SCREEN_BEHAVIOR} behavior`, () => {
    it('does not rewrite the navigation params on a reveal (audit 6.8)', async () => {
        // Given a failed search, which resets the query of the route it is on
        await seedFailedSnapshot();
        harness.renderSubject(<SearchPage {...searchPageProps} />, withProviders);
        harness.firePendingCallbacks();
        harness.settle();
        const setParamsCalls = trackCalls(mockedSetParams);

        // When the screen gets covered and revealed again
        harness.cover();
        harness.uncover();
        harness.settle();

        // Then the route keeps the query it has, because the reset belongs to the failure and not to a reveal
        expect(setParamsCalls()).toBe(0);
    });

    it('flushes a deferred write for a render that happened while the screen was covered (audit 6.9)', async () => {
        // Given a failed search with a deferred write still waiting, which only the dependency-free effect can flush
        // because the list that would flush it on layout never mounts on this path
        await seedFailedSnapshot();
        mockedHasDeferredWrite.mockReturnValue(true);
        harness.renderSubject(<SearchPage {...searchPageProps} />, withProviders);
        harness.firePendingCallbacks();
        harness.settle();

        // When a new render happens while the screen is covered
        harness.cover();
        const flushCalls = trackCalls(mockedFlushDeferredWrite);
        await act(async () => {
            await Onyx.merge(`${ONYXKEYS.COLLECTION.SNAPSHOT}${queryJSON?.hash}`, {search: {offset: 1}});
        });
        harness.settle();

        // Then the write still executes, so the expense the user created before covering the screen is not left
        // waiting for a layout that will never come
        expect(flushCalls()).toBeGreaterThan(0);
    });
});
