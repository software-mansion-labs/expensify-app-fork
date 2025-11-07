import React from 'react';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';
import Animations, {InternalPlatformAnimations} from '@libs/Navigation/PlatformStackNavigation/navigationOptions/animation';
import type {PublicScreensParamList} from '@navigation/types';
import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';
import defaultScreenOptions from './defaultScreenOptions';
import lazyWithSuspense from './lazyWithSuspense';
import PublicRightModalNavigator from './Navigators/PublicRightModalNavigator';
import TestToolsModalNavigator from './Navigators/TestToolsModalNavigator';
import useRootNavigatorScreenOptions from './useRootNavigatorScreenOptions';

const ConnectionCompletePage = lazyWithSuspense(() => import('@pages/ConnectionCompletePage'));
const LogInWithShortLivedAuthTokenPage = lazyWithSuspense(() => import('@pages/LogInWithShortLivedAuthTokenPage'));
const AppleSignInDesktopPage = lazyWithSuspense(() => import('@pages/signin/AppleSignInDesktopPage'));
const GoogleSignInDesktopPage = lazyWithSuspense(() => import('@pages/signin/GoogleSignInDesktopPage'));
const SAMLSignInPage = lazyWithSuspense(() => import('@pages/signin/SAMLSignInPage'));
const SignInPage = lazyWithSuspense(() => import('@pages/signin/SignInPage'));
const UnlinkLoginPage = lazyWithSuspense(() => import('@pages/UnlinkLoginPage'));
const ValidateLoginPage = lazyWithSuspense(() => import('@pages/ValidateLoginPage'));

const RootStack = createPlatformStackNavigator<PublicScreensParamList>();

function PublicScreens() {
    const rootNavigatorScreenOptions = useRootNavigatorScreenOptions();
    const theme = useTheme();
    const StyleUtils = useStyleUtils();
    return (
        <RootStack.Navigator screenOptions={defaultScreenOptions}>
            {/* The structure for the HOME route has to be the same in public and auth screens. That's why the name for SignInPage is REPORTS_SPLIT_NAVIGATOR. */}
            <RootStack.Screen
                name={NAVIGATORS.REPORTS_SPLIT_NAVIGATOR}
                options={{
                    ...defaultScreenOptions,
                    // If you want to change this, make sure there aren't any animation bugs when signing out.
                    // This was put here to prevent excessive animations when resetting the navigation state in `resetNavigationState`
                    animation: Animations.NONE,
                }}
                component={SignInPage}
            />
            <RootStack.Screen
                name={SCREENS.TRANSITION_BETWEEN_APPS}
                component={LogInWithShortLivedAuthTokenPage}
            />
            <RootStack.Screen
                name={SCREENS.VALIDATE_LOGIN}
                options={defaultScreenOptions}
                component={ValidateLoginPage}
            />
            <RootStack.Screen
                name={SCREENS.CONNECTION_COMPLETE}
                component={ConnectionCompletePage}
            />
            <RootStack.Screen
                name={SCREENS.BANK_CONNECTION_COMPLETE}
                component={ConnectionCompletePage}
            />
            <RootStack.Screen
                name={SCREENS.UNLINK_LOGIN}
                component={UnlinkLoginPage}
            />
            <RootStack.Screen
                name={SCREENS.SIGN_IN_WITH_APPLE_DESKTOP}
                component={AppleSignInDesktopPage}
            />
            <RootStack.Screen
                name={SCREENS.SIGN_IN_WITH_GOOGLE_DESKTOP}
                component={GoogleSignInDesktopPage}
            />
            <RootStack.Screen
                name={SCREENS.SAML_SIGN_IN}
                component={SAMLSignInPage}
            />
            <RootStack.Screen
                name={NAVIGATORS.PUBLIC_RIGHT_MODAL_NAVIGATOR}
                component={PublicRightModalNavigator}
                options={rootNavigatorScreenOptions.rightModalNavigator}
            />
            <RootStack.Screen
                name={NAVIGATORS.TEST_TOOLS_MODAL_NAVIGATOR}
                options={{
                    ...rootNavigatorScreenOptions.basicModalNavigator,
                    native: {
                        contentStyle: {
                            ...StyleUtils.getBackgroundColorWithOpacityStyle(theme.overlay, 0.72),
                        },
                        animation: InternalPlatformAnimations.FADE,
                    },
                    web: {
                        cardStyle: {
                            ...StyleUtils.getBackgroundColorWithOpacityStyle(theme.overlay, 0.72),
                        },
                        animation: InternalPlatformAnimations.FADE,
                    },
                }}
                component={TestToolsModalNavigator}
            />
        </RootStack.Navigator>
    );
}

PublicScreens.displayName = 'PublicScreens';

export default PublicScreens;
