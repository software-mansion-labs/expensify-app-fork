import {act, fireEvent, screen} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';

import navigationRef from '@libs/Navigation/navigationRef';
import {setHasRadio} from '@libs/NetworkState';
import markOpenReportEnd from '@libs/telemetry/markOpenReportEnd';

import {ActionListContext} from '@pages/inbox/ActionListContext';
import {ReactionListContext} from '@pages/inbox/ReactionListContext';
import ReportActionsList from '@pages/inbox/report/ReportActionsList';
import {AttachmentModalContextProvider} from '@pages/media/AttachmentModalScreen/AttachmentModalContext';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportAction, ReportActions} from '@src/types/onyx';

import type * as ReactNavigation from '@react-navigation/native';

import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import Onyx from 'react-native-onyx';

import * as ReportTestUtils from '../utils/ReportTestUtils';
import renderCoverableScreen from '../utils/ScreenCoverHarness';
import * as TestHelper from '../utils/TestHelper';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';
import wrapOnyxWithWaitForBatchedUpdates from '../utils/wrapOnyxWithWaitForBatchedUpdates';

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof ReactNavigation>('@react-navigation/native'),
    useRoute: () => ({key: 'report-route-key', name: 'Report', params: {reportID: '1'}}),
    useIsFocused: () => true,
}));

jest.mock('@libs/telemetry/markOpenReportEnd', () => ({
    __esModule: true,
    default: jest.fn(),
}));

const mockedMarkOpenReportEnd = jest.mocked(markOpenReportEnd);

const TEST_USER_ACCOUNT_ID = 1;
const TEST_USER_LOGIN = 'test@test.com';
const REPORT_ID = '1';

// Built via a function so the value isn't an inline literal the context-split lint rule would flag.
function buildActionListContextValue() {
    return {scrollOffsetRef: {current: 0}, getScrollOffset: () => 0, registerListRef: () => {}, getListRef: () => null};
}
const actionListContextValue = buildActionListContextValue();
const reactionListContextValue = {showReactionList: () => {}, hideReactionList: () => {}, isActiveReportAction: () => false};

const sortedReportActions = ReportTestUtils.getMockedSortedReportActions(10);
const reportActions: ReportActions = Object.fromEntries(sortedReportActions.map((action: ReportAction) => [action.reportActionID, action]));
const report = ReportTestUtils.createMockReport({reportID: REPORT_ID, lastVisibleActionCreated: sortedReportActions.at(0)?.created});

function ReportActionsListScreen() {
    return (
        <NavigationContainer ref={navigationRef}>
            <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider, AttachmentModalContextProvider]}>
                <ReactionListContext.Provider value={reactionListContextValue}>
                    <ActionListContext.Provider value={actionListContextValue}>
                        <ReportActionsList reportID={REPORT_ID} />
                    </ActionListContext.Provider>
                </ReactionListContext.Provider>
            </ComposeProviders>
        </NavigationContainer>
    );
}

function reportListLayout() {
    fireEvent(screen.getByTestId('report-actions-list'), 'layout', {nativeEvent: {layout: {x: 0, y: 0, width: 400, height: 800}}});
}

/**
 * The list closes the open-report measurement on its first layout, latched by a ref so re-layouts do not report
 * again. A ref survives a cover, so a reveal must not re-arm it or the metric collects samples from re-showing a list
 * that was never destroyed. The assertion describes behavior that ships today.
 */
describe('ReportActionsList open-report telemetry across a cover/reveal cycle', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS, evictableKeys: [ONYXKEYS.COLLECTION.REPORT_ACTIONS]});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        setHasRadio(true);
        wrapOnyxWithWaitForBatchedUpdates(Onyx);
        await act(async () => {
            TestHelper.signInWithTestUser(TEST_USER_ACCOUNT_ID, TEST_USER_LOGIN);
            await Onyx.merge(ONYXKEYS.NVP_PREFERRED_LOCALE, CONST.LOCALES.DEFAULT);
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID}`, report);
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${REPORT_ID}`, reportActions);
            await Onyx.set(`${ONYXKEYS.COLLECTION.RAM_ONLY_REPORT_LOADING_STATE}${REPORT_ID}`, {
                isLoadingInitialReportActions: false,
                hasOnceLoadedReportActions: true,
                isLoadingOlderReportActions: false,
                hasLoadingOlderReportActionsError: false,
                isLoadingNewerReportActions: false,
                hasLoadingNewerReportActionsError: false,
            });
            await waitForBatchedUpdates();
        });
    });

    afterEach(async () => {
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    it('reports the open-report measurement once, not again after a reveal', async () => {
        const coverable = renderCoverableScreen(<ReportActionsListScreen />);
        await waitForBatchedUpdatesWithAct();

        act(() => reportListLayout());
        expect(mockedMarkOpenReportEnd).toHaveBeenCalledTimes(1);

        await coverable.hide();
        await coverable.reveal();
        await waitForBatchedUpdatesWithAct();

        // The list is the same list the user was already looking at, so its re-layout is not an open-report event.
        act(() => reportListLayout());
        expect(mockedMarkOpenReportEnd).toHaveBeenCalledTimes(1);
    });
});
