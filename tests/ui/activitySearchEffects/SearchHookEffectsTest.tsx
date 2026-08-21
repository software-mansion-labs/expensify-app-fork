import {act} from '@testing-library/react-native';

import type {SearchQueryJSON} from '@components/Search/types';

// The web entry point of the hook is an empty function, so the audit point is only observable on the Android one.
import useAndroidBackButtonHandler from '@hooks/useAndroidBackButtonHandler/index.android';
import useEndSubmitNavigationSpans from '@hooks/useEndSubmitNavigationSpans';
import useMobileSelectionMode from '@hooks/useMobileSelectionMode';
import usePrevious from '@hooks/usePrevious';
import useSaveSortedReportIDs from '@hooks/useSaveSortedReportIDs';
import useScrollEventEmitter from '@hooks/useScrollEventEmitter';
import useSearchPageSetup from '@hooks/useSearchPageSetup';
import useSeedMyExpensesSearch from '@hooks/useSeedMyExpensesSearch';

import {turnOffMobileSelectionMode} from '@libs/actions/MobileSelectionMode';
import {openSearch, search, seedMyExpensesSearch} from '@libs/actions/Search';
import {buildSearchQueryJSON} from '@libs/SearchQueryUtils';
import {endSubmitFollowUpActionSpan, getPendingSubmitFollowUpAction} from '@libs/telemetry/submitFollowUpAction';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import {BackHandler, DeviceEventEmitter, View} from 'react-native';

import createCoverCycleHarness, {NON_TOP_SCREEN_BEHAVIOR, createSubjectStore} from '../../utils/NonTopScreenBehaviorCycleTestUtils';

/**
 * Temporary suite for the Activity rollout audit of the Search screen. Every test states an invariant that holds
 * today, with covered screens frozen. Running the file with `NON_TOP_SCREEN_BEHAVIOR=activity` turns Activity on for
 * the subject screen, and the invariants that a hide and reveal cycle breaks start failing.
 *
 * Each assertion measures the delta over the cover and uncover cycle, not the absolute call count, so the dev-only
 * StrictMode double mount that Activity screens run under never enters the numbers.
 */

const mockOnyxValues = new Map<string, unknown>();
const mockClearSelectedTransactions = jest.fn();
const mockSetSortedReportIDs = jest.fn();
let mockIsOfflineValue = false;

function mockIsOffline() {
    return mockIsOfflineValue;
}

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
    default: () => ({isOffline: mockIsOffline()}),
}));

jest.mock('@hooks/useSearchShouldCalculateTotals', () => ({
    __esModule: true,
    default: () => false,
}));

jest.mock('@components/Search/SearchContext', () => ({
    useSearchSelectionActions: () => ({clearSelectedTransactions: mockClearSelectedTransactions}),
    useSearchResultsContext: () => ({shouldUseLiveData: false, currentSearchResults: undefined, lastSearchType: undefined}),
    useSearchResultsActions: () => ({setLastSearchType: jest.fn(), setSortedReportIDs: mockSetSortedReportIDs}),
    useSearchQueryContext: () => ({currentSearchKey: 'expenses', currentSearchQueryJSON: undefined}),
}));

jest.mock('@libs/actions/Search', () => ({
    search: jest.fn(() => Promise.resolve(200)),
    openSearch: jest.fn(),
    seedMyExpensesSearch: jest.fn(),
}));

jest.mock('@libs/actions/ReportNavigation', () => ({
    saveLastSearchParams: jest.fn(),
}));

jest.mock('@libs/actions/MobileSelectionMode', () => ({
    turnOffMobileSelectionMode: jest.fn(),
}));

jest.mock('@libs/telemetry/submitFollowUpAction', () => ({
    getPendingSubmitFollowUpAction: jest.fn(),
    endSubmitFollowUpActionSpan: jest.fn(),
}));

const harness = createCoverCycleHarness();
const mockedSearch = jest.mocked(search);
const mockedOpenSearch = jest.mocked(openSearch);
const mockedSeedMyExpensesSearch = jest.mocked(seedMyExpensesSearch);
const mockedTurnOffMobileSelectionMode = jest.mocked(turnOffMobileSelectionMode);
const mockedGetPendingSubmitFollowUpAction = jest.mocked(getPendingSubmitFollowUpAction);
const mockedEndSubmitFollowUpActionSpan = jest.mocked(endSubmitFollowUpActionSpan);

const QUERY_JSON = buildTestQueryJSON('type:expense status:all');

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

function SearchPageSetupProbe() {
    useSearchPageSetup(QUERY_JSON);
    return <View testID="probe" />;
}

function MobileSelectionModeProbe({onTurnOff}: {onTurnOff: () => void}) {
    useMobileSelectionMode(onTurnOff);
    return <View testID="probe" />;
}

function SeedMyExpensesSearchProbe() {
    useSeedMyExpensesSearch();
    return <View testID="probe" />;
}

function ScrollEventEmitterProbe({onReady}: {onReady: (trigger: () => void) => void}) {
    const triggerScrollEvent = useScrollEventEmitter();
    onReady(triggerScrollEvent);
    return <View testID="probe" />;
}

function EndSubmitNavigationSpansProbe({onReady}: {onReady: (end: (wasListEmpty: boolean, source: 'focus' | 'layout') => void) => void}) {
    const endSubmitNavigationSpans = useEndSubmitNavigationSpans({requireLayout: true});
    onReady(endSubmitNavigationSpans);
    return <View testID="probe" />;
}

const sortedItemsStore = createSubjectStore<Array<{reportID?: string}>>([{reportID: '1'}]);

function SaveSortedReportIDsProbe() {
    useSaveSortedReportIDs(CONST.SEARCH.DATA_TYPES.EXPENSE_REPORT, sortedItemsStore.useValue());
    return <View testID="probe" />;
}

function AndroidBackButtonHandlerProbe({onBackButtonPress}: {onBackButtonPress: () => boolean}) {
    useAndroidBackButtonHandler(onBackButtonPress);
    return <View testID="probe" />;
}

const previousValueStore = createSubjectStore(1);
const renderedPreviousValues: number[] = [];

function PreviousValueProbe() {
    const previous = usePrevious(previousValueStore.useValue());
    renderedPreviousValues.push(previous);
    return <View testID="probe" />;
}

beforeEach(() => {
    jest.clearAllMocks();
    harness.install();
    mockOnyxValues.clear();
    mockIsOfflineValue = false;
    mockedSearch.mockImplementation(() => Promise.resolve(200));
});

afterEach(() => {
    jest.useRealTimers();
});

describe(`Search hooks under the ${NON_TOP_SCREEN_BEHAVIOR} behavior`, () => {
    describe('useSearchPageSetup', () => {
        it('clears the selected transactions once per reveal, as it already does today (audit 2.1)', () => {
            // Given a mounted Search page setup whose query never changes
            harness.renderSubject(<SearchPageSetupProbe />);
            const clearCalls = trackCalls(mockClearSelectedTransactions);

            // When the screen gets covered and revealed again
            harness.cover();
            harness.uncover();

            // Then only the focus-driven clear runs, which is the baseline the frozen screen already has: the
            // selection is lost on every reveal, and Activity must not add a second clear on top of it
            expect(clearCalls()).toBe(1);
        });

        it('does not fire another search for an unchanged query (audit 2.2)', () => {
            // Given a page-level search that already fired for the current query
            harness.renderSubject(<SearchPageSetupProbe />);
            const searchCalls = trackCalls(mockedSearch);

            // When the screen gets covered and revealed again
            harness.cover();
            harness.uncover();

            // Then the query does not hit the API a second time
            expect(searchCalls()).toBe(0);
        });

        it('keeps the cost of a reveal flat across repeated cycles (audit 2.1 and 2.2)', () => {
            // Given a mounted Search page setup
            harness.renderSubject(<SearchPageSetupProbe />);

            // When the user opens and closes something over Search three times, as they do all session long
            const clearsPerCycle = harness.measureCycles(3, mockClearSelectedTransactions);

            // Then every cycle costs the same, so nothing survives a hide to pile another listener on the next one
            expect(new Set(clearsPerCycle).size).toBe(1);
        });

        it('reports how many times openSearch runs across a cover cycle (audit 2.3)', () => {
            // Given a mounted Search page setup
            harness.renderSubject(<SearchPageSetupProbe />);
            const openSearchCalls = trackCalls(mockedOpenSearch);

            // When the screen gets covered and revealed again
            harness.cover();
            harness.uncover();

            // Then the focus-driven call runs once for the regained focus, which is what it already does today
            expect(openSearchCalls()).toBe(1);
        });

        it('refreshes the bank account data for a reconnect that happened while covered (audit 2.4)', () => {
            // Given a mounted Search page setup that is online
            harness.renderSubject(<SearchPageSetupProbe />);

            // When the connection drops and comes back while the screen is covered
            harness.cover();
            act(() => {
                mockIsOfflineValue = true;
            });
            harness.settle();
            act(() => {
                mockIsOfflineValue = false;
            });
            harness.settle();
            const openSearchCalls = trackCalls(mockedOpenSearch);
            harness.uncover();

            // Then the reveal still refreshes the data the reconnect invalidated
            expect(openSearchCalls()).toBeGreaterThan(0);
        });
    });

    describe('useMobileSelectionMode', () => {
        it('does not turn the selection mode off again on a reveal (audit 3.1)', () => {
            // Given a screen that mounted while the mobile selection mode was already on
            mockOnyxValues.set(ONYXKEYS.RAM_ONLY_MOBILE_SELECTION_MODE, true);
            harness.renderSubject(<MobileSelectionModeProbe onTurnOff={jest.fn()} />);
            const turnOffCalls = trackCalls(mockedTurnOffMobileSelectionMode);

            // When the screen gets covered and revealed again
            harness.cover();
            harness.uncover();

            // Then the mode the user is in survives, because nothing turned it off a second time
            expect(turnOffCalls()).toBe(0);
        });

        it('does not run the turn-off callback without a real mode change (audit 3.2)', () => {
            // Given a screen mounted with the mobile selection mode on
            mockOnyxValues.set(ONYXKEYS.RAM_ONLY_MOBILE_SELECTION_MODE, true);
            const onTurnOff = jest.fn();
            harness.renderSubject(<MobileSelectionModeProbe onTurnOff={onTurnOff} />);
            const turnOffCallbackCalls = trackCalls(onTurnOff);

            // When the screen gets covered and revealed again with the mode untouched
            harness.cover();
            harness.uncover();

            // Then the callback that clears the selection stays unused
            expect(turnOffCallbackCalls()).toBe(0);
        });
    });

    describe('useSeedMyExpensesSearch', () => {
        it('seeds the saved search only once across a cover cycle (audit 9, positive control)', () => {
            // Given a user that qualifies for the seeded saved search
            mockOnyxValues.set(ONYXKEYS.SESSION, {accountID: 1, email: 'user@example.com'});
            mockOnyxValues.set(ONYXKEYS.COLLECTION.POLICY, {});
            harness.renderSubject(<SeedMyExpensesSearchProbe />);
            const seedCalls = trackCalls(mockedSeedMyExpensesSearch);

            // When the screen gets covered and revealed again
            harness.cover();
            harness.uncover();

            // Then the ref guard holds, which is the pattern an Activity screen needs
            expect(seedCalls()).toBe(0);
        });
    });

    describe('useScrollEventEmitter', () => {
        it('still reports the end of a scroll that started before the cover (audit 5.3)', () => {
            // Given a scroll that started while the screen was visible
            let triggerScrollEvent = () => {};
            const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
            harness.renderSubject(<ScrollEventEmitterProbe onReady={(trigger) => (triggerScrollEvent = trigger)} />);
            act(() => {
                triggerScrollEvent();
            });
            emitSpy.mockClear();

            // When the screen gets covered mid-scroll and revealed again
            harness.cover();
            harness.uncover();

            // Then the scrolling-ended event still reaches the listeners that hide the educational tooltips
            expect(emitSpy).toHaveBeenCalledWith(CONST.EVENTS.SCROLLING, false);
            emitSpy.mockRestore();
        });
    });

    describe('useEndSubmitNavigationSpans', () => {
        it('keeps the focus and layout gate closed until both signals arrive (audit 8.1)', () => {
            // Given a pending follow-up action that must wait for the layout signal
            mockedGetPendingSubmitFollowUpAction.mockReturnValue({followUpAction: CONST.TELEMETRY.SUBMIT_FOLLOW_UP_ACTION.DISMISS_MODAL_AND_OPEN_REPORT});
            let endSubmitNavigationSpans: (wasListEmpty: boolean, source: 'focus' | 'layout') => void = () => {};
            harness.renderSubject(<EndSubmitNavigationSpansProbe onReady={(end) => (endSubmitNavigationSpans = end)} />);

            // When only the focus signal fires, both before and after a cover cycle
            act(() => {
                endSubmitNavigationSpans(false, 'focus');
            });
            harness.cover();
            harness.uncover();
            const spanCalls = trackCalls(mockedEndSubmitFollowUpActionSpan);
            act(() => {
                endSubmitNavigationSpans(false, 'focus');
            });

            // Then the span stays open, because the layout signal never arrived
            expect(spanCalls()).toBe(0);
        });
    });

    describe('useSaveSortedReportIDs', () => {
        it('keeps publishing the sorted report IDs while the screen is covered (audit 8.3)', () => {
            // Given a covered screen whose sorted items change underneath it
            harness.renderSubject(<SaveSortedReportIDsProbe />);
            harness.cover();
            mockSetSortedReportIDs.mockClear();
            sortedItemsStore.setValue([{reportID: '2'}]);
            harness.settle();

            // When the covering screen reads the IDs while it is on top
            // Then the context already carries the new ones, which is what the report screen's navigation arrows need
            expect(mockSetSortedReportIDs).toHaveBeenCalledWith(['2']);
        });
    });

    describe('useAndroidBackButtonHandler', () => {
        it('re-arms the back button guard it detaches while covered (audit 5.4)', () => {
            // Given a screen that handles the hardware back button
            let liveSubscriptions = 0;
            const addEventListenerSpy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation(() => {
                liveSubscriptions += 1;
                return {
                    remove: () => {
                        liveSubscriptions -= 1;
                    },
                };
            });
            harness.renderSubject(<AndroidBackButtonHandlerProbe onBackButtonPress={jest.fn(() => true)} />);
            const subscriptionsWhileVisible = liveSubscriptions;

            // When the screen gets covered
            harness.cover();

            // Then the guard steps aside for the screen on top
            expect(liveSubscriptions).toBeLessThan(subscriptionsWhileVisible);

            // And when the screen is revealed again
            harness.uncover();

            // Then it is armed again, without leaving a duplicate behind
            expect(liveSubscriptions).toBe(subscriptionsWhileVisible);
            addEventListenerSpy.mockRestore();
        });

        it('does not stack up back button guards across repeated cycles (audit 5.4)', () => {
            // Given a screen that handles the hardware back button
            let liveSubscriptions = 0;
            const addEventListenerSpy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation(() => {
                liveSubscriptions += 1;
                return {
                    remove: () => {
                        liveSubscriptions -= 1;
                    },
                };
            });
            harness.renderSubject(<AndroidBackButtonHandlerProbe onBackButtonPress={jest.fn(() => true)} />);
            const subscriptionsWhileVisible = liveSubscriptions;

            // When the screen is covered and revealed three times
            harness.measureCycles(3, addEventListenerSpy);

            // Then the count is where it started, so one back press still runs the handler once and not once per
            // modal the user happened to open earlier
            expect(liveSubscriptions).toBe(subscriptionsWhileVisible);
            addEventListenerSpy.mockRestore();
        });
    });

    describe('usePrevious', () => {
        it('catches up with the value a covered screen received (audit 0)', () => {
            // Given a subject whose value changes twice while the screen is covered
            harness.renderSubject(<PreviousValueProbe />);
            harness.cover();
            previousValueStore.setValue(2);
            harness.settle();
            previousValueStore.setValue(3);
            harness.settle();

            // When the screen is revealed again
            harness.uncover();
            renderedPreviousValues.length = 0;
            previousValueStore.setValue(4);
            harness.settle();

            // Then the next render sees the value from the render right before it, so a "what changed" comparison
            // still holds after the cover cycle
            expect(renderedPreviousValues.at(-1)).toBe(3);
        });
    });
});
