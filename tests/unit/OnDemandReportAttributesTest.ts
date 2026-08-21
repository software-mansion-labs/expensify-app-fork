import {renderHook} from '@testing-library/react-native';

import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import useOnDemandReportAttributes from '@hooks/useOnDemandReportAttributes';

import {translate as translateForLocale} from '@libs/Localize';
import {computeReportAttributesOnDemand} from '@libs/OnDemandReportAttributes';
import type {OnDemandNameContext} from '@libs/OnDemandReportName';

import CONST from '@src/CONST';
import IntlStore from '@src/languages/IntlStore';
import ONYXKEYS from '@src/ONYXKEYS';
import type {PersonalDetailsList, Report} from '@src/types/onyx';

import Onyx from 'react-native-onyx';

import * as TestHelper from '../utils/TestHelper';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

const CURRENT_USER_ACCOUNT_ID = 1;
const CURRENT_USER_LOGIN = 'current@test.com';

const personalDetailsList: PersonalDetailsList = {
    [CURRENT_USER_ACCOUNT_ID]: {accountID: CURRENT_USER_ACCOUNT_ID, login: CURRENT_USER_LOGIN, displayName: 'Current User'},
};

const roomReport: Report = {
    reportID: 'room1',
    type: CONST.REPORT.TYPE.CHAT,
    chatType: CONST.REPORT.CHAT_TYPE.POLICY_ROOM,
    reportName: '#general',
    policyID: 'policy1',
};

// A DM chat whose child IOU report carries errors — the propagation case.
const chatWithChildReport: Report = {
    reportID: 'chat1',
    type: CONST.REPORT.TYPE.CHAT,
    participants: {[CURRENT_USER_ACCOUNT_ID]: {notificationPreference: 'always'}},
};

const erroredChildReport: Report = {
    reportID: 'iou1',
    type: CONST.REPORT.TYPE.IOU,
    chatReportID: 'chat1',
    parentReportID: 'chat1',
    parentReportActionID: 'preview1',
    ownerAccountID: CURRENT_USER_ACCOUNT_ID,
    managerID: CURRENT_USER_ACCOUNT_ID,
    stateNum: CONST.REPORT.STATE_NUM.SUBMITTED,
    statusNum: CONST.REPORT.STATUS_NUM.SUBMITTED,
    errorFields: {createChat: {error: 'Something went wrong'}},
};

// The child's report-preview action in the chat — a child with no (or a deleted) parent action is
// intentionally skipped by the propagation, exactly like in the derived config.
const childPreviewAction = {
    reportActionID: 'preview1',
    actionName: CONST.REPORT.ACTIONS.TYPE.REPORT_PREVIEW,
    created: '2026-01-01 00:00:00.000',
    actorAccountID: CURRENT_USER_ACCOUNT_ID,
    childReportID: 'iou1',
    message: [{type: 'COMMENT', html: 'preview', text: 'preview'}],
    originalMessage: {linkedReportID: 'iou1'},
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

TestHelper.setupApp();

describe('OnDemandReportAttributes', () => {
    beforeEach(async () => {
        await Onyx.clear();
        await Onyx.set(ONYXKEYS.SESSION, {accountID: CURRENT_USER_ACCOUNT_ID, email: CURRENT_USER_LOGIN});
        await Onyx.set(ONYXKEYS.PERSONAL_DETAILS_LIST, personalDetailsList);
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${roomReport.reportID}`, roomReport);
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${chatWithChildReport.reportID}`, chatWithChildReport);
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${erroredChildReport.reportID}`, erroredChildReport);
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${chatWithChildReport.reportID}`, {[childPreviewAction.reportActionID]: childPreviewAction});
        await waitForBatchedUpdatesWithAct();
    });

    describe('computeReportAttributesOnDemand', () => {
        it('computes a clean report: name filled, no brick road', async () => {
            // Given a plain policy room. When its attributes are computed on demand.
            const {attributes} = await computeReportAttributesOnDemand(roomReport.reportID, buildContext());

            // Then the name comes from the same compute the derived value uses and no error is flagged.
            expect(attributes?.reportName).toBe('#general');
            expect(attributes?.brickRoadStatus).toBeUndefined();
            expect(attributes?.requiresAttention).toBe(false);
        });

        it('returns undefined attributes for a missing report', async () => {
            const {attributes} = await computeReportAttributesOnDemand('nonExistentReportID', buildContext());

            expect(attributes).toBeUndefined();
        });

        it("propagates a child IOU report's errors onto its parent chat (Fix badge)", async () => {
            // Given a chat whose child IOU report has errorFields. When the CHAT's attributes are computed.
            const {attributes, chainReportIDs} = await computeReportAttributesOnDemand(chatWithChildReport.reportID, buildContext());

            // Then the child (found via the `reports where chatReportID = X` query) marks the chat.
            expect(attributes?.brickRoadStatus).toBe(CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR);
            expect(attributes?.actionBadge).toBe(CONST.REPORT.ACTION_BADGE.FIX);
            // And the child joined the invalidation chain, so its future writes recompute the chat.
            expect(chainReportIDs.has(erroredChildReport.reportID)).toBe(true);
        });

        it('flags the errored child report itself', async () => {
            const {attributes} = await computeReportAttributesOnDemand(erroredChildReport.reportID, buildContext());

            expect(attributes?.brickRoadStatus).toBe(CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR);
            expect(Object.keys(attributes?.reportErrors ?? {}).length).toBeGreaterThan(0);
        });
    });

    describe('useOnDemandReportAttributes', () => {
        it('returns live attributes and recomputes on dependency writes', async () => {
            // Given a mounted hook for the clean room.
            const {result} = renderHook(() => useOnDemandReportAttributes(roomReport.reportID));
            await waitForBatchedUpdatesWithAct();
            expect(result.current?.reportName).toBe('#general');
            expect(result.current?.brickRoadStatus).toBeUndefined();

            // When the room gains error fields.
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${roomReport.reportID}`, {errorFields: {addWorkspaceRoom: {error: 'failed'}}});
            await waitForBatchedUpdatesWithAct();

            // Then the write watcher recomputes and the brick road turns red.
            expect(result.current?.brickRoadStatus).toBe(CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR);
        });

        it('returns undefined for an undefined reportID', async () => {
            const {result} = renderHook(() => useOnDemandReportAttributes(undefined));
            await waitForBatchedUpdatesWithAct();

            expect(result.current).toBeUndefined();
        });
    });
});
