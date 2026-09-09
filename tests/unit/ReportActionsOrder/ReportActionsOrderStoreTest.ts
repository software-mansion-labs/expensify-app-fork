import {
    getReportActionsOrderSnapshot,
    getReportActionsOrderStats,
    resetReportActionsOrderStore,
    setReportActionsOrderRawActions,
    subscribeToReportActionsOrder,
} from '@libs/ReportActionsOrder/ReportActionsOrderStore';
import {getSortedReportActionsForDisplay} from '@libs/ReportActionsUtils';
import {setReportActionsEngineMode} from '@libs/SqlEngine/engineMode';

import CONST from '@src/CONST';
import type {ReportActions} from '@src/types/onyx';
import type ReportActionName from '@src/types/onyx/ReportActionName';

import {flushMockEngineReplies, getMockEngineDropCount, getMockEngineRequestCount, resetMockEngine, setMockEngineDeferred, setMockEngineOrderOverride} from '../../utils/mockSqlEngineClient';
import {getFakeReportAction} from '../../utils/ReportTestUtils';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- a jest.mock factory cannot reach a typed import, so the stand-in module is pulled in with require
jest.mock('@libs/SqlEngine/EngineClient', () => require('../../utils/mockSqlEngineClient'));

const REPORT_ID = '7';

function buildActions(entries: Array<{id: string; created: string; actionName?: ReportActionName}>): ReportActions {
    const actions: ReportActions = {};
    for (const [index, {id, created, actionName}] of entries.entries()) {
        actions[id] = {...getFakeReportAction(index + 1), reportActionID: id, created, actionName: actionName ?? CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT};
    }
    return actions;
}

const FIXTURE = buildActions([
    {id: '1', created: '2024-01-01 00:00:00.000', actionName: CONST.REPORT.ACTIONS.TYPE.CREATED},
    {id: '2', created: '2024-01-02 00:00:00.000'},
    {id: '3', created: '2024-01-03 00:00:00.000'},
    {id: '4', created: '2024-01-03 00:00:00.000', actionName: CONST.REPORT.ACTIONS.TYPE.REPORT_PREVIEW},
]);

function requireAction(actions: ReportActions, id: string) {
    const action = actions[id];
    if (!action) {
        throw new Error(`Missing fixture action ${id}`);
    }
    return action;
}

function expectedIDs(actions: ReportActions): string[] {
    return getSortedReportActionsForDisplay(actions, undefined, true, undefined, REPORT_ID).map((reportAction) => reportAction.reportActionID);
}

function snapshotIDs(): string[] | undefined {
    return getReportActionsOrderSnapshot(REPORT_ID)?.actions.map((reportAction) => reportAction.reportActionID);
}

describe('ReportActionsOrderStore', () => {
    let unsubscribe = () => {};
    let notifications = 0;

    beforeEach(() => {
        resetMockEngine();
        resetReportActionsOrderStore();
        setReportActionsEngineMode('preview');
        notifications = 0;
        unsubscribe = subscribeToReportActionsOrder(REPORT_ID, () => {
            notifications += 1;
        });
    });

    afterEach(async () => {
        unsubscribe();
        await waitForBatchedUpdates();
        setReportActionsEngineMode('preview');
    });

    it('confirms an order that matches the JS order and notifies once', async () => {
        setReportActionsOrderRawActions(REPORT_ID, FIXTURE);
        expect(snapshotIDs()).toBeUndefined();

        await waitForBatchedUpdates();

        expect(snapshotIDs()).toEqual(expectedIDs(FIXTURE));
        expect(notifications).toBe(1);
        expect(getReportActionsOrderStats().roundTrips).toBe(1);
    });

    it('ignores a value it already holds', async () => {
        setReportActionsOrderRawActions(REPORT_ID, FIXTURE);
        await waitForBatchedUpdates();
        setReportActionsOrderRawActions(REPORT_ID, FIXTURE);
        await waitForBatchedUpdates();

        expect(getMockEngineRequestCount()).toBe(1);
        expect(notifications).toBe(1);
    });

    it('confirms locally without a worker message when no sort key moved', async () => {
        setReportActionsOrderRawActions(REPORT_ID, FIXTURE);
        await waitForBatchedUpdates();

        const editedID = '2';
        const edited: ReportActions = {...FIXTURE, [editedID]: {...requireAction(FIXTURE, editedID), message: [{type: 'COMMENT', html: 'edited', text: 'edited'}]}};
        setReportActionsOrderRawActions(REPORT_ID, edited);

        expect(getMockEngineRequestCount()).toBe(1);
        expect(getReportActionsOrderStats().localConfirms).toBe(1);
        expect(getReportActionsOrderSnapshot(REPORT_ID)?.raw).toBe(edited);
        expect(snapshotIDs()).toEqual(expectedIDs(edited));
    });

    it('drops a reply that belongs to an older version', async () => {
        setMockEngineDeferred(true);
        setReportActionsOrderRawActions(REPORT_ID, FIXTURE);

        const withNewAction: ReportActions = {...FIXTURE, ...buildActions([{id: '5', created: '2024-01-04 00:00:00.000'}])};
        setReportActionsOrderRawActions(REPORT_ID, withNewAction);

        flushMockEngineReplies();
        await waitForBatchedUpdates();

        expect(getReportActionsOrderStats().staleReplies).toBe(1);
        expect(getReportActionsOrderStats().roundTrips).toBe(1);
        expect(snapshotIDs()).toEqual(expectedIDs(withNewAction));
        expect(notifications).toBe(1);
    });

    it('forgets the report when Onyx evicts it', async () => {
        setReportActionsOrderRawActions(REPORT_ID, FIXTURE);
        await waitForBatchedUpdates();
        const dropsBefore = getMockEngineDropCount();

        setReportActionsOrderRawActions(REPORT_ID, undefined);
        await waitForBatchedUpdates();

        expect(getReportActionsOrderSnapshot(REPORT_ID)).toBeUndefined();
        expect(getMockEngineDropCount()).toBe(dropsBefore + 1);

        setReportActionsOrderRawActions(REPORT_ID, FIXTURE);
        await waitForBatchedUpdates();

        expect(snapshotIDs()).toEqual(expectedIDs(FIXTURE));
    });

    it('drops the report on the last unsubscribe', async () => {
        setReportActionsOrderRawActions(REPORT_ID, FIXTURE);
        await waitForBatchedUpdates();
        const dropsBefore = getMockEngineDropCount();

        unsubscribe();
        unsubscribe = () => {};
        await waitForBatchedUpdates();

        expect(getMockEngineDropCount()).toBe(dropsBefore + 1);
        expect(getReportActionsOrderSnapshot(REPORT_ID)).toBeUndefined();
    });

    it('keeps the report when a second subscriber takes it over in the same tick', async () => {
        setReportActionsOrderRawActions(REPORT_ID, FIXTURE);
        await waitForBatchedUpdates();

        const second = subscribeToReportActionsOrder(REPORT_ID, () => {});
        unsubscribe();
        unsubscribe = second;
        await waitForBatchedUpdates();

        expect(snapshotIDs()).toEqual(expectedIDs(FIXTURE));
    });

    it('counts a mismatch against the JS order in strict mode', async () => {
        setReportActionsEngineMode('strict');
        setMockEngineOrderOverride((reportID, ids) => ids.slice().reverse());

        setReportActionsOrderRawActions(REPORT_ID, FIXTURE);
        await waitForBatchedUpdates();

        expect(getReportActionsOrderStats().mismatches).toBe(1);
        expect(snapshotIDs()).toEqual(expectedIDs(FIXTURE).slice().reverse());
    });

    it('counts no mismatch in strict mode when the orders agree', async () => {
        setReportActionsEngineMode('strict');

        setReportActionsOrderRawActions(REPORT_ID, FIXTURE);
        await waitForBatchedUpdates();

        expect(getReportActionsOrderStats().mismatches).toBe(0);
    });

    it('does nothing while the mode is off', async () => {
        setReportActionsEngineMode('off');

        setReportActionsOrderRawActions(REPORT_ID, FIXTURE);
        await waitForBatchedUpdates();

        expect(getMockEngineRequestCount()).toBe(0);
        expect(getReportActionsOrderSnapshot(REPORT_ID)).toBeUndefined();
    });
});
