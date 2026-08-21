import initOnyxDerivedValues from '@userActions/OnyxDerived';

import CONST from '@src/CONST';
import IntlStore from '@src/languages/IntlStore';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';
import type {LHNReportAttributes} from '@src/types/onyx/DerivedValues';

import Onyx from 'react-native-onyx';
import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';

import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

const CURRENT_USER_ACCOUNT_ID = 1;

const mockReport: Report = {
    reportID: 'proj1',
    reportName: 'Projection Room',
    type: CONST.REPORT.TYPE.CHAT,
    chatType: CONST.REPORT.CHAT_TYPE.POLICY_ROOM,
    lastVisibleActionCreated: '2026-01-02T00:00:00.000Z',
    lastMessageText: 'hello',
    participants: {[CURRENT_USER_ACCOUNT_ID]: {notificationPreference: 'always'}},
    policyID: 'policy1',
};

const getProjectionMember = (reportID: string) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- derivedReportAttributes_ members always hold LHNReportAttributes
    OnyxUtils.get(`${ONYXKEYS.COLLECTION.DERIVED_REPORT_ATTRIBUTES}${reportID}`) as Promise<LHNReportAttributes | undefined>;

describe('LHN attributes projection (SOTA LHN, lazy-Onyx POC)', () => {
    beforeAll(async () => {
        Onyx.init({keys: ONYXKEYS});
        initOnyxDerivedValues();
        await IntlStore.load(CONST.LOCALES.EN);
        await waitForBatchedUpdates();
    });

    beforeEach(async () => {
        await Onyx.clear();
        await Onyx.set(ONYXKEYS.RAM_ONLY_ARE_TRANSLATIONS_LOADING, false);
        await Onyx.set(ONYXKEYS.SESSION, {accountID: CURRENT_USER_ACCOUNT_ID, email: 'current@test.com'});
        await waitForBatchedUpdates();
    });

    it('writes an indexed projection member when the engine computes a report', async () => {
        // Given a report landing in Onyx (the reportAttributes engine is running).
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${mockReport.reportID}`, mockReport);
        await waitForBatchedUpdates();

        // Then the per-report projection member exists with the LHN sort/filter fields materialized.
        const member = await getProjectionMember(mockReport.reportID);
        expect(member?.reportName).toBe('Projection Room');
        expect(member?.sortName).toBe('projection room');
        expect(member?.lastVisibleActionCreated).toBe(mockReport.lastVisibleActionCreated);
        expect(member?.lhnEligibleDefault).toBe(1);
        expect(member?.isPinned).toBe(0);
        expect(member?.isArchived).toBe(0);
    });

    it('updates the projection member when the report changes', async () => {
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${mockReport.reportID}`, mockReport);
        await waitForBatchedUpdates();

        // When the room is renamed and pinned.
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${mockReport.reportID}`, {reportName: 'Renamed Room', isPinned: true});
        await waitForBatchedUpdates();

        const member = await getProjectionMember(mockReport.reportID);
        expect(member?.reportName).toBe('Renamed Room');
        expect(member?.sortName).toBe('renamed room');
        expect(member?.isPinned).toBe(1);
    });

    it('deletes the projection member when the report is removed', async () => {
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${mockReport.reportID}`, mockReport);
        await waitForBatchedUpdates();
        expect(await getProjectionMember(mockReport.reportID)).toBeTruthy();

        // When the report is deleted.
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${mockReport.reportID}`, null);
        await waitForBatchedUpdates();

        // Then its projection member is gone too.
        const member = await getProjectionMember(mockReport.reportID);
        expect(member ?? undefined).toBeUndefined();
    });

    it('marks a hidden chat ineligible for the LHN', async () => {
        // Given a chat the current user hid (notification preference "hidden") with no attention flags.
        const hiddenChat: Report = {
            reportID: 'hidden1',
            type: CONST.REPORT.TYPE.CHAT,
            lastVisibleActionCreated: '2026-01-02T00:00:00.000Z',
            lastMessageText: 'hello',
            participants: {[CURRENT_USER_ACCOUNT_ID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.HIDDEN}},
        };
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${hiddenChat.reportID}`, hiddenChat);
        await waitForBatchedUpdates();

        const member = await getProjectionMember(hiddenChat.reportID);
        expect(member?.lhnEligibleDefault).toBe(0);
    });
});
