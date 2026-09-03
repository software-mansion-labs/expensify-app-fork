import {subscribeToReportReasoningEvents, unsubscribeFromReportReasoningChannel} from '@libs/actions/Report';
import type * as ReportActionsModule from '@libs/actions/Report';
import AgentZeroReasoningStore from '@libs/AgentZeroReasoningStore';

import {AgentZeroStatusProvider} from '@pages/inbox/AgentZeroStatusContext';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import Onyx from 'react-native-onyx';

import renderCoverableScreen from '../utils/ScreenCoverHarness';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

const REPORT_ID = '123';
const CURRENT_USER_ACCOUNT_ID = 111;
const CUSTOM_AGENT_ACCOUNT_ID = 555;
const PARTICIPANT = {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS};

jest.mock('@hooks/useLocalize', () => ({
    __esModule: true,
    default: () => ({translate: (key: string) => key}),
}));

jest.mock('@libs/actions/Report', () => ({
    ...jest.requireActual<typeof ReportActionsModule>('@libs/actions/Report'),
    clearAgentZeroProcessingIndicator: jest.fn(),
    getNewerActions: jest.fn(),
    subscribeToReportReasoningEvents: jest.fn(),
    unsubscribeFromReportReasoningChannel: jest.fn(),
}));

const mockedSubscribe = jest.mocked(subscribeToReportReasoningEvents);
const mockedUnsubscribe = jest.mocked(unsubscribeFromReportReasoningChannel);

/**
 * The reasoning channel carries the agent's thinking as it happens, and its cleanup also clears the report's reasoning
 * history. Events that arrive while nobody is subscribed are gone for good, so covering the chat with a thread must
 * not drop the subscription. The assertion describes behavior that ships today.
 */
describe('AgentZeroStatusProvider across a cover/reveal cycle', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        AgentZeroReasoningStore.clearReportReasoning(REPORT_ID);
        await Onyx.clear();
        await Onyx.merge(ONYXKEYS.CONCIERGE_REPORT_ID, '999');
        await Onyx.merge(ONYXKEYS.SESSION, {accountID: CURRENT_USER_ACCOUNT_ID});
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID}`, {
            reportID: REPORT_ID,
            type: CONST.REPORT.TYPE.CHAT,
            participants: {
                [CURRENT_USER_ACCOUNT_ID]: PARTICIPANT,
                [CUSTOM_AGENT_ACCOUNT_ID]: PARTICIPANT,
            },
        });
        await Onyx.merge(ONYXKEYS.PERSONAL_DETAILS_LIST, {
            [CUSTOM_AGENT_ACCOUNT_ID]: {accountID: CUSTOM_AGENT_ACCOUNT_ID, displayName: 'Agent', isCustomAgent: true},
        });
        await waitForBatchedUpdatesWithAct();
    });

    it('stays subscribed to the reasoning channel while the chat is covered by a thread', async () => {
        const screen = renderCoverableScreen(<AgentZeroStatusProvider reportID={REPORT_ID} />);
        await waitForBatchedUpdatesWithAct();
        expect(mockedSubscribe).toHaveBeenCalledTimes(1);

        await screen.hide();
        await waitForBatchedUpdatesWithAct();

        // While covered, the agent keeps answering. Dropping the channel here loses every event of that window,
        // and the cleanup clears what was already collected on top of that.
        expect(mockedUnsubscribe).not.toHaveBeenCalled();
    });
});
