import {act, screen} from '@testing-library/react-native';

import MoneyReportHeader from '@components/MoneyReportHeader';
import MoneyRequestReportTransactionList from '@components/MoneyRequestReportView/MoneyRequestReportTransactionList';
import MoneyRequestReportTransactionsNavigation from '@components/MoneyRequestReportView/MoneyRequestReportTransactionsNavigation';
import {useSearchSelectionActions, useSearchSelectionContext} from '@components/Search/SearchContext';
import {SearchSelectionProvider} from '@components/Search/SearchSelectionProvider';
import type {SearchSelectionActionsValue} from '@components/Search/types';
import Text from '@components/Text';

import {turnOnMobileSelectionMode} from '@libs/actions/MobileSelectionMode';
import {setActiveTransactionIDs} from '@libs/actions/TransactionThreadNavigation';
import navigationRef from '@libs/Navigation/navigationRef';

import CONST from '@src/CONST';
import NAVIGATORS from '@src/NAVIGATORS';
import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';

import type * as ReactNavigation from '@react-navigation/native';
import type {PropsWithChildren} from 'react';

import React, {useEffect} from 'react';
import {View} from 'react-native';
import Onyx from 'react-native-onyx';

import getOnyxValue from '../utils/getOnyxValue';
import * as ReportTestUtils from '../utils/ReportTestUtils';
import renderCoverableScreen from '../utils/ScreenCoverHarness';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

jest.mock('@react-navigation/native', () => {
    const actual = jest.requireActual<typeof ReactNavigation>('@react-navigation/native');
    // Stable singletons, so focus effects keyed on the navigation/route identity do not churn on every render.
    const navigation = {addListener: jest.fn(() => jest.fn()), removeListener: jest.fn(), isFocused: () => true, navigate: jest.fn(), getState: jest.fn()};
    const route = {key: 'report-route-key', name: 'Report', params: {reportID: '1'}};
    return {
        ...actual,
        useNavigation: () => navigation,
        useIsFocused: () => true,
        useRoute: () => route,
        // Equivalent of the real hook on a focused screen: run the callback as an effect, cleanup on effect unmount.
        useFocusEffect: (effect: () => undefined | void | (() => void)) => {
            const ReactActual = jest.requireActual<typeof React>('react');
            ReactActual.useEffect(() => effect(), [effect]);
        },
    };
});

jest.mock('@hooks/useLocalize', () =>
    jest.fn(() => ({
        translate: jest.fn((key: string) => key),
        numberFormat: jest.fn((num: number) => num.toString()),
        localeCompare: jest.fn((a: string, b: string) => a.localeCompare(b)),
    })),
);

jest.mock('@components/PrevNextButtons', () => {
    const RN = jest.requireActual<Record<string, React.ComponentType<{testID?: string}>>>('react-native');
    return () => <RN.Text testID="prev-next-buttons" />;
});

// Header chrome around the effect under test; the content component owning the cleanup stays real.
jest.mock(
    '@components/MoneyReportHeaderModals',
    () =>
        ({children}: PropsWithChildren) =>
            children,
);
jest.mock('@components/MoneyReportHeaderActions', () => jest.fn(() => null));
jest.mock('@components/MoneyReportHeaderMoreContent', () => jest.fn(() => null));
jest.mock('@components/HeaderLoadingBar', () => jest.fn(() => null));
jest.mock('@components/HeaderWithBackButton', () => {
    const RN = jest.requireActual<Record<string, React.ComponentType<{testID?: string}>>>('react-native');
    return () => <RN.View testID="header-with-back-button" />;
});
jest.mock('@components/MoneyReportHeaderActions/ExportDownloadStatusProvider', () => ({
    ExportDownloadStatusProvider: ({children}: PropsWithChildren) => children,
    useExportDownloadStatus: () => ({trackExport: () => {}}),
}));
jest.mock('@components/PaymentAnimationsContext', () => ({
    PaymentAnimationsProvider: ({children}: PropsWithChildren) => children,
    usePaymentAnimationsContext: () => ({}),
}));
jest.mock('@hooks/useReportPrimaryAction', () => jest.fn(() => undefined));

// Two visible transactions keep the selection-mode branch from turning selection off during render.
jest.mock('@hooks/useTransactionsAndViolationsForReport', () =>
    jest.fn(() => ({
        transactions: {
            t1: {transactionID: 't1', reportID: '1', amount: 100, currency: 'USD', created: '2024-01-01'},
            t2: {transactionID: 't2', reportID: '1', amount: 200, currency: 'USD', created: '2024-01-02'},
        },
        violations: {},
        isLoaded: true,
    })),
);

// List chrome around the effect under test; the list component owning the effect stays real.
jest.mock('@components/MoneyRequestReportView/MoneyRequestReportUnifiedList', () => jest.fn(() => null));
jest.mock('@components/MoneyRequestReportView/MoneyRequestReportTransactionLongPressModal', () => jest.fn(() => null));
jest.mock('@hooks/useCopySelectionHelper', () => jest.fn());
jest.mock('@hooks/useNavigateToTransactionThread', () => jest.fn(() => jest.fn()));
jest.mock('@hooks/useLazyAsset', () => ({
    useMemoizedLazyAsset: jest.fn(() => ({asset: {}})),
    useMemoizedLazyIllustrations: jest.fn(() => ({})),
    useMemoizedLazyExpensifyIcons: jest.fn(() => ({})),
}));

const REPORT_ID = '1';
const TRANSACTION_IDS = ['t1', 't2'];
const SKELETON_REASON_ATTRIBUTES = {context: 'ReportScreenActivityMoneyRequestTest'};

const expenseReport = ReportTestUtils.createMockReport({reportID: REPORT_ID, type: CONST.REPORT.TYPE.EXPENSE});

type RootState = ReturnType<typeof navigationRef.getRootState>;

// The root state seen while this screen is covered: the covering route is focused, not the covered one.
const coveredByNonSearchReportRootState: RootState = {
    key: 'root-state',
    index: 0,
    routeNames: [SCREENS.NOT_FOUND],
    routes: [{key: 'covering-route', name: SCREENS.NOT_FOUND}],
    type: 'stack',
    stale: false,
};

// The root state while a transaction thread RHP covers the expense report, the shape the audit describes.
const coveredByRHPRootState: RootState = {
    key: 'root-state',
    index: 0,
    routeNames: [NAVIGATORS.RIGHT_MODAL_NAVIGATOR],
    routes: [{key: 'rhp-route', name: NAVIGATORS.RIGHT_MODAL_NAVIGATOR, params: {state: undefined}}],
    type: 'stack',
    stale: false,
};

let selectionActions: SearchSelectionActionsValue | undefined;

/** Publishes the selection actions and mirrors the selected IDs so the tests can seed and observe the selection. */
function SelectionProbe() {
    const actions = useSearchSelectionActions();
    const {selectedTransactionIDs} = useSearchSelectionContext();

    useEffect(() => {
        selectionActions = actions;
    });

    return <Text testID="selected-transaction-ids">{selectedTransactionIDs.join(',')}</Text>;
}

function TransactionsNavigationScreen() {
    return <MoneyRequestReportTransactionsNavigation currentTransactionID="t1" />;
}

function ExpenseReportHeaderScreen() {
    return (
        <MoneyReportHeader
            reportID={REPORT_ID}
            onBackButtonPress={() => {}}
        />
    );
}

function TransactionListScreen() {
    return (
        <SearchSelectionProvider>
            <SelectionProbe />
            <MoneyRequestReportTransactionList
                report={expenseReport}
                transactions={[]}
                newTransactions={[]}
                reportActions={[]}
                hasComments={false}
                visibleReportActions={[]}
                renderReportAction={() => <View />}
                reportActionsExtraData={null}
                linkedReportActionID={undefined}
                listRef={null}
                accessibilityLabel="transaction-list"
                onListLayout={() => {}}
                onScroll={() => {}}
                onScrollBeginDrag={() => {}}
                onContentSizeChange={() => {}}
                onViewableItemsChanged={() => {}}
                onEndReached={() => {}}
                onStartReached={() => {}}
                contentContainerStyle={null}
                isLoadingInitialActions={false}
                skeletonReasonAttributes={SKELETON_REASON_ATTRIBUTES}
            />
        </SearchSelectionProvider>
    );
}

beforeAll(() => {
    Onyx.init({keys: ONYXKEYS});
});

afterEach(async () => {
    await act(async () => {
        await Onyx.clear();
    });
    jest.restoreAllMocks();
    selectionActions = undefined;
});

/**
 * The prev/next arrows in a transaction thread read a global store seeded by the expense report that opened the
 * thread. The store's only cleanup wipes it when the thread leaves for another screen, and nothing re-seeds it on the
 * way back, so a cover must leave it alone. The assertions describe behavior that ships today.
 */
describe('MoneyRequestReportTransactionsNavigation across a cover/reveal cycle', () => {
    it('keeps the active transaction IDs when the transaction thread is covered', async () => {
        // The covering screen is the focused route at hide, so the SEARCH_REPORT guard in the cleanup misses.
        jest.spyOn(navigationRef, 'getRootState').mockReturnValue(coveredByNonSearchReportRootState);
        await act(async () => {
            await setActiveTransactionIDs(TRANSACTION_IDS);
        });

        const coverable = renderCoverableScreen(<TransactionsNavigationScreen />);
        await waitForBatchedUpdatesWithAct();
        expect(screen.getByTestId('prev-next-buttons')).toBeTruthy();

        await coverable.hide();
        await coverable.reveal();
        await waitForBatchedUpdatesWithAct();

        // A wipe here is permanent: no reveal path re-seeds the store, so the arrows would never come back.
        expect(await getOnyxValue(ONYXKEYS.TRANSACTION_THREAD_NAVIGATION_TRANSACTION_IDS)).toEqual(TRANSACTION_IDS);
        expect(screen.getByTestId('prev-next-buttons')).toBeTruthy();
    });
});

/**
 * The expense report header's only mount effect is a cleanup that turns off mobile selection mode, an app-global Onyx
 * flag. Covering the report is not leaving it, so the flag must survive a cover/reveal. The assertion describes
 * behavior that ships today.
 */
describe('MoneyReportHeader across a cover/reveal cycle', () => {
    beforeEach(async () => {
        await act(async () => {
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID}`, expenseReport);
        });
    });

    it('does not turn off mobile selection mode when the expense report is covered', async () => {
        const coverable = renderCoverableScreen(<ExpenseReportHeaderScreen />);
        await waitForBatchedUpdatesWithAct();

        act(() => turnOnMobileSelectionMode());
        await waitForBatchedUpdatesWithAct();
        expect(await getOnyxValue(ONYXKEYS.RAM_ONLY_MOBILE_SELECTION_MODE)).toBe(true);

        await coverable.hide();
        await coverable.reveal();
        await waitForBatchedUpdatesWithAct();

        // The flag is global, so flipping it here kills selection mode for whatever screen is on top.
        expect(await getOnyxValue(ONYXKEYS.RAM_ONLY_MOBILE_SELECTION_MODE)).toBe(true);
    });
});

/**
 * The transaction list clears the shared multi-select whenever its reportID effect runs. The selection lives above
 * the screen, so covering the list under an RHP and coming back must not re-run that clear: the reportID did not
 * change and the user still expects their selection. The assertion describes behavior that ships today.
 */
describe('MoneyRequestReportTransactionList across a cover/reveal cycle', () => {
    it('keeps the multi-select selection when the expense report is covered and revealed', async () => {
        // An RHP on top satisfies the focus-effect cleanup guard, isolating the reportID effect's reveal re-run.
        jest.spyOn(navigationRef, 'getRootState').mockReturnValue(coveredByRHPRootState);

        const coverable = renderCoverableScreen(<TransactionListScreen />);
        await waitForBatchedUpdatesWithAct();

        act(() => selectionActions?.setSelectedTransactions(TRANSACTION_IDS));
        await waitForBatchedUpdatesWithAct();
        expect(screen.getByTestId('selected-transaction-ids').props.children).toBe('t1,t2');

        await coverable.hide();
        await waitForBatchedUpdatesWithAct();

        // The RHP guard protects the hide in both behaviors, so any wipe can only come from the reveal.
        expect(screen.getByTestId('selected-transaction-ids').props.children).toBe('t1,t2');

        await coverable.reveal();
        await waitForBatchedUpdatesWithAct();

        // The reveal re-runs the clear with reportID unchanged, dropping a selection the user never left.
        expect(screen.getByTestId('selected-transaction-ids').props.children).toBe('t1,t2');
    });
});
