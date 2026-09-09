import {renderHook} from '@testing-library/react-native';

import usePaginatedReportActions from '@hooks/usePaginatedReportActions';

import {resetReportActionsOrderStore} from '@libs/ReportActionsOrder/ReportActionsOrderStore';
import {getSortedReportActionsForDisplay} from '@libs/ReportActionsUtils';
import {setReportActionsEngineMode} from '@libs/SqlEngine/engineMode';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportActions} from '@src/types/onyx';
import type ReportActionName from '@src/types/onyx/ReportActionName';

import Onyx from 'react-native-onyx';

import {getMockEngineRequestCount, resetMockEngine} from '../../utils/mockSqlEngineClient';
import {getFakeReportAction} from '../../utils/ReportTestUtils';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- a jest.mock factory cannot reach a typed import, so the stand-in module is pulled in with require
jest.mock('@libs/SqlEngine/EngineClient', () => require('../../utils/mockSqlEngineClient'));

const REPORT_ID = '404';

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

function expectedIDs(actions: ReportActions): string[] {
    return getSortedReportActionsForDisplay(actions, undefined, true, undefined, REPORT_ID).map((reportAction) => reportAction.reportActionID);
}

describe('usePaginatedReportActions with the SQL engine', () => {
    beforeAll(() => Onyx.init({keys: ONYXKEYS, evictableKeys: [ONYXKEYS.COLLECTION.REPORT_ACTIONS]}));

    beforeEach(async () => {
        resetMockEngine();
        resetReportActionsOrderStore();
        setReportActionsEngineMode('preview');
        await Onyx.clear();
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID}`, {reportID: REPORT_ID});
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${REPORT_ID}`, FIXTURE);
        await waitForBatchedUpdates();
    });

    it('returns the engine order and keeps it equal to the JS order', async () => {
        const {result} = renderHook(() => usePaginatedReportActions(REPORT_ID));

        expect(result.current.sortedAllReportActions?.map((reportAction) => reportAction.reportActionID)).toEqual(expectedIDs(FIXTURE));

        await waitForBatchedUpdatesWithAct();

        expect(getMockEngineRequestCount()).toBeGreaterThan(0);
        expect(result.current.sortedAllReportActions?.map((reportAction) => reportAction.reportActionID)).toEqual(expectedIDs(FIXTURE));
    });

    it('picks up a newly merged action', async () => {
        const {result} = renderHook(() => usePaginatedReportActions(REPORT_ID));
        await waitForBatchedUpdatesWithAct();

        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${REPORT_ID}`, buildActions([{id: '5', created: '2024-01-04 00:00:00.000'}]));
        await waitForBatchedUpdatesWithAct();

        const withNewAction: ReportActions = {...FIXTURE, ...buildActions([{id: '5', created: '2024-01-04 00:00:00.000'}])};
        expect(result.current.sortedAllReportActions?.map((reportAction) => reportAction.reportActionID)).toEqual(expectedIDs(withNewAction));
    });
});
