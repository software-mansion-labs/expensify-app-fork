import React, {useEffect} from 'react';
import {View} from 'react-native';
import FocusTrapForScreens from '@components/FocusTrap/FocusTrapForScreen';
import {workspaceSplitsWithoutEnteringAnimation} from '@libs/Navigation/AppNavigator/createRootStackNavigator/GetStateForActionHandlers';
import createSplitNavigator from '@libs/Navigation/AppNavigator/createSplitNavigator';
import usePreloadFullScreenNavigators from '@libs/Navigation/AppNavigator/usePreloadFullScreenNavigators';
import useSplitNavigatorScreenOptions from '@libs/Navigation/AppNavigator/useSplitNavigatorScreenOptions';
import Animations from '@libs/Navigation/PlatformStackNavigation/navigationOptions/animation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {AuthScreensParamList, WorkspaceSplitNavigatorParamList} from '@libs/Navigation/types';
import type NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Screens = Partial<Record<keyof WorkspaceSplitNavigatorParamList, React.ComponentType<any>>>;

const WorkspaceInitialPage = React.lazy(() => import('../../../../pages/workspace/WorkspaceInitialPage'));

const CENTRAL_PANE_WORKSPACE_SCREENS = {
    [SCREENS.WORKSPACE.PROFILE]: React.lazy(() => import('../../../../pages/workspace/WorkspaceOverviewPage')),
    [SCREENS.WORKSPACE.WORKFLOWS]: React.lazy(() => import('../../../../pages/workspace/workflows/WorkspaceWorkflowsPage')),
    [SCREENS.WORKSPACE.INVOICES]: React.lazy(() => import('../../../../pages/workspace/invoices/WorkspaceInvoicesPage')),
    [SCREENS.WORKSPACE.MEMBERS]: React.lazy(() => import('../../../../pages/workspace/WorkspaceMembersPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.ROOT]: React.lazy(() => import('../../../../pages/workspace/accounting/PolicyAccountingPage')),
    [SCREENS.WORKSPACE.CATEGORIES]: React.lazy(() => import('../../../../pages/workspace/categories/WorkspaceCategoriesPage')),
    [SCREENS.WORKSPACE.MORE_FEATURES]: React.lazy(() => import('../../../../pages/workspace/WorkspaceMoreFeaturesPage')),
    [SCREENS.WORKSPACE.TAGS]: React.lazy(() => import('../../../../pages/workspace/tags/WorkspaceTagsPage')),
    [SCREENS.WORKSPACE.TAXES]: React.lazy(() => import('../../../../pages/workspace/taxes/WorkspaceTaxesPage')),
    [SCREENS.WORKSPACE.REPORTS]: React.lazy(() => import('../../../../pages/workspace/reports/WorkspaceReportsPage')),
    [SCREENS.WORKSPACE.EXPENSIFY_CARD]: React.lazy(() => import('../../../../pages/workspace/expensifyCard/WorkspaceExpensifyCardPage')),
    [SCREENS.WORKSPACE.COMPANY_CARDS]: React.lazy(() => import('../../../../pages/workspace/companyCards/WorkspaceCompanyCardsPage')),
    [SCREENS.WORKSPACE.PER_DIEM]: React.lazy(() => import('../../../../pages/workspace/perDiem/WorkspacePerDiemPage')),
    [SCREENS.WORKSPACE.RECEIPT_PARTNERS]: React.lazy(() => import('../../../../pages/workspace/receiptPartners/WorkspaceReceiptPartnersPage')),
    [SCREENS.WORKSPACE.DISTANCE_RATES]: React.lazy(() => import('../../../../pages/workspace/distanceRates/PolicyDistanceRatesPage')),
    [SCREENS.WORKSPACE.RULES]: React.lazy(() => import('../../../../pages/workspace/rules/PolicyRulesPage')),
} satisfies Screens;

const Split = createSplitNavigator<WorkspaceSplitNavigatorParamList>();

function WorkspaceSplitNavigator({route, navigation}: PlatformStackScreenProps<AuthScreensParamList, typeof NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR>) {
    const splitNavigatorScreenOptions = useSplitNavigatorScreenOptions();

    // This hook preloads the screens of adjacent tabs to make changing tabs faster.
    usePreloadFullScreenNavigators();

    useEffect(() => {
        const unsubscribe = navigation.addListener('transitionEnd', () => {
            // We want to call this function only once.
            unsubscribe();

            // If we open this screen from a different tab, then it won't have animation.
            if (!workspaceSplitsWithoutEnteringAnimation.has(route.key)) {
                return;
            }

            // We want to set animation after mounting so it will animate on going UP to the settings split.
            navigation.setOptions({animation: Animations.SLIDE_FROM_RIGHT});
        });

        return unsubscribe;
    }, [navigation, route.key]);

    return (
        <FocusTrapForScreens>
            <View style={{flex: 1}}>
                <Split.Navigator
                    persistentScreens={[SCREENS.WORKSPACE.INITIAL]}
                    sidebarScreen={SCREENS.WORKSPACE.INITIAL}
                    defaultCentralScreen={SCREENS.WORKSPACE.PROFILE}
                    parentRoute={route}
                    screenOptions={splitNavigatorScreenOptions.centralScreen}
                >
                    <Split.Screen
                        name={SCREENS.WORKSPACE.INITIAL}
                        component={WorkspaceInitialPage}
                        options={splitNavigatorScreenOptions.sidebarScreen}
                    />
                    {Object.entries(CENTRAL_PANE_WORKSPACE_SCREENS).map(([screenName, Component]) => (
                        <Split.Screen
                            key={screenName}
                            name={screenName as keyof Screens}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            component={Component as React.ComponentType<any>}
                        />
                    ))}
                </Split.Navigator>
            </View>
        </FocusTrapForScreens>
    );
}

WorkspaceSplitNavigator.displayName = 'WorkspaceSplitNavigator';

export {CENTRAL_PANE_WORKSPACE_SCREENS};
export default WorkspaceSplitNavigator;
