import {act} from '@testing-library/react-native';

import {getSpan, startSpan} from '@libs/telemetry/activeSpans';

import DeleteTransactionNavigateBackHandler from '@pages/inbox/DeleteTransactionNavigateBackHandler';
import UserTypingEventListener from '@pages/inbox/report/UserTypingEventListener';
import ReportLifecycleHandler from '@pages/inbox/ReportLifecycleHandler';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';

import type * as ReactNavigation from '@react-navigation/native';
import type {AppStateStatus} from 'react-native';

import React from 'react';
import {AppState} from 'react-native';
import Onyx from 'react-native-onyx';

import {createMockReport} from '../utils/ReportTestUtils';
import renderCoverableScreen from '../utils/ScreenCoverHarness';
import createTransitionTrackerHarness from '../utils/TransitionTrackerTestUtils';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

const REPORT_ID = '1';
const THREAD_ID = '2';

let mockIsFocusedValue = true;
let mockCurrentReportID: string | undefined = REPORT_ID;
let mockTopmostReportID: string | undefined = REPORT_ID;

const mockRoute = {key: 'report-route-key', name: SCREENS.REPORT, params: {reportID: REPORT_ID}};

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof ReactNavigation>('@react-navigation/native'),
    useRoute: () => mockRoute,
    useNavigation: () => ({setParams: jest.fn(), addListener: jest.fn(() => () => {})}),
    useIsFocused: () => mockIsFocusedValue,
}));

jest.mock('@libs/Navigation/TransitionTracker', () => ({
    __esModule: true,
    default: {runAfterTransitions: jest.fn()},
}));

jest.mock('@libs/Navigation/Navigation', () => ({
    __esModule: true,
    default: {getTopmostReportId: () => mockTopmostReportID},
}));

jest.mock('@userActions/Report', () => ({
    clearDeleteTransactionNavigateBackUrl: jest.fn(),
    subscribeToReportTypingEvents: jest.fn(),
    unsubscribeFromReportChannel: jest.fn(),
}));

jest.mock('@libs/Notification/clearReportNotifications', () => ({__esModule: true, default: jest.fn()}));
jest.mock('@libs/actions/EmojiPickerAction', () => ({hideEmojiPicker: jest.fn()}));
jest.mock('@hooks/useBankAccountUnlockEffect', () => ({__esModule: true, default: () => {}}));
jest.mock('@hooks/useCurrentUserPersonalDetails', () => () => ({accountID: 1, email: 'tester@expensify.com'}));
jest.mock('@hooks/useCurrentReportID', () => ({useCurrentReportIDState: () => ({currentReportID: mockCurrentReportID})}));

const {clearDeleteTransactionNavigateBackUrl, subscribeToReportTypingEvents, unsubscribeFromReportChannel} = jest.requireMock<{
    clearDeleteTransactionNavigateBackUrl: jest.Mock;
    subscribeToReportTypingEvents: jest.Mock;
    unsubscribeFromReportChannel: jest.Mock;
}>('@userActions/Report');

const {default: clearReportNotifications} = jest.requireMock<{default: jest.Mock}>('@libs/Notification/clearReportNotifications');

const transitionTracker = createTransitionTrackerHarness();

// The real useAppFocusEvent is left in place so the test exercises its retention across a cover; only the native event source is stubbed.
let appStateListeners: Array<(state: AppStateStatus) => void> = [];

function installAppStateStub() {
    appStateListeners = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((type, listener) => {
        appStateListeners.push(listener);
        return {
            remove: () => {
                appStateListeners = appStateListeners.filter((registered) => registered !== listener);
            },
        };
    });
}

function fireAppFocus() {
    for (const listener of appStateListeners) {
        listener('active');
    }
}

/**
 * Listeners and telemetry the chat window sets up have to survive the window being covered by a thread. Every
 * assertion describes behavior that ships today, so the suite passes against the current `freeze` behavior.
 */
describe('Report screen listeners across a cover/reveal cycle', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        transitionTracker.install();
        installAppStateStub();
        mockIsFocusedValue = true;
        mockCurrentReportID = REPORT_ID;
        mockTopmostReportID = REPORT_ID;
        await Onyx.clear();
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID}`, {reportID: REPORT_ID, type: 'chat'});
    });

    describe('UserTypingEventListener', () => {
        it('stays subscribed to the report typing channel after the chat is covered and revealed', async () => {
            const report = createMockReport({reportID: REPORT_ID});
            const screen = renderCoverableScreen(<UserTypingEventListener report={report} />);
            await waitForBatchedUpdatesWithAct();
            transitionTracker.firePendingCallbacks();
            await waitForBatchedUpdatesWithAct();

            expect(subscribeToReportTypingEvents).toHaveBeenCalledTimes(1);

            await screen.hide();
            await screen.reveal();
            transitionTracker.firePendingCallbacks();
            await waitForBatchedUpdatesWithAct();

            // Either the channel was never dropped, or it was dropped and subscribed again. A teardown without a
            // matching re-subscription silently stops the typing indicator for a chat the user is looking at.
            expect(subscribeToReportTypingEvents.mock.calls.length).toBeGreaterThanOrEqual(unsubscribeFromReportChannel.mock.calls.length + 1);
        });
    });

    describe('ReportLifecycleHandler', () => {
        it('leaves an in-flight send-message span alone when the chat is covered', async () => {
            const screen = renderCoverableScreen(<ReportLifecycleHandler reportID={REPORT_ID} />);
            await waitForBatchedUpdatesWithAct();

            const sendMessageSpanID = `${CONST.TELEMETRY.SPAN_SEND_MESSAGE}_${REPORT_ID}_abc`;
            startSpan(sendMessageSpanID, {name: sendMessageSpanID});
            expect(getSpan(sendMessageSpanID)).toBeDefined();

            await screen.hide();
            await waitForBatchedUpdatesWithAct();

            expect(getSpan(sendMessageSpanID)).toBeDefined();
        });

        it('leaves the notifications of the chat alone when the app is focused while a thread covers it', async () => {
            const screen = renderCoverableScreen(<ReportLifecycleHandler reportID={REPORT_ID} />);
            await waitForBatchedUpdatesWithAct();

            // Opening a thread makes it the top-most report and covers the chat underneath it.
            mockCurrentReportID = THREAD_ID;
            mockTopmostReportID = THREAD_ID;
            await screen.hide();

            clearReportNotifications.mockClear();
            act(() => {
                fireAppFocus();
            });

            expect(clearReportNotifications).not.toHaveBeenCalled();
        });

        it('clears the notifications of the chat when the app is focused after the thread is popped', async () => {
            const screen = renderCoverableScreen(<ReportLifecycleHandler reportID={REPORT_ID} />);
            await waitForBatchedUpdatesWithAct();

            mockCurrentReportID = THREAD_ID;
            mockTopmostReportID = THREAD_ID;
            await screen.hide();

            mockCurrentReportID = REPORT_ID;
            mockTopmostReportID = REPORT_ID;
            await screen.reveal();

            clearReportNotifications.mockClear();
            act(() => {
                fireAppFocus();
            });

            expect(clearReportNotifications).toHaveBeenCalledWith(REPORT_ID);
        });
    });

    describe('DeleteTransactionNavigateBackHandler', () => {
        it('clears the navigate-back URL once the chat stops being focused', async () => {
            await Onyx.merge(ONYXKEYS.NVP_DELETE_TRANSACTION_NAVIGATE_BACK_URL, 'r/2/details');

            const screen = renderCoverableScreen(<DeleteTransactionNavigateBackHandler />);
            await waitForBatchedUpdatesWithAct();
            expect(clearDeleteTransactionNavigateBackUrl).not.toHaveBeenCalled();

            // Navigating into a thread blurs and covers the chat in the same commit.
            mockIsFocusedValue = false;
            await screen.hide();
            await waitForBatchedUpdatesWithAct();
            transitionTracker.firePendingCallbacks();
            // The clear itself is deferred one more frame so the screen is gone before the URL disappears.
            await act(async () => {
                await new Promise(requestAnimationFrame);
            });

            expect(clearDeleteTransactionNavigateBackUrl).toHaveBeenCalledTimes(1);
        });
    });
});
