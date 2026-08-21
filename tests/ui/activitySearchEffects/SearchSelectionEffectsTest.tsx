import SearchWriteActionsProvider from '@components/Search/SearchWriteActionsProvider';
import type {SearchData, SelectedTransactions} from '@components/Search/types';

import useResponsiveLayout from '@hooks/useResponsiveLayout';

import {turnOffMobileSelectionMode, turnOnMobileSelectionMode} from '@libs/actions/MobileSelectionMode';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import {View} from 'react-native';

import createCoverCycleHarness, {NON_TOP_SCREEN_BEHAVIOR} from '../../utils/NonTopScreenBehaviorCycleTestUtils';

/**
 * Temporary suite for the Activity rollout audit of the Search screen, covering the selection write path that
 * `<Search>` mounts inside the screen. See the sibling `SearchHookEffectsTest` for how the behavior under test is
 * selected.
 *
 * The provider is the one place on the Search screen where the mobile selection mode is switched from outside
 * `useMobileSelectionMode`, so its mount work decides what a reveal does to a selection the user made.
 */

const mockApplySelection = jest.fn();
const mockSetSelectedReports = jest.fn();

const selectionState: {
    selectedTransactions: SelectedTransactions;
    areAllMatchingItemsSelected: boolean;
    shouldTurnOffSelectionMode: boolean;
} = {
    selectedTransactions: {},
    areAllMatchingItemsSelected: false,
    shouldTurnOffSelectionMode: false,
};

jest.mock('@libs/Navigation/TransitionTracker', () => ({
    runAfterTransitions: jest.fn(),
}));

jest.mock('@hooks/useOnyx', () => ({
    __esModule: true,
    default: () => [undefined, {status: 'loaded'}],
}));

jest.mock('@hooks/useResponsiveLayout', () => jest.fn());

jest.mock('@hooks/useCurrentUserPersonalDetails', () => ({
    __esModule: true,
    default: () => ({accountID: 1, email: 'reviewer@expensify.com', login: 'reviewer@expensify.com'}),
}));

jest.mock('@hooks/useEnvironment', () => ({
    __esModule: true,
    default: () => ({isProduction: false}),
}));

jest.mock('@hooks/useSelfDMReport', () => ({
    __esModule: true,
    default: () => undefined,
}));

jest.mock('@libs/actions/MobileSelectionMode', () => ({
    turnOffMobileSelectionMode: jest.fn(),
    turnOnMobileSelectionMode: jest.fn(),
}));

jest.mock('@components/Search/SearchContext', () => ({
    useSearchSelectionContext: () => selectionState,
    useSearchSelectionActions: () => ({applySelection: mockApplySelection, setSelectedReports: mockSetSelectedReports}),
}));

const harness = createCoverCycleHarness();
const mockedTurnOffMobileSelectionMode = jest.mocked(turnOffMobileSelectionMode);
const mockedTurnOnMobileSelectionMode = jest.mocked(turnOnMobileSelectionMode);
const mockedUseResponsiveLayout = jest.mocked(useResponsiveLayout);

const EMPTY_FILTERED_DATA: SearchData = [];

/** Snapshots a mock's call count so an assertion can read the calls the cover and uncover cycle added. */
function trackCalls(mock: {mock: {calls: unknown[]}}) {
    const callsBefore = mock.mock.calls.length;
    return () => mock.mock.calls.length - callsBefore;
}

function renderProvider({isMobileSelectionModeEnabled}: {isMobileSelectionModeEnabled: boolean}) {
    return harness.renderSubject(
        <SearchWriteActionsProvider
            filteredData={EMPTY_FILTERED_DATA}
            totalSelectableItemsCount={0}
            searchResults={undefined}
            transactions={undefined}
            isMobileSelectionModeEnabled={isMobileSelectionModeEnabled}
            type={CONST.SEARCH.DATA_TYPES.EXPENSE}
            areItemsGrouped={false}
            isExpenseReportType={false}
            isSearchResultsEmpty={false}
        >
            <View testID="probe" />
        </SearchWriteActionsProvider>,
    );
}

/** Puts one selected expense in the context, which is what the two selection mode effects branch on. */
function selectOneTransaction() {
    selectionState.selectedTransactions = {
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
}

function setNarrowLayout(isSmallScreenWidth: boolean) {
    mockedUseResponsiveLayout.mockReturnValue({
        ...CONST.NAVIGATION_TESTS.DEFAULT_USE_RESPONSIVE_LAYOUT_VALUE,
        shouldUseNarrowLayout: isSmallScreenWidth,
        isSmallScreenWidth,
    });
}

beforeEach(() => {
    jest.clearAllMocks();
    harness.install();
    selectionState.selectedTransactions = {};
    selectionState.areAllMatchingItemsSelected = false;
    selectionState.shouldTurnOffSelectionMode = false;
    setNarrowLayout(true);
});

afterEach(() => {
    jest.useRealTimers();
});

describe(`SearchWriteActionsProvider under the ${NON_TOP_SCREEN_BEHAVIOR} behavior`, () => {
    it('does not turn the mobile selection mode off again on a reveal (audit 10.1)', () => {
        // Given a provider that already turned the mode off for an empty selection on mount
        selectionState.shouldTurnOffSelectionMode = true;
        renderProvider({isMobileSelectionModeEnabled: true});
        const turnOffCalls = trackCalls(mockedTurnOffMobileSelectionMode);

        // When the screen gets covered and revealed again
        harness.cover();
        harness.uncover();

        // Then nothing switches the mode, because neither the selection nor the request to leave the mode changed
        expect(turnOffCalls()).toBe(0);
    });

    it('does not turn the mobile selection mode on again on a reveal (audit 10.2)', () => {
        // Given a narrow screen with a selection, which is what arms the screen size effect
        selectOneTransaction();
        renderProvider({isMobileSelectionModeEnabled: false});
        const turnOnCalls = trackCalls(mockedTurnOnMobileSelectionMode);

        // When the screen gets covered and revealed again
        harness.cover();
        harness.uncover();

        // Then the mode is left alone: the effect belongs to a screen size change, and the screen size did not change
        expect(turnOnCalls()).toBe(0);
    });

    it('does not turn the mobile selection mode off again on a reveal of a wide screen (audit 10.2)', () => {
        // Given a wide screen with nothing selected, the other branch of the same screen size effect
        setNarrowLayout(false);
        renderProvider({isMobileSelectionModeEnabled: true});
        const turnOffCalls = trackCalls(mockedTurnOffMobileSelectionMode);

        // When the screen gets covered and revealed again
        harness.cover();
        harness.uncover();

        // Then the mode is left alone for the same reason
        expect(turnOffCalls()).toBe(0);
    });

    it('does not re-derive the selected reports on a reveal (audit 10.3)', () => {
        // Given a provider that derived the selected reports from the rows it had on mount
        selectOneTransaction();
        renderProvider({isMobileSelectionModeEnabled: true});
        const setSelectedReportsCalls = trackCalls(mockSetSelectedReports);

        // When the screen gets covered and revealed again
        harness.cover();
        harness.uncover();

        // Then the derivation does not run again, because a reveal re-runs it against the rows the covered screen
        // last rendered rather than the current ones
        expect(setSelectedReportsCalls()).toBe(0);
    });

    it('reconciles the selection once per reveal, as it already does today (audit 10.4)', () => {
        // Given a selection whose rows are no longer in the data, so every reconcile run commits
        selectOneTransaction();
        renderProvider({isMobileSelectionModeEnabled: true});
        const applySelectionCalls = trackCalls(mockApplySelection);

        // When the screen gets covered and revealed again
        harness.cover();
        harness.uncover();

        // Then the reconcile runs once for the regained focus, which is focus-driven and not something Activity adds
        expect(applySelectionCalls()).toBe(1);
    });
});
