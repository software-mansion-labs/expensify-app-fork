import React from 'react';
import {View} from 'react-native';
import Checkbox from '@components/Checkbox';
import PressableWithoutFeedback from '@components/Pressable/PressableWithoutFeedback';
import Text from '@components/Text';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useHasOutstandingChildTask from '@hooks/useHasOutstandingChildTask';
import useLocalize from '@hooks/useLocalize';
import useParentReport from '@hooks/useParentReport';
import useParentReportAction from '@hooks/useParentReportAction';
import useReportIsArchived from '@hooks/useReportIsArchived';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import {callFunctionIfActionIsAllowed} from '@libs/actions/Session';
import {canActionTask, completeTask, reopenTask} from '@libs/actions/Task';
import Navigation from '@libs/Navigation/Navigation';
import {isCompletedTaskReport} from '@libs/ReportUtils';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type {Report} from '@src/types/onyx';

type TaskItemProps = {
    taskReport: Report;
};

function TaskItem({taskReport}: TaskItemProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const {accountID} = useCurrentUserPersonalDetails();

    const parentReportAction = useParentReportAction(taskReport);
    const parentReport = useParentReport(taskReport.reportID);
    const isParentReportArchived = useReportIsArchived(parentReport?.reportID);
    const hasOutstandingChildTask = useHasOutstandingChildTask(taskReport);

    const isCompleted = isCompletedTaskReport(taskReport);
    const isActionable = canActionTask(taskReport, parentReportAction, accountID, parentReport, isParentReportArchived);

    const title = taskReport.reportName ?? '';
    const description = taskReport.description ?? '';

    const handleCheckboxPress = callFunctionIfActionIsAllowed(() => {
        if (isCompleted) {
            reopenTask(taskReport, parentReport, accountID, taskReport.reportID);
        } else {
            completeTask(taskReport, parentReport?.hasOutstandingChildTask ?? false, hasOutstandingChildTask, parentReportAction, taskReport.reportID);
        }
    });

    return (
        <PressableWithoutFeedback
            onPress={() => Navigation.navigate(ROUTES.REPORT_WITH_ID.getRoute(taskReport.reportID, undefined, undefined, Navigation.getActiveRoute()))}
            style={[styles.flexRow, styles.alignItemsCenter, styles.pv3, shouldUseNarrowLayout ? styles.ph5 : styles.ph8]}
            role={CONST.ROLE.BUTTON}
            accessibilityLabel={title}
        >
            <Checkbox
                style={styles.mr3}
                isChecked={isCompleted}
                disabled={!isActionable}
                onPress={handleCheckboxPress}
                accessibilityLabel={translate('task.task')}
            />
            <View style={[styles.flex1, styles.flexColumn, styles.justifyContentCenter]}>
                <Text
                    style={[styles.widgetItemTitle, isCompleted && styles.textLineThrough]}
                    numberOfLines={1}
                >
                    {title}
                </Text>
                {!!description && (
                    <Text
                        style={[styles.widgetItemSubtitle, isCompleted && styles.textLineThrough]}
                        numberOfLines={1}
                    >
                        {description}
                    </Text>
                )}
            </View>
        </PressableWithoutFeedback>
    );
}

TaskItem.displayName = 'TaskItem';

export default TaskItem;
