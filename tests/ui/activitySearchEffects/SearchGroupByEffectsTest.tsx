import {act, screen} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import FullScreenBlockingViewContextProvider from '@components/FullScreenBlockingViewContextProvider';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import Search from '@components/Search';
import {useSearchQueryContext, useSearchSelectionActions, useSearchSelectionContext} from '@components/Search/SearchContext';
import {SearchContextProvider} from '@components/Search/SearchContextProvider';
import {PlaybackContextProvider} from '@components/VideoPlayerContexts/PlaybackContext';

import useNetwork from '@hooks/useNetwork';
import useResponsiveLayout from '@hooks/useResponsiveLayout';

import * as SearchQueryUtils from '@libs/SearchQueryUtils';

import SearchPage from '@pages/Search/SearchPage';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';

import type {ComponentProps} from 'react';

import {PortalProvider} from '@gorhom/portal';
import React, {useEffect} from 'react';
import {View} from 'react-native';
import Onyx from 'react-native-onyx';

import createCoverCycleHarness, {NON_TOP_SCREEN_BEHAVIOR, createSubjectStore} from '../../utils/NonTopScreenBehaviorCycleTestUtils';

/**
 * Temporary suite for the Activity rollout audit of the Search screen, covering what a query change delivered while
 * the screen is covered does to the selection. See the sibling `SearchHookEffectsTest` for how the behavior under
 * test is selected.
 *
 * Grouping lives in the route query, so the route the page reads is driven from the test rather than fixed, and the
 * selection is read through the real provider, which sits above the navigator exactly as it does in the app.
 */

const UNGROUPED_QUERY = 'type:expense status:all';
const GROUPED_QUERY = 'type:expense status:all group-by:from';
const ungroupedQueryJSON = SearchQueryUtils.buildSearchQueryJSON(UNGROUPED_QUERY);
const groupedQueryJSON = SearchQueryUtils.buildSearchQueryJSON(GROUPED_QUERY);

let mockRouteQuery = SearchQueryUtils.buildSearchQueryString(ungroupedQueryJSON);

jest.mock('@libs/Navigation/TransitionTracker', () => ({
    runAfterTransitions: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
    const actual = jest.requireActual<Record<string, unknown>>('@react-navigation/native');
    return {
        ...actual,
        useNavigation: jest.fn(() => ({getState: () => undefined, isFocused: () => true, setParams: jest.fn()})),
    };
});

jest.mock('@hooks/useResponsiveLayout', () => jest.fn());
jest.mock('@hooks/useNetwork', () => jest.fn());
jest.mock('@hooks/useSearchShouldCalculateTotals', () => ({__esModule: true, default: jest.fn(() => false)}));

// The route the page reads, which is what carries the grouping. Reading a variable keeps it changeable mid-test,
// the way the user changing the grouping rewrites the query of the route.
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
                        routes: [{name: 'Search_Root', params: {q: mockRouteQuery}}],
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
const mockedUseNetwork = jest.mocked(useNetwork);
const mockedUseResponsiveLayout = jest.mocked(useResponsiveLayout);

const SELECTED_TRANSACTION = {
    [`${ONYXKEYS.COLLECTION.TRANSACTION}1`]: {
        isSelected: true,
        canReject: false,
        canHold: false,
        canSplit: false,
        hasBeenSplit: false,
        canChangeReport: false,
        isHeld: false,
        canUnhold: false,
        action: CONST.SEARCH.ACTION_TYPES.VIEW,
        reportID: '1',
        policyID: '1',
        amount: -5000,
        currency: 'USD',
        isFromOneTransactionReport: false,
    },
};

const selectionRequestStore = createSubjectStore(false);

/**
 * Reads and writes the selection through the real provider, which lives above the navigator. A covered screen cannot
 * be asked what it selected, so the test drives the same context the screen writes to, and reads the answer back out
 * of what the probe renders.
 */
function SelectionProbe() {
    const {applySelection} = useSearchSelectionActions();
    const {selectedTransactions} = useSearchSelectionContext();
    const {currentSearchQueryJSON} = useSearchQueryContext();

    const shouldSelect = selectionRequestStore.useValue();

    useEffect(() => {
        if (!shouldSelect) {
            return;
        }
        applySelection(() => SELECTED_TRANSACTION);
        // The selection is applied once, when the test asks for it, so the action reference is deliberately not a
        // dependency of this effect.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldSelect]);

    return <View testID={`selection-${Object.keys(selectedTransactions).length}-${currentSearchQueryJSON?.groupBy ?? 'ungrouped'}`} />;
}

function withProviders(children: React.ReactElement) {
    return (
        <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider, PlaybackContextProvider, FullScreenBlockingViewContextProvider]}>
            <PortalProvider>
                <SearchContextProvider>
                    {children}
                    <SelectionProbe />
                </SearchContextProvider>
            </PortalProvider>
        </ComposeProviders>
    );
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the props carry only what the page reads
const searchPageProps = {
    route: {key: 'Search_Root-test', name: SCREENS.SEARCH.ROOT, params: {q: UNGROUPED_QUERY}},
    navigation: undefined,
} as unknown as ComponentProps<typeof SearchPage>;

/** Writes a loaded snapshot for a hash, which is what a finished search leaves behind. */
async function seedSnapshot(hash: number | undefined) {
    await act(async () => {
        await Onyx.set(`${ONYXKEYS.COLLECTION.SNAPSHOT}${hash}`, {
            search: {
                type: CONST.SEARCH.DATA_TYPES.EXPENSE,
                offset: 0,
                hash,
                isLoading: false,
                hasMoreResults: false,
                hasResults: true,
                state: CONST.SEARCH.SNAPSHOT_STATE.LOADED,
            },
            data: {},
        });
    });
}

beforeAll(() => {
    Onyx.init({keys: ONYXKEYS});
});

beforeEach(async () => {
    jest.clearAllMocks();
    harness.install();
    mockRouteQuery = SearchQueryUtils.buildSearchQueryString(ungroupedQueryJSON);
    selectionRequestStore.setValue(false);
    mockedUseResponsiveLayout.mockReturnValue({...CONST.NAVIGATION_TESTS.DEFAULT_USE_RESPONSIVE_LAYOUT_VALUE, shouldUseNarrowLayout: true, isSmallScreenWidth: true});
    mockedUseNetwork.mockReturnValue({isOffline: false} as ReturnType<typeof useNetwork>);
    await seedSnapshot(ungroupedQueryJSON?.hash);
    await seedSnapshot(groupedQueryJSON?.hash);
});

afterEach(async () => {
    await act(async () => {
        await Onyx.clear();
    });
    jest.useRealTimers();
});

describe(`A grouping change under the ${NON_TOP_SCREEN_BEHAVIOR} behavior`, () => {
    it('drops a selection that a grouping change delivered while covered invalidated (audit 6.10)', async () => {
        // Given a page with a selection the user made on the ungrouped list
        const rendered = harness.renderSubject(<SearchPage {...searchPageProps} />, withProviders);
        harness.firePendingCallbacks();
        expect(rendered.UNSAFE_getByType(Search)).toBeTruthy();

        selectionRequestStore.setValue(true);
        harness.settle();
        expect(screen.getByTestId('selection-1-ungrouped')).toBeTruthy();

        // When the grouping changes while the screen is covered
        harness.cover();
        mockRouteQuery = SearchQueryUtils.buildSearchQueryString(groupedQueryJSON);
        await act(async () => {
            await Onyx.merge(`${ONYXKEYS.COLLECTION.SNAPSHOT}${groupedQueryJSON?.hash}`, {search: {offset: 0}});
        });
        harness.settle();
        harness.uncover();
        harness.firePendingCallbacks();

        // Then the page is on the new grouping and the selection is dropped, because rows selected in one grouping
        // do not carry over to another
        expect(screen.getByTestId(`selection-0-${CONST.SEARCH.GROUP_BY.FROM}`)).toBeTruthy();
    });
});
