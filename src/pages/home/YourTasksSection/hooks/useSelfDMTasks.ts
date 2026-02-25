import {useMemo} from 'react';
import useOnyx from '@hooks/useOnyx';
import useSelfDMReport from '@hooks/useSelfDMReport';
import {getOriginalMessage, isCreatedTaskReportAction} from '@libs/ReportActionsUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';

const MAX_TASKS = 5;

function useSelfDMTasks(): {tasks: Report[]; hasAnyTasks: boolean} {
    const selfDMReport = useSelfDMReport();
    const [reportActions] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${selfDMReport.reportID}`);
    const [allReports] = useOnyx(ONYXKEYS.COLLECTION.REPORT);

    const {tasks, hasAnyTasks} = useMemo(() => {
        const actions = Object.values(reportActions ?? {});
        const taskReports: Report[] = [];

        for (const action of actions) {
            if (!isCreatedTaskReportAction(action)) {
                continue;
            }

            const taskReportID = getOriginalMessage(action)?.taskReportID;
            if (!taskReportID) {
                continue;
            }

            const taskReport = allReports?.[`${ONYXKEYS.COLLECTION.REPORT}${taskReportID}`];
            if (!taskReport) {
                continue;
            }

            taskReports.push(taskReport);
        }

        return {
            tasks: taskReports.slice(0, MAX_TASKS),
            hasAnyTasks: taskReports.length > 0,
        };
    }, [reportActions, allReports]);

    return {tasks, hasAnyTasks};
}

export default useSelfDMTasks;
