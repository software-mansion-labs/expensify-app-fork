import {renderHook} from '@testing-library/react-native';

import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import useOnDemandReportName from '@hooks/useOnDemandReportName';

import {translate as translateForLocale} from '@libs/Localize';
import {computeReportNameOnDemand} from '@libs/OnDemandReportName';
import type {OnDemandNameContext} from '@libs/OnDemandReportName';
import {computeReportName} from '@libs/ReportNameUtils';
import {buildTransactionsByReportID} from '@libs/TodosUtils';

import CONST from '@src/CONST';
import IntlStore from '@src/languages/IntlStore';
import ONYXKEYS from '@src/ONYXKEYS';
import type {PersonalDetailsList, Report, ReportAction} from '@src/types/onyx';

import Onyx from 'react-native-onyx';

import * as TestHelper from '../utils/TestHelper';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

const CURRENT_USER_ACCOUNT_ID = 1;
const CURRENT_USER_LOGIN = 'current@test.com';
const OTHER_ACCOUNT_ID = 2;

const personalDetailsList: PersonalDetailsList = {
    [CURRENT_USER_ACCOUNT_ID]: {accountID: CURRENT_USER_ACCOUNT_ID, login: CURRENT_USER_LOGIN, displayName: 'Current User', firstName: 'Current'},
    [OTHER_ACCOUNT_ID]: {accountID: OTHER_ACCOUNT_ID, login: 'bob@test.com', displayName: 'Bob Builder', firstName: 'Bob'},
};

const chatReport: Report = {
    reportID: 'chat1',
    type: CONST.REPORT.TYPE.CHAT,
    participants: {[CURRENT_USER_ACCOUNT_ID]: {notificationPreference: 'always'}, [OTHER_ACCOUNT_ID]: {notificationPreference: 'always'}},
    lastVisibleActionCreated: '2026-01-01 00:00:00.000',
};

const roomReport: Report = {
    reportID: 'room1',
    type: CONST.REPORT.TYPE.CHAT,
    chatType: CONST.REPORT.CHAT_TYPE.POLICY_ROOM,
    reportName: '#general',
    policyID: 'policy1',
};

const parentReportAction: ReportAction = {
    reportActionID: 'action1',
    actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
    created: '2026-01-01 00:00:00.000',
    actorAccountID: OTHER_ACCOUNT_ID,
    message: [{type: 'COMMENT', html: 'Hello thread', text: 'Hello thread'}],
};

const threadReport: Report = {
    reportID: 'thread1',
    type: CONST.REPORT.TYPE.CHAT,
    chatReportID: 'chat1',
    parentReportID: 'chat1',
    parentReportActionID: 'action1',
    participants: {[CURRENT_USER_ACCOUNT_ID]: {notificationPreference: 'always'}, [OTHER_ACCOUNT_ID]: {notificationPreference: 'always'}},
};

function buildContext(): OnDemandNameContext {
    const translate: LocalizedTranslate = (path, ...parameters) => translateForLocale(undefined, path, ...parameters);
    return {
        personalDetailsList,
        currentUserAccountID: CURRENT_USER_ACCOUNT_ID,
        currentUserLogin: CURRENT_USER_LOGIN,
        translate,
        dateFnsLocale: IntlStore.getDateFnsLocale(undefined),
        conciergeReportID: undefined,
        isTrackIntentUser: false,
    };
}

/** The derived-config compute over FULL collections — the semantic reference the on-demand path must match. */
function computeReferenceName(report: Report): string {
    const context = buildContext();
    return computeReportName({
        report,
        reports: {
            [`${ONYXKEYS.COLLECTION.REPORT}${chatReport.reportID}`]: chatReport,
            [`${ONYXKEYS.COLLECTION.REPORT}${roomReport.reportID}`]: roomReport,
            [`${ONYXKEYS.COLLECTION.REPORT}${threadReport.reportID}`]: threadReport,
        },
        policies: {},
        transactions: {},
        allReportNameValuePairs: {},
        allPolicyTags: {},
        reportActions: {[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${chatReport.reportID}`]: {[parentReportAction.reportActionID]: parentReportAction}},
        personalDetailsList: context.personalDetailsList,
        currentUserAccountID: context.currentUserAccountID,
        currentUserLogin: context.currentUserLogin,
        translate: context.translate,
        dateFnsLocale: context.dateFnsLocale,
        conciergeReportID: context.conciergeReportID,
        reportAttributes: undefined,
        reportTransactions: buildTransactionsByReportID({}),
        isTrackIntentUser: context.isTrackIntentUser,
        pendingDeleteMemberAccountIDs: [],
    });
}

TestHelper.setupApp();

describe('OnDemandReportName', () => {
    beforeEach(async () => {
        await Onyx.clear();
        await Onyx.set(ONYXKEYS.SESSION, {accountID: CURRENT_USER_ACCOUNT_ID, email: CURRENT_USER_LOGIN});
        await Onyx.set(ONYXKEYS.PERSONAL_DETAILS_LIST, personalDetailsList);
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${chatReport.reportID}`, chatReport);
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${roomReport.reportID}`, roomReport);
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${threadReport.reportID}`, threadReport);
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${chatReport.reportID}`, {[parentReportAction.reportActionID]: parentReportAction});
        await waitForBatchedUpdatesWithAct();
    });

    describe('computeReportNameOnDemand', () => {
        it('matches the derived compute for a 1:1 chat (participant-based name)', async () => {
            // Given a 1:1 chat stored in Onyx. When the name is computed on demand from targeted reads.
            const {name} = await computeReportNameOnDemand(chatReport.reportID, buildContext());

            // Then it equals the name the derived config computes from whole collections.
            expect(name).toBe(computeReferenceName(chatReport));
            expect(name).toContain('Bob');
        });

        it('matches the derived compute for a policy room (stored reportName)', async () => {
            const {name} = await computeReportNameOnDemand(roomReport.reportID, buildContext());

            expect(name).toBe(computeReferenceName(roomReport));
            expect(name).toBe('#general');
        });

        it('matches the derived compute for a thread (parent-chain walk)', async () => {
            // Given a thread whose name derives from its parent action in the parent chat.
            const {name, visitedKeys, chainReportIDs} = await computeReportNameOnDemand(threadReport.reportID, buildContext());

            // Then the on-demand walk resolves the parent chain to the same name.
            expect(name).toBe(computeReferenceName(threadReport));
            // And the dependency set covers both the thread and its parent chat.
            expect(chainReportIDs).toEqual(new Set([threadReport.reportID, chatReport.reportID]));
            expect(visitedKeys.has(`${ONYXKEYS.COLLECTION.REPORT}${chatReport.reportID}`)).toBe(true);
            expect(visitedKeys.has(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${chatReport.reportID}`)).toBe(true);
        });
    });

    describe('useOnDemandReportName', () => {
        it('returns the report name and keeps it live across dependency writes', async () => {
            // Given a mounted hook for the policy room.
            const {result} = renderHook(() => useOnDemandReportName(roomReport.reportID));
            await waitForBatchedUpdatesWithAct();
            expect(result.current).toBe('#general');

            // When the room is renamed in Onyx.
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${roomReport.reportID}`, {reportName: '#renamed'});
            await waitForBatchedUpdatesWithAct();

            // Then the write watcher recomputes the name without any whole-collection subscription.
            expect(result.current).toBe('#renamed');
        });

        it('returns undefined for an undefined reportID', async () => {
            const {result} = renderHook(() => useOnDemandReportName(undefined));
            await waitForBatchedUpdatesWithAct();

            expect(result.current).toBeUndefined();
        });
    });
});
