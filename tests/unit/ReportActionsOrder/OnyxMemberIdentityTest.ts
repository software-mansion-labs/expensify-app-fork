import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportActions} from '@src/types/onyx';

import Onyx from 'react-native-onyx';

import {getFakeReportAction} from '../../utils/ReportTestUtils';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

const REPORT_ID = '1';
const REPORT_ACTIONS_KEY = `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${REPORT_ID}` as const;

function readReportActions(): Promise<ReportActions | undefined> {
    return new Promise((resolve) => {
        const connection = Onyx.connectWithoutView({
            key: REPORT_ACTIONS_KEY,
            callback: (value) => {
                Onyx.disconnect(connection);
                resolve(value ?? undefined);
            },
        });
    });
}

describe('Onyx member identity after merge', () => {
    beforeAll(() => Onyx.init({keys: ONYXKEYS}));

    beforeEach(async () => {
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    it('keeps untouched members referentially equal and replaces only the merged member', async () => {
        await Onyx.merge(REPORT_ACTIONS_KEY, {
            A: getFakeReportAction(1),
            B: getFakeReportAction(2),
            C: getFakeReportAction(3),
        });
        await waitForBatchedUpdates();

        const before = await readReportActions();
        expect(before).toBeDefined();

        await Onyx.merge(REPORT_ACTIONS_KEY, {A: {message: [{type: 'COMMENT', html: 'edited', text: 'edited'}]}});
        await waitForBatchedUpdates();

        const after = await readReportActions();

        expect(after).not.toBe(before);
        expect(after?.B).toBe(before?.B);
        expect(after?.C).toBe(before?.C);
        expect(after?.A).not.toBe(before?.A);
    });

    it('returns the very same map object when the merge changes nothing', async () => {
        const action = getFakeReportAction(1);
        await Onyx.merge(REPORT_ACTIONS_KEY, {A: action, B: getFakeReportAction(2)});
        await waitForBatchedUpdates();

        const before = await readReportActions();

        await Onyx.merge(REPORT_ACTIONS_KEY, {A: {reportActionID: action.reportActionID}});
        await waitForBatchedUpdates();

        const after = await readReportActions();

        expect(after).toBe(before);
    });

    it('drops a member merged with null and keeps the others referentially equal', async () => {
        await Onyx.merge(REPORT_ACTIONS_KEY, {
            A: getFakeReportAction(1),
            B: getFakeReportAction(2),
        });
        await waitForBatchedUpdates();

        const before = await readReportActions();

        await Onyx.merge(REPORT_ACTIONS_KEY, {A: null});
        await waitForBatchedUpdates();

        const after = await readReportActions();

        expect(after?.A).toBeUndefined();
        expect(after?.B).toBe(before?.B);
    });
});
