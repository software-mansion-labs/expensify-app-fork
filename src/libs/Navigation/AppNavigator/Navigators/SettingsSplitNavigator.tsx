import {useRoute} from '@react-navigation/native';
import React from 'react';
import {View} from 'react-native';
import FocusTrapForScreens from '@components/FocusTrap/FocusTrapForScreen';
import createSplitNavigator from '@libs/Navigation/AppNavigator/createSplitNavigator';
import usePreloadFullScreenNavigators from '@libs/Navigation/AppNavigator/usePreloadFullScreenNavigators';
import useSplitNavigatorScreenOptions from '@libs/Navigation/AppNavigator/useSplitNavigatorScreenOptions';
import type {SettingsSplitNavigatorParamList} from '@libs/Navigation/types';
import SCREENS from '@src/SCREENS';
import lazyWithSuspense from '../lazyWithSuspense';

const InitialSettingsPage = lazyWithSuspense(() => import('../../../../pages/settings/InitialSettingsPage'));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Screens = Partial<Record<keyof SettingsSplitNavigatorParamList, React.ComponentType<any>>>;

const CENTRAL_PANE_SETTINGS_SCREENS = {
    [SCREENS.SETTINGS.PREFERENCES.ROOT]: lazyWithSuspense(() => import('../../../../pages/settings/Preferences/PreferencesPage')),
    [SCREENS.SETTINGS.SECURITY]: lazyWithSuspense(() => import('../../../../pages/settings/Security/SecuritySettingsPage')),
    [SCREENS.SETTINGS.PROFILE.ROOT]: lazyWithSuspense(() => import('../../../../pages/settings/Profile/ProfilePage')),
    [SCREENS.SETTINGS.WALLET.ROOT]: lazyWithSuspense(() => import('../../../../pages/settings/Wallet/WalletPage')),
    [SCREENS.SETTINGS.ABOUT]: lazyWithSuspense(() => import('../../../../pages/settings/AboutPage/AboutPage')),
    [SCREENS.SETTINGS.TROUBLESHOOT]: lazyWithSuspense(() => import('../../../../pages/settings/Troubleshoot/TroubleshootPage')),
    [SCREENS.SETTINGS.SAVE_THE_WORLD]: lazyWithSuspense(() => import('../../../../pages/TeachersUnite/SaveTheWorldPage')),
    [SCREENS.SETTINGS.SUBSCRIPTION.ROOT]: lazyWithSuspense(() => import('../../../../pages/settings/Subscription/SubscriptionSettingsPage')),
} satisfies Screens;

const Split = createSplitNavigator<SettingsSplitNavigatorParamList>();

function SettingsSplitNavigator() {
    const route = useRoute();
    const splitNavigatorScreenOptions = useSplitNavigatorScreenOptions();

    // This hook preloads the screens of adjacent tabs to make changing tabs faster.
    usePreloadFullScreenNavigators();

    return (
        <FocusTrapForScreens>
            <View style={{flex: 1}}>
                <Split.Navigator
                    persistentScreens={[SCREENS.SETTINGS.ROOT]}
                    sidebarScreen={SCREENS.SETTINGS.ROOT}
                    defaultCentralScreen={SCREENS.SETTINGS.PROFILE.ROOT}
                    parentRoute={route}
                    screenOptions={splitNavigatorScreenOptions.centralScreen}
                >
                    <Split.Screen
                        name={SCREENS.SETTINGS.ROOT}
                        component={InitialSettingsPage}
                        options={splitNavigatorScreenOptions.sidebarScreen}
                    />
                    {Object.entries(CENTRAL_PANE_SETTINGS_SCREENS).map(([screenName, Component]) => {
                        return (
                            <Split.Screen
                                key={screenName}
                                name={screenName as keyof Screens}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                component={Component as React.ComponentType<any>}
                            />
                        );
                    })}
                </Split.Navigator>
            </View>
        </FocusTrapForScreens>
    );
}

SettingsSplitNavigator.displayName = 'SettingsSplitNavigator';

export {CENTRAL_PANE_SETTINGS_SCREENS};
export default SettingsSplitNavigator;
