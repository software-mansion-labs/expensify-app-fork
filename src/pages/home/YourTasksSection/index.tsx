import React from 'react';
import WidgetContainer from '@components/WidgetContainer';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import useSelfDMTasks from './hooks/useSelfDMTasks';
import TaskItem from './TaskItem';

function YourTasksSection() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {tasks, hasAnyTasks} = useSelfDMTasks();

    if (!hasAnyTasks) {
        return null;
    }

    return (
        <WidgetContainer
            title={translate('homePage.yourTasks')}
            containerStyles={styles.pb5}
        >
            {tasks.map((task) => (
                <TaskItem
                    key={task.reportID}
                    taskReport={task}
                />
            ))}
        </WidgetContainer>
    );
}

YourTasksSection.displayName = 'YourTasksSection';

export default YourTasksSection;
