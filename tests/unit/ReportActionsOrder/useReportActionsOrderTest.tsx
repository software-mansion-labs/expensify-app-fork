import {renderHook} from '@testing-library/react-native';

import useReportActionsOrder from '@hooks/reportActionsOrder/useReportActionsOrder';
import type {ReportActionsOrderResult} from '@hooks/reportActionsOrder/useReportActionsOrder';

import {resetReportActionsOrderStore} from '@libs/ReportActionsOrder/ReportActionsOrderStore';
import {getSortedReportActionsForDisplay} from '@libs/ReportActionsUtils';
import {setReportActionsEngineMode} from '@libs/SqlEngine/engineMode';

import CONST from '@src/CONST';
import type {ReportActions} from '@src/types/onyx';
import type ReportActionName from '@src/types/onyx/ReportActionName';

import {resetMockEngine, setMockEngineAvailable} from '../../utils/mockSqlEngineClient';
import {getFakeReportAction} from '../../utils/ReportTestUtils';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- a jest.mock factory cannot reach a typed import, so the stand-in module is pulled in with require
jest.mock('@libs/SqlEngine/EngineClient', () => require('../../utils/mockSqlEngineClient'));

const REPORT_ID = '11';

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
]);

const WITH_NEW_ACTION: ReportActions = {...FIXTURE, ...buildActions([{id: '4', created: '2024-01-04 00:00:00.000'}])};

function expectedIDs(actions: ReportActions): string[] {
    return getSortedReportActionsForDisplay(actions, undefined, true, undefined, REPORT_ID).map((reportAction) => reportAction.reportActionID);
}

function orderedIDs(result: ReportActionsOrderResult): string[] | undefined {
    return result.actions?.map((reportAction) => reportAction.reportActionID);
}

describe('useReportActionsOrder', () => {
    beforeEach(() => {
        resetMockEngine();
        resetReportActionsOrderStore();
        setReportActionsEngineMode('preview');
    });

    afterEach(() => {
        setReportActionsEngineMode('preview');
    });

    it('previews the JS order and then confirms with exactly one extra render per change', async () => {
        let renderCount = 0;
        const {result, rerender} = renderHook(
            ({actions}: {actions: ReportActions}) => {
                renderCount += 1;
                return useReportActionsOrder(REPORT_ID, actions);
            },
            {initialProps: {actions: FIXTURE}},
        );

        expect(renderCount).toBe(1);
        expect(orderedIDs(result.current)).toEqual(expectedIDs(FIXTURE));

        await waitForBatchedUpdatesWithAct();

        expect(renderCount).toBe(2);
        const confirmed = result.current.actions;
        expect(confirmed?.map((reportAction) => reportAction.reportActionID)).toEqual(expectedIDs(FIXTURE));

        rerender({actions: FIXTURE});
        expect(renderCount).toBe(3);
        expect(result.current.actions).toBe(confirmed);

        rerender({actions: WITH_NEW_ACTION});
        expect(renderCount).toBe(4);
        expect(orderedIDs(result.current)).toEqual(expectedIDs(WITH_NEW_ACTION));

        await waitForBatchedUpdatesWithAct();

        expect(renderCount).toBe(5);
        expect(orderedIDs(result.current)).toEqual(expectedIDs(WITH_NEW_ACTION));
    });

    it('stays on the JS path when the engine is unavailable', async () => {
        setMockEngineAvailable(false);

        let renderCount = 0;
        const {result} = renderHook(() => {
            renderCount += 1;
            return useReportActionsOrder(REPORT_ID, FIXTURE);
        });

        await waitForBatchedUpdatesWithAct();

        expect(renderCount).toBe(1);
        expect(orderedIDs(result.current)).toEqual(expectedIDs(FIXTURE));
        expect(result.current.derived).toBeUndefined();
    });

    it('never falls back to the JS order in strict mode', async () => {
        setReportActionsEngineMode('strict');

        const {result} = renderHook(() => useReportActionsOrder(REPORT_ID, FIXTURE));

        expect(result.current.actions).toEqual([]);

        await waitForBatchedUpdatesWithAct();

        expect(orderedIDs(result.current)).toEqual(expectedIDs(FIXTURE));
    });

    it('resolves the unread anchor for the lastReadTime it is given', async () => {
        const lastReadTime = '2024-01-02 00:00:00.000';
        const {result} = renderHook(() => useReportActionsOrder(REPORT_ID, FIXTURE, lastReadTime));

        await waitForBatchedUpdatesWithAct();

        expect(result.current.derived?.anchorTime).toBe(lastReadTime);
        expect(result.current.derived?.unreadAnchorID).toBe('3');
    });

    it('reports no unread anchor when nothing is newer than the lastReadTime', async () => {
        const {result} = renderHook(() => useReportActionsOrder(REPORT_ID, FIXTURE, '2024-02-01 00:00:00.000'));

        await waitForBatchedUpdatesWithAct();

        expect(result.current.derived?.unreadAnchorID).toBe('');
    });

    it('shares one id-to-index map with the confirmed order', async () => {
        const {result} = renderHook(() => useReportActionsOrder(REPORT_ID, FIXTURE));

        await waitForBatchedUpdatesWithAct();

        const {actions, derived} = result.current;
        expect(derived?.idToIndex.size).toBe(actions?.length);
        expect(actions?.map((reportAction) => derived?.idToIndex.get(reportAction.reportActionID))).toEqual([0, 1, 2]);
    });
});
