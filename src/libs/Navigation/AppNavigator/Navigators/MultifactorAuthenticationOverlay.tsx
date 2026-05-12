import {BaseNavigationContainer, NavigationIndependentTree} from '@react-navigation/core';
import {DarkTheme, DefaultTheme} from '@react-navigation/native';
import {CardStyleInterpolators} from '@react-navigation/stack';
import type {StackCardInterpolationProps} from '@react-navigation/stack';
import React, {useEffect, useState} from 'react';
import {BackHandler, StyleSheet, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {useMultifactorAuthentication, useMultifactorAuthenticationActions, useMultifactorAuthenticationState} from '@components/MultifactorAuthentication/Context';
import type {MfaOverlayInternalParamList} from '@components/MultifactorAuthentication/mfaNavigation';
import {applyPendingNavigation, clearPendingNavigation, INITIAL_SCREEN, mfaNavigationRef} from '@components/MultifactorAuthentication/mfaNavigation';
import PressableWithoutFeedback from '@components/Pressable/PressableWithoutFeedback';
import useLocalize from '@hooks/useLocalize';
import usePrevious from '@hooks/usePrevious';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useRootNavigationState from '@hooks/useRootNavigationState';
import useTheme from '@hooks/useTheme';
import useThemePreference from '@hooks/useThemePreference';
import useThemeStyles from '@hooks/useThemeStyles';
import {isSafari} from '@libs/Browser';
import Navigation from '@libs/Navigation/Navigation';
import navigationRef from '@libs/Navigation/navigationRef';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';
import Animations from '@libs/Navigation/PlatformStackNavigation/navigationOptions/animation';
import Presentation from '@libs/Navigation/PlatformStackNavigation/navigationOptions/presentation';
import useModalCardStyleInterpolator from '@navigation/AppNavigator/useModalCardStyleInterpolator';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import SCREENS from '@src/SCREENS';
import type ReactComponentModule from '@src/types/utils/ReactComponentModule';

const Stack = createPlatformStackNavigator<MfaOverlayInternalParamList>();

const loadValidateCodePage = () => require<ReactComponentModule>('../../../../pages/MultifactorAuthentication/ValidateCodePage').default;
const loadOutcomePage = () => require<ReactComponentModule>('../../../../pages/MultifactorAuthentication/OutcomePage').default;
const loadPromptPage = () => require<ReactComponentModule>('../../../../pages/MultifactorAuthentication/PromptPage').default;

// Placeholder rendered as the initial route. onLayout triggers the deferred
// push so the card-style interpolator has a measured width for the slide.
function TransparentScreen() {
    return (
        <View
            style={StyleSheet.absoluteFill}
            onLayout={applyPendingNavigation}
        />
    );
}

TransparentScreen.displayName = 'TransparentScreen';

function MultifactorAuthenticationOverlay() {
    const state = useMultifactorAuthenticationState();
    const {cancel} = useMultifactorAuthentication();
    const {dispatch} = useMultifactorAuthenticationActions();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const theme = useTheme();
    const themePreference = useThemePreference();
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    const {isModalOpen} = state;
    const [prevIsModalOpen, setPrevIsModalOpen] = useState(isModalOpen);
    const [isClosing, setIsClosing] = useState(false);
    const progress = useSharedValue(0);
    const modalCardStyleInterpolator = useModalCardStyleInterpolator();
    // Subscribe to the root navigator's history so we can detect the MFA marker
    // being popped (= browser/mWeb back), which is our cue to close the overlay.
    // useRootNavigationState reads via navigationRef so this works regardless of
    // where the overlay is mounted in the tree (it sits outside any navigator screen).
    const lastHistoryEntry = useRootNavigationState((rootState) => rootState?.history?.at(-1));
    const prevLastHistoryEntry = usePrevious(lastHistoryEntry);

    // Mirror isModalOpen transitions during render so the slide-out animation can
    // outlast isModalOpen=false. Cleared by the close-animation completion callback.
    if (prevIsModalOpen !== isModalOpen) {
        setPrevIsModalOpen(isModalOpen);
        setIsClosing(!isModalOpen);
    }

    const isVisible = isModalOpen || isClosing;

    const navigationThemeBase = themePreference === CONST.THEME.DARK ? DarkTheme : DefaultTheme;
    const navigationTheme = {
        ...navigationThemeBase,
        colors: {
            ...navigationThemeBase.colors,
            background: shouldUseNarrowLayout ? theme.appBG : 'transparent',
        },
    };

    useEffect(() => {
        if (isModalOpen) {
            progress.set(withTiming(1, {duration: CONST.ANIMATED_TRANSITION}));
            return;
        }
        if (!isClosing) {
            return;
        }
        // Pop the current screen so the Stack plays its slide-out animation,
        // and fade the backdrop simultaneously. Both run for ANIMATED_TRANSITION.
        if (mfaNavigationRef.isReady() && mfaNavigationRef.canGoBack()) {
            mfaNavigationRef.goBack();
        }
        progress.set(withTiming(0, {duration: CONST.ANIMATED_TRANSITION}));
        const cleanupTimer = setTimeout(() => {
            clearPendingNavigation();
            setIsClosing(false);
            dispatch({type: 'RESET'});
        }, CONST.ANIMATED_TRANSITION);
        return () => clearTimeout(cleanupTimer);
    }, [isModalOpen, isClosing, progress, dispatch]);

    // The overlay lives in its own independent navigation tree and is excluded from
    // the linking config, so React Navigation does not bind browser/Android back to
    // it directly. Instead, we mirror open/close into the root navigator's
    // state.history via a CUSTOM_HISTORY_ENTRY_MFA_OVERLAY marker — useLinking
    // pushes/pops a synthetic browser history entry to match, giving us proper
    // browser/mWeb back integration. BackHandler covers native Android (no browser
    // history). The history observer effect below maps the marker being popped to
    // a CLOSE_MODAL dispatch.
    useEffect(() => {
        if (!isModalOpen) {
            return;
        }

        const backHandlerSub = BackHandler.addEventListener('hardwareBackPress', () => {
            dispatch({type: 'CLOSE_MODAL'});
            return true;
        });

        Navigation.isNavigationReady().then(() => {
            navigationRef.dispatch({
                type: CONST.NAVIGATION.ACTION_TYPE.TOGGLE_MFA_OVERLAY_WITH_HISTORY,
                payload: {isVisible: true},
            });
        });

        return () => {
            backHandlerSub.remove();
            Navigation.isNavigationReady().then(() => {
                navigationRef.dispatch({
                    type: CONST.NAVIGATION.ACTION_TYPE.TOGGLE_MFA_OVERLAY_WITH_HISTORY,
                    payload: {isVisible: false},
                });
            });
        };
    }, [isModalOpen, dispatch]);

    // Marker popped while open → user pressed browser/Android back → close. Guarded
    // by isModalOpen so our own toggle(false) on close doesn't re-trigger CLOSE_MODAL.
    //
    // We intentionally do NOT react to the rising edge (marker reappearing via
    // browser forward into a cancelled overlay): MFA is transactional, so we don't
    // re-open; and dispatching toggle(false) to strip the marker would make
    // useLinking history.back() the browser, which re-enables the forward button
    // and lets the user oscillate forever. Leaving the marker stale means the
    // forward press is consumed (browser at N+1, no further forward), and the
    // next executeScenario reuses the marker via the idempotent toggle handler.
    useEffect(() => {
        if (!isModalOpen) {
            return;
        }
        const wasMfaMarker = prevLastHistoryEntry === CONST.NAVIGATION.CUSTOM_HISTORY_ENTRY_MFA_OVERLAY;
        const isMfaMarker = lastHistoryEntry === CONST.NAVIGATION.CUSTOM_HISTORY_ENTRY_MFA_OVERLAY;
        if (wasMfaMarker && !isMfaMarker) {
            dispatch({type: 'CLOSE_MODAL'});
        }
    }, [isModalOpen, lastHistoryEntry, prevLastHistoryEntry, dispatch]);

    const backdropAnimatedStyle = useAnimatedStyle(() => ({
        opacity: progress.get() * variables.overlayOpacity,
    }));

    if (!isVisible) {
        return null;
    }

    return (
        <View
            style={[StyleSheet.absoluteFill, styles.mfaOverlayRoot]}
            pointerEvents="box-none"
        >
            {!shouldUseNarrowLayout && (
                <Animated.View style={[StyleSheet.absoluteFill, styles.overlayBackground, backdropAnimatedStyle]}>
                    <PressableWithoutFeedback
                        sentryLabel={CONST.SENTRY_LABEL.MFA_OVERLAY.BACKDROP}
                        style={StyleSheet.absoluteFill}
                        onPress={cancel}
                        accessibilityLabel={translate('common.close')}
                        role={CONST.ROLE.BUTTON}
                        tabIndex={-1}
                    />
                </Animated.View>
            )}
            <View style={[styles.pAbsolute, styles.r0, styles.h100, styles.overflowHidden, shouldUseNarrowLayout ? styles.w100 : {width: variables.sideBarWidth}]}>
                <NavigationIndependentTree>
                    <BaseNavigationContainer
                        ref={mfaNavigationRef}
                        theme={navigationTheme}
                    >
                        <Stack.Navigator
                            screenOptions={{
                                headerShown: false,
                                animationTypeForReplace: 'push',
                                animation: Animations.SLIDE_FROM_RIGHT,
                                gestureEnabled: false,
                                native: {contentStyle: styles.navigationScreenCardStyle},
                                web: {
                                    presentation: Presentation.TRANSPARENT_MODAL,
                                    cardOverlayEnabled: false,
                                    cardStyle: styles.navigationScreenCardStyle,
                                    // forHorizontalIOS from @react-navigation misbehaves on Safari (same reason as RHP — see useRHPScreenOptions),
                                    // so we fall back to the Expensify modal interpolator there.
                                    cardStyleInterpolator: isSafari() ? (props: StackCardInterpolationProps) => modalCardStyleInterpolator({props}) : CardStyleInterpolators.forHorizontalIOS,
                                },
                            }}
                        >
                            <Stack.Screen
                                name={INITIAL_SCREEN}
                                component={TransparentScreen}
                                options={{
                                    animation: Animations.NONE,
                                    native: {contentStyle: {backgroundColor: 'transparent'}},
                                    web: {cardStyle: {backgroundColor: 'transparent'}},
                                }}
                            />
                            <Stack.Screen
                                name={SCREENS.MULTIFACTOR_AUTHENTICATION.MAGIC_CODE}
                                getComponent={loadValidateCodePage}
                            />
                            <Stack.Screen
                                name={SCREENS.MULTIFACTOR_AUTHENTICATION.PROMPT}
                                getComponent={loadPromptPage}
                            />
                            <Stack.Screen
                                name={SCREENS.MULTIFACTOR_AUTHENTICATION.OUTCOME_SUCCESS}
                                getComponent={loadOutcomePage}
                            />
                            <Stack.Screen
                                name={SCREENS.MULTIFACTOR_AUTHENTICATION.OUTCOME_FAILURE}
                                getComponent={loadOutcomePage}
                            />
                        </Stack.Navigator>
                    </BaseNavigationContainer>
                </NavigationIndependentTree>
            </View>
        </View>
    );
}

MultifactorAuthenticationOverlay.displayName = 'MultifactorAuthenticationOverlay';

export default MultifactorAuthenticationOverlay;
