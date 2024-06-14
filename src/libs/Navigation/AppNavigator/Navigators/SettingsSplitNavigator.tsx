import React from 'react';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';
import useWindowDimensions from '@hooks/useWindowDimensions';
import createSplitNavigator from '@libs/Navigation/AppNavigator/createSplitNavigator';
import getRootNavigatorScreenOptions from '@libs/Navigation/AppNavigator/getRootNavigatorScreenOptions';
import type {SettingsSplitNavigatorParamList} from '@libs/Navigation/types';
import SCREENS from '@src/SCREENS';

const loadInitialSettingsPage = () => require('../../../../pages/settings/InitialSettingsPage').default as React.ComponentType;

const RootStack = createSplitNavigator<SettingsSplitNavigatorParamList>();

type Screens = Partial<Record<keyof SettingsSplitNavigatorParamList, () => React.ComponentType>>;

const SETTINGS_CENTRAL_PANE_SCREENS = {
    [SCREENS.SETTINGS.WORKSPACES]: () => require('../../../../pages/workspace/WorkspacesListPage').default as React.ComponentType,
    [SCREENS.SETTINGS.PREFERENCES.ROOT]: () => require('../../../../pages/settings/Preferences/PreferencesPage').default as React.ComponentType,
    [SCREENS.SETTINGS.SECURITY]: () => require('../../../../pages/settings/Security/SecuritySettingsPage').default as React.ComponentType,
    [SCREENS.SETTINGS.PROFILE.ROOT]: () => require('../../../../pages/settings/Profile/ProfilePage').default as React.ComponentType,
    [SCREENS.SETTINGS.WALLET.ROOT]: () => require('../../../../pages/settings/Wallet/WalletPage').default as React.ComponentType,
    [SCREENS.SETTINGS.ABOUT]: () => require('../../../../pages/settings/AboutPage/AboutPage').default as React.ComponentType,
    [SCREENS.SETTINGS.TROUBLESHOOT]: () => require('../../../../pages/settings/Troubleshoot/TroubleshootPage').default as React.ComponentType,
    [SCREENS.SETTINGS.SAVE_THE_WORLD]: () => require('../../../../pages/TeachersUnite/SaveTheWorldPage').default as React.ComponentType,
    [SCREENS.SETTINGS.SUBSCRIPTION.ROOT]: () => require('../../../../pages/settings/Subscription/SubscriptionSettingsPage').default as React.ComponentType,
} satisfies Screens;

function SettingsSplitNavigator() {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const {isSmallScreenWidth} = useWindowDimensions();
    const screenOptions = getRootNavigatorScreenOptions(isSmallScreenWidth, styles, StyleUtils);

    return (
        <RootStack.Navigator
            sidebarScreen={SCREENS.SETTINGS.ROOT}
            initialCentralPaneScreen={SCREENS.SETTINGS.PROFILE.ROOT}
            screenOptions={screenOptions.centralPaneNavigator}
        >
            <RootStack.Screen
                name={SCREENS.SETTINGS.ROOT}
                options={screenOptions.homeScreen}
                getComponent={loadInitialSettingsPage}
            />
            {Object.entries(SETTINGS_CENTRAL_PANE_SCREENS).map(([screenName, componentGetter]) => (
                <RootStack.Screen
                    key={screenName}
                    name={screenName as keyof Screens}
                    getComponent={componentGetter}
                />
            ))}
        </RootStack.Navigator>
    );
}

SettingsSplitNavigator.displayName = 'SettingsSplitNavigator';

export {SETTINGS_CENTRAL_PANE_SCREENS};
export default SettingsSplitNavigator;
