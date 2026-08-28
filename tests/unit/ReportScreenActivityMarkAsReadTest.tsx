import {act} from '@testing-library/react-native';

import useMarkAsRead from '@hooks/useMarkAsRead';

import type * as OnyxTypes from '@src/types/onyx';

import type * as ReactNavigation from '@react-navigation/native';

import React, {useEffect, useState} from 'react';

import {createMockReport, getFakeReportAction} from '../utils/ReportTestUtils';
import renderCoverableScreen from '../utils/ScreenCoverHarness';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

const REPORT_ID = '1';
const OLD_MESSAGE_TIME = '2024-01-01 10:00:00.000';
const LAST_READ_TIME = '2024-01-01 12:00:00.000';
const NEW_MESSAGE_TIME = '2024-01-01 13:00:00.000';
const OTHER_USER_ACCOUNT_ID = 2;

jest.mock('@libs/Navigation/Navigation', () => ({
    __esModule: true,
    default: {setParams: jest.fn()},
}));

jest.mock('@libs/Visibility', () => ({
    __esModule: true,
    default: {isVisible: () => true, hasFocus: () => true, onVisibilityChange: jest.fn(() => () => {})},
}));

jest.mock('@libs/actions/Report', () => ({
    readNewestAction: jest.fn(),
}));

jest.mock('@hooks/useCurrentUserPersonalDetails', () => () => ({accountID: 1, email: 'tester@expensify.com'}));
jest.mock('@hooks/useIsAnonymousUser', () => () => false);
jest.mock('@hooks/useIsReportActionsLoaded', () => () => true);
jest.mock('@hooks/useReportIsArchived', () => () => false);
jest.mock('@hooks/useAppFocusEvent', () => ({__esModule: true, default: () => {}}));

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof ReactNavigation>('@react-navigation/native'),
    useIsFocused: () => true,
    useRoute: () => ({params: {}}),
}));

const {readNewestAction} = jest.requireMock<{readNewestAction: jest.Mock}>('@libs/actions/Report');

// The user has read everything up to LAST_READ_TIME, so the chat mounts caught up.
const readReport = createMockReport({
    reportID: REPORT_ID,
    lastMessageText: 'hey',
    lastReadTime: LAST_READ_TIME,
    lastVisibleActionCreated: OLD_MESSAGE_TIME,
    lastActorAccountID: OTHER_USER_ACCOUNT_ID,
});

const oldAction = getFakeReportAction(OTHER_USER_ACCOUNT_ID, {created: OLD_MESSAGE_TIME});
const newAction = getFakeReportAction(OTHER_USER_ACCOUNT_ID + 1, {created: NEW_MESSAGE_TIME, actorAccountID: OTHER_USER_ACCOUNT_ID});

const publishedScrollAwayFromEnd: {current: (() => void) | undefined} = {current: undefined};
const publishedReceiveNewMessage: {current: (() => void) | undefined} = {current: undefined};

function MarkAsReadProbe() {
    const [report, setReport] = useState<OnyxTypes.Report>(readReport);
    const [sortedVisibleReportActions, setSortedVisibleReportActions] = useState<OnyxTypes.ReportAction[]>([oldAction]);
    const [isScrolledToEnd, setIsScrolledToEnd] = useState(true);

    useMarkAsRead({
        reportID: REPORT_ID,
        report,
        transactionThreadReport: undefined,
        sortedVisibleReportActions,
        isScrolledToEnd,
        hasNewerActions: false,
    });

    useEffect(() => {
        publishedScrollAwayFromEnd.current = () => setIsScrolledToEnd(false);
        publishedReceiveNewMessage.current = () => {
            setReport((previousReport) => ({...previousReport, lastVisibleActionCreated: NEW_MESSAGE_TIME}));
            setSortedVisibleReportActions([newAction, oldAction]);
        };
    });

    return null;
}

/**
 * `useMarkAsRead` guards its initial `readNewestAction` with `didMarkReportAsReadInitially`, a ref that is re-armed by
 * the `[reportID]` effect, which also rewrites the module-global `prevReportID` and the `userActiveSince` watermark.
 * A message that arrives while the chat is covered by a thread must keep its unread state on the way back when the
 * user is scrolled up reading history. The assertion describes behavior that ships today.
 */
describe('useMarkAsRead across a cover/reveal cycle', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        publishedScrollAwayFromEnd.current = undefined;
        publishedReceiveNewMessage.current = undefined;
    });

    it('does not mark a message that arrived while the chat was covered as read on reveal', async () => {
        const screen = renderCoverableScreen(<MarkAsReadProbe />);
        await waitForBatchedUpdatesWithAct();

        // The user scrolls up to read history, so nothing may auto-read the report from here on.
        act(() => publishedScrollAwayFromEnd.current?.());
        await waitForBatchedUpdatesWithAct();
        expect(readNewestAction).not.toHaveBeenCalled();

        // The chat is covered by a thread and someone else sends a message in the meantime.
        await screen.hide();
        act(() => publishedReceiveNewMessage.current?.());
        await waitForBatchedUpdatesWithAct();

        await screen.reveal();
        await waitForBatchedUpdatesWithAct();

        // The user is still scrolled up, so returning from the thread must not silently mark the chat as read.
        expect(readNewestAction).not.toHaveBeenCalled();
    });
});
