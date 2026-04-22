import React, {useState} from 'react';
import createSplitNavigator from '@libs/Navigation/AppNavigator/createSplitNavigator';
import FreezeWrapper from '@libs/Navigation/AppNavigator/FreezeWrapper';
import useSplitNavigatorScreenOptions from '@libs/Navigation/AppNavigator/useSplitNavigatorScreenOptions';
import getCurrentUrl from '@libs/Navigation/currentUrl';
import shouldOpenOnAdminRoom from '@libs/Navigation/helpers/shouldOpenOnAdminRoom';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {ReportsSplitNavigatorParamList, TabNavigatorParamList} from '@libs/Navigation/types';
import CONST from '@src/CONST';
import type NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';
import type ReactComponentModule from '@src/types/utils/ReactComponentModule';

const loadReportScreen = () => require<ReactComponentModule>('@pages/inbox/ReportScreen').default;
const loadSidebarScreen = () => require<ReactComponentModule>('@pages/inbox/sidebar/BaseSidebarScreen').default;
const Split = createSplitNavigator<ReportsSplitNavigatorParamList>();

/**
 * This SplitNavigator includes the HOME screen (<BaseSidebarScreen /> component) with a list of reports as a sidebar screen and the REPORT screen displayed as a central one.
 * There can be multiple report screens in the stack with different report IDs.
 */
function ReportsSplitNavigator({route}: PlatformStackScreenProps<TabNavigatorParamList, typeof NAVIGATORS.REPORTS_SPLIT_NAVIGATOR>) {
    const splitNavigatorScreenOptions = useSplitNavigatorScreenOptions();
    const isOpenOnAdminRoom = shouldOpenOnAdminRoom();

    const [initialReportID] = useState(() => {
        // Deep links and REPORT_WITH_ID navigation pass the reportID in nested params.
        if (route.params?.screen === SCREENS.REPORT && route.params.params?.reportID) {
            return route.params.params.reportID;
        }

        // On web, getCurrentUrl() returns window.location.href and may contain a reportID.
        // On native, getCurrentUrl() always returns ''.
        const currentURL = getCurrentUrl();
        const reportIdFromPath = currentURL ? new URL(currentURL).pathname.match(CONST.REGEX.REPORT_ID_FROM_PATH)?.at(1) : undefined;
        if (reportIdFromPath) {
            return reportIdFromPath;
        }

        // Skip the O(n) findLastAccessedReport scan on cold start so the splash screen can hide faster.
        // The user can pick a report from the sidebar; deep links are dispatched after the splash hides.
        return '';
    });

    const reportScreenInitialParams = {
        reportID: initialReportID,
        openOnAdminRoom: isOpenOnAdminRoom ? true : undefined,
    };

    return (
        <FreezeWrapper>
            <Split.Navigator
                persistentScreens={[SCREENS.INBOX]}
                sidebarScreen={SCREENS.INBOX}
                defaultCentralScreen={SCREENS.REPORT}
                parentRoute={route}
                screenOptions={splitNavigatorScreenOptions.centralScreen}
            >
                <Split.Screen
                    name={SCREENS.INBOX}
                    getComponent={loadSidebarScreen}
                    options={splitNavigatorScreenOptions.sidebarScreen}
                />
                <Split.Screen
                    name={SCREENS.REPORT}
                    initialParams={reportScreenInitialParams}
                    getComponent={loadReportScreen}
                />
            </Split.Navigator>
        </FreezeWrapper>
    );
}

export default ReportsSplitNavigator;
