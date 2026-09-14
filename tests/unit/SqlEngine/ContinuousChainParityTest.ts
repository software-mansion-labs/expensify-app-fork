import {getContinuousChain} from '@libs/PaginationUtils';
import {getReportActionsOrderSnapshot, resetReportActionsOrderStore, setReportActionsOrderRawActions, subscribeToReportActionsOrder} from '@libs/ReportActionsOrder/ReportActionsOrderStore';
import {setReportActionsEngineMode} from '@libs/SqlEngine/engineMode';

import CONST from '@src/CONST';
import type {ReportAction, ReportActions} from '@src/types/onyx';
import type Pages from '@src/types/onyx/Pages';

import {resetMockEngine} from '../../utils/mockSqlEngineClient';
import {getFakeReportAction} from '../../utils/ReportTestUtils';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- a jest.mock factory cannot reach a typed import, so the stand-in module is pulled in with require
jest.mock('@libs/SqlEngine/EngineClient', () => require('../../utils/mockSqlEngineClient'));

const REPORT_ID = '31';
const ACTION_COUNT = 30;

function getID(reportAction: ReportAction): string {
    return reportAction.reportActionID;
}

/** A descending timeline of ids `a00` to `a29`, so a page can be cut anywhere in it. */
function buildActions(): ReportActions {
    const actions: ReportActions = {};
    for (let index = 0; index < ACTION_COUNT; index++) {
        const id = `a${String(index).padStart(2, '0')}`;
        actions[id] = {
            ...getFakeReportAction(index + 1),
            reportActionID: id,
            created: `2024-01-${String(ACTION_COUNT - index).padStart(2, '0')} 00:00:00.000`,
            actionName: index === ACTION_COUNT - 1 ? CONST.REPORT.ACTIONS.TYPE.CREATED : CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
        };
    }
    return actions;
}

const ACTIONS = buildActions();

const SCENARIOS: Array<{name: string; pages: Pages; id?: string}> = [
    {name: 'no pages and no id', pages: []},
    {name: 'no pages with an id', pages: [], id: 'a05'},
    {name: 'no id, one page from the start marker', pages: [[CONST.PAGINATION_START_ID, 'a00', 'a01', 'a02', 'a03', 'a04']]},
    {
        name: 'an id inside a page',
        pages: [
            [CONST.PAGINATION_START_ID, 'a00', 'a01', 'a02'],
            ['a10', 'a11', 'a12'],
        ],
        id: 'a11',
    },
    {
        name: 'an id in the gap between two pages',
        pages: [
            ['a00', 'a01', 'a02'],
            ['a10', 'a11', 'a12'],
        ],
        id: 'a06',
    },
    {name: 'an id newer than the newest page', pages: [['a10', 'a11', 'a12']], id: 'a02'},
    {name: 'an id the report does not hold', pages: [['a00', 'a01', 'a02']], id: 'zz'},
    {name: 'a page that ends at the end marker', pages: [['a20', 'a21', CONST.PAGINATION_END_ID]], id: 'a21'},
    {name: 'a page whose ids the report no longer holds', pages: [['zz1', 'zz2']], id: 'a04'},
    {
        name: 'two pages given newest last',
        pages: [
            ['a10', 'a11', 'a12'],
            [CONST.PAGINATION_START_ID, 'a00', 'a01'],
        ],
    },
];

describe('continuous chain over the engine order', () => {
    let unsubscribe = () => {};

    beforeEach(async () => {
        resetMockEngine();
        resetReportActionsOrderStore();
        setReportActionsEngineMode('preview');
        unsubscribe = subscribeToReportActionsOrder(REPORT_ID, () => {});
        setReportActionsOrderRawActions(REPORT_ID, ACTIONS);
        await waitForBatchedUpdates();
    });

    afterEach(async () => {
        unsubscribe();
        await waitForBatchedUpdates();
    });

    it('builds one id-to-index map that describes the confirmed order', () => {
        const snapshot = getReportActionsOrderSnapshot(REPORT_ID);
        expect(snapshot?.actions).toHaveLength(ACTION_COUNT);
        expect(snapshot?.idToIndex.size).toBe(ACTION_COUNT);
        expect(snapshot?.actions.map((reportAction, index) => snapshot.idToIndex.get(getID(reportAction)) === index)).not.toContain(false);
    });

    it.each(SCENARIOS)('resolves $name exactly like the chain that builds its own map', ({pages, id}) => {
        const snapshot = getReportActionsOrderSnapshot(REPORT_ID);
        if (!snapshot) {
            throw new Error('The engine order was not confirmed');
        }

        const withSharedMap = getContinuousChain(snapshot.actions, pages, getID, id, snapshot.idToIndex);
        const withOwnMap = getContinuousChain(snapshot.actions, pages, getID, id);

        expect(withSharedMap.data.map(getID)).toEqual(withOwnMap.data.map(getID));
        expect(withSharedMap.hasNextPage).toBe(withOwnMap.hasNextPage);
        expect(withSharedMap.hasPreviousPage).toBe(withOwnMap.hasPreviousPage);
        expect(withSharedMap.resourceItem?.id).toBe(withOwnMap.resourceItem?.id);
        expect(withSharedMap.resourceItem?.index).toBe(withOwnMap.resourceItem?.index);
    });
});
