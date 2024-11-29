import {useRoute} from '@react-navigation/native';
import React, {useEffect} from 'react';
import {View} from 'react-native';
import {useOnyx} from 'react-native-onyx';
import ScreenWrapper from '@components/ScreenWrapper';
import useActiveWorkspace from '@hooks/useActiveWorkspace';
import useLocalize from '@hooks/useLocalize';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import * as Browser from '@libs/Browser';
import BottomTabBar from '@libs/Navigation/AppNavigator/createCustomBottomTabNavigator/BottomTabBar';
import TopBar from '@libs/Navigation/AppNavigator/createCustomBottomTabNavigator/TopBar';
import {getPreservedSplitNavigatorState} from '@libs/Navigation/AppNavigator/createSplitStackNavigator/usePreserveSplitNavigatorState';
import createSplitNavigator from '@libs/Navigation/linkingConfig/createSplitNavigator';
import navigationRef from '@libs/Navigation/navigationRef';
import Performance from '@libs/Performance';
import SidebarLinksData from '@pages/home/sidebar/SidebarLinksData';
import Timing from '@userActions/Timing';
import CONST from '@src/CONST';
import NAVIGATORS from '@src/NAVIGATORS';
import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';

/**
 * Function called when a pinned chat is selected.
 */
const startTimer = () => {
    Timing.start(CONST.TIMING.SWITCH_REPORT);
    Performance.markStart(CONST.TIMING.SWITCH_REPORT);
};

function BaseSidebarScreen() {
    const styles = useThemeStyles();
    const {activeWorkspaceID} = useActiveWorkspace();
    const {translate} = useLocalize();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const [activeWorkspace] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${activeWorkspaceID ?? -1}`);
    const currentRoute = useRoute();

    useEffect(() => {
        Performance.markStart(CONST.TIMING.SIDEBAR_LOADED);
        Timing.start(CONST.TIMING.SIDEBAR_LOADED);
    }, []);

    // If the selected workspace has been deleted, the current workspace is reset to global.
    useEffect(() => {
        const isActiveWorkspaceDeleted = !!activeWorkspace || activeWorkspaceID === undefined;

        if (isActiveWorkspaceDeleted) {
            return;
        }

        const topmostReport = navigationRef.getRootState()?.routes.findLast((route) => route.name === NAVIGATORS.REPORTS_SPLIT_NAVIGATOR);

        if (!topmostReport) {
            return;
        }

        const topmostReportState = topmostReport?.state ?? getPreservedSplitNavigatorState(topmostReport?.key);
        if (topmostReportState?.routes.some((route) => currentRoute.key === route.key)) {
            navigationRef.current?.dispatch({
                target: navigationRef.current.getRootState().key,
                payload: createSplitNavigator({name: SCREENS.HOME}, {name: SCREENS.REPORT}),
                type: CONST.NAVIGATION.ACTION_TYPE.REPLACE,
            });
        }
    }, [activeWorkspace, activeWorkspaceID, currentRoute]);

    const shouldDisplaySearch = shouldUseNarrowLayout;

    return (
        <ScreenWrapper
            shouldEnableKeyboardAvoidingView={false}
            style={[styles.sidebar, Browser.isMobile() ? styles.userSelectNone : {}]}
            testID={BaseSidebarScreen.displayName}
            bottomContent={<BottomTabBar selectedTab={SCREENS.HOME} />}
        >
            {({insets}) => (
                <>
                    <TopBar
                        breadcrumbLabel={translate('common.inbox')}
                        activeWorkspaceID={activeWorkspaceID}
                        shouldDisplaySearch={shouldDisplaySearch}
                    />
                    <View style={[styles.flex1]}>
                        <SidebarLinksData
                            onLinkClick={startTimer}
                            insets={insets}
                        />
                    </View>
                </>
            )}
        </ScreenWrapper>
    );
}

BaseSidebarScreen.displayName = 'BaseSidebarScreen';

export default BaseSidebarScreen;
