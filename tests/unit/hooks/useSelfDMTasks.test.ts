/* eslint-disable @typescript-eslint/naming-convention */
import {renderHook} from '@testing-library/react-native';
import Onyx from 'react-native-onyx';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import useSelfDMTasks from '@src/pages/home/YourTasksSection/hooks/useSelfDMTasks';
import type {Report, ReportAction, ReportActions} from '@src/types/onyx';
import {createRegularTaskReport, createSelfDM} from '../../utils/collections/reports';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

const CURRENT_USER_ACCOUNT_ID = 1;

function buildTaskCreationAction(reportActionID: string, taskReportID: string, created?: string): ReportAction {
    return {
        actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
        reportActionID,
        actorAccountID: CURRENT_USER_ACCOUNT_ID,
        created: created ?? '2025-01-01 00:00:00.000',
        message: [{type: 'COMMENT', html: 'task', text: 'task'}],
        originalMessage: {
            html: 'task',
            taskReportID,
            whisperedTo: [],
        },
        person: [{type: 'TEXT', style: 'strong', text: 'User'}],
        automatic: false,
        avatar: '',
        shouldShow: true,
        lastModified: '2025-01-01 00:00:00.000',
    } as ReportAction;
}

function buildRegularCommentAction(reportActionID: string): ReportAction {
    return {
        actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
        reportActionID,
        actorAccountID: CURRENT_USER_ACCOUNT_ID,
        created: '2025-01-01 00:00:00.000',
        message: [{type: 'COMMENT', html: 'hello', text: 'hello'}],
        originalMessage: {
            html: 'hello',
            whisperedTo: [],
        },
        person: [{type: 'TEXT', style: 'strong', text: 'User'}],
        automatic: false,
        avatar: '',
        shouldShow: true,
        lastModified: '2025-01-01 00:00:00.000',
    } as ReportAction;
}

function buildTaskReport(reportID: string, overrides: Partial<Report> = {}): Report {
    return {
        ...createRegularTaskReport(Number(reportID), CURRENT_USER_ACCOUNT_ID),
        reportID,
        reportName: `Task ${reportID}`,
        description: `Description for task ${reportID}`,
        stateNum: CONST.REPORT.STATE_NUM.OPEN,
        statusNum: CONST.REPORT.STATUS_NUM.OPEN,
        ...overrides,
    };
}

describe('useSelfDMTasks', () => {
    const selfDMReport = createSelfDM(100, CURRENT_USER_ACCOUNT_ID);
    const selfDMReportID = selfDMReport.reportID;

    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    afterEach(async () => {
        await Onyx.clear();
    });

    it('should return empty tasks and hasAnyTasks false when no tasks exist in self-DM', async () => {
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${selfDMReportID}`, selfDMReport);
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${selfDMReportID}`, {});
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useSelfDMTasks());

        expect(result.current.tasks).toEqual([]);
        expect(result.current.hasAnyTasks).toBe(false);
    });

    it('should detect tasks from self-DM report actions that are created task actions', async () => {
        const taskReport = buildTaskReport('200');
        const taskAction = buildTaskCreationAction('1', '200');

        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${selfDMReportID}`, selfDMReport);
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}200`, taskReport);
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${selfDMReportID}`, {1: taskAction} as ReportActions);
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useSelfDMTasks());

        expect(result.current.tasks.length).toBeGreaterThanOrEqual(1);
        expect(result.current.hasAnyTasks).toBe(true);
    });

    it('should include both open and completed tasks', async () => {
        const openTask = buildTaskReport('201', {
            stateNum: CONST.REPORT.STATE_NUM.OPEN,
            statusNum: CONST.REPORT.STATUS_NUM.OPEN,
        });
        const completedTask = buildTaskReport('202', {
            stateNum: CONST.REPORT.STATE_NUM.APPROVED,
            statusNum: CONST.REPORT.STATUS_NUM.APPROVED,
        });

        const action1 = buildTaskCreationAction('1', '201', '2025-01-01 00:00:00.000');
        const action2 = buildTaskCreationAction('2', '202', '2025-01-02 00:00:00.000');

        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${selfDMReportID}`, selfDMReport);
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}201`, openTask);
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}202`, completedTask);
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${selfDMReportID}`, {
            1: action1,
            2: action2,
        } as ReportActions);
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useSelfDMTasks());

        expect(result.current.tasks).toHaveLength(2);
        expect(result.current.hasAnyTasks).toBe(true);

        const reportIDs = result.current.tasks.map((t: Report) => t.reportID);
        expect(reportIDs).toContain('201');
        expect(reportIDs).toContain('202');
    });

    it('should filter out regular ADD_COMMENT actions that do not have taskReportID', async () => {
        const taskReport = buildTaskReport('203');
        const taskAction = buildTaskCreationAction('1', '203');
        const regularComment = buildRegularCommentAction('2');

        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${selfDMReportID}`, selfDMReport);
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}203`, taskReport);
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${selfDMReportID}`, {
            1: taskAction,
            2: regularComment,
        } as ReportActions);
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useSelfDMTasks());

        expect(result.current.tasks).toHaveLength(1);
        expect(result.current.tasks.at(0)?.reportID).toBe('203');
    });

    it('should return at most 5 tasks', async () => {
        const actions: ReportActions = {};

        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${selfDMReportID}`, selfDMReport);

        for (let i = 1; i <= 7; i++) {
            const reportID = `${300 + i}`;
            // eslint-disable-next-line no-await-in-loop
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`, buildTaskReport(reportID));
            actions[String(i)] = buildTaskCreationAction(String(i), reportID, `2025-01-0${i} 00:00:00.000`);
        }

        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${selfDMReportID}`, actions);
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useSelfDMTasks());

        expect(result.current.tasks).toHaveLength(5);
        expect(result.current.hasAnyTasks).toBe(true);
    });

    it('should resolve task report data including title and status for each returned task', async () => {
        const taskReport = buildTaskReport('204', {
            reportName: 'Fix the login bug',
            description: 'Users cannot log in with SSO',
            stateNum: CONST.REPORT.STATE_NUM.OPEN,
            statusNum: CONST.REPORT.STATUS_NUM.OPEN,
        });
        const taskAction = buildTaskCreationAction('1', '204');

        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${selfDMReportID}`, selfDMReport);
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}204`, taskReport);
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${selfDMReportID}`, {1: taskAction} as ReportActions);
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useSelfDMTasks());

        expect(result.current.tasks).toHaveLength(1);
        const task = result.current.tasks.at(0);
        expect(task?.reportID).toBe('204');
        expect(task?.reportName).toBe('Fix the login bug');
        expect(task?.stateNum).toBe(CONST.REPORT.STATE_NUM.OPEN);
    });
});
