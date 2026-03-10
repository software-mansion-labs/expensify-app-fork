import {BaseNavigationContainer, NavigationIndependentTree} from '@react-navigation/core';
import {DefaultTheme} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import React, {useState} from 'react';
import {View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import Modal from '@components/Modal';
import {useMultifactorAuthenticationActions, useMultifactorAuthenticationState} from '@components/MultifactorAuthentication/Context/State';
import ScreenWrapperContainer from '@components/ScreenWrapper/ScreenWrapperContainer';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import type {MultifactorAuthenticationParamList} from '@navigation/types';
import CONST from '@src/CONST';
import SCREENS from '@src/SCREENS';
import type ReactComponentModule from '@src/types/utils/ReactComponentModule';

const Stack = createStackNavigator<MultifactorAuthenticationParamList>();

const loadValidateCodePage = () => require<ReactComponentModule>('../../../../pages/MultifactorAuthentication/ValidateCodePage').default;
const loadOutcomePage = () => require<ReactComponentModule>('../../../../pages/MultifactorAuthentication/OutcomePage').default;
const loadPromptPage = () => require<ReactComponentModule>('../../../../pages/MultifactorAuthentication/PromptPage').default;
const loadAuthorizeTransactionPage = () => require<ReactComponentModule>('../../../../pages/MultifactorAuthentication/AuthorizeTransactionPage').default;
const loadErrorPage = () => require<ReactComponentModule>('../../../../pages/ErrorPage/NotFoundPage').default;

function MultifactorAuthenticationOverlay() {
    const state = useMultifactorAuthenticationState();
    const {dispatch} = useMultifactorAuthenticationActions();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const styles = useThemeStyles();

    // Track the screen/params to render. Persists during the Modal close animation
    // so content stays visible while the panel slides out.
    // Uses the React-recommended "adjusting state during render" pattern to synchronously
    // capture new screen values without a render-frame delay.
    // See: https://react.dev/reference/react/useState#storing-information-from-previous-renders
    const [renderScreen, setRenderScreen] = useState(state.activeScreen);
    const [renderParams, setRenderParams] = useState(state.activeParams);

    if (state.activeScreen !== undefined && state.activeScreen !== renderScreen) {
        setRenderScreen(state.activeScreen);
        setRenderParams(state.activeParams);
    }

    // Nothing has ever been shown — skip rendering entirely
    if (renderScreen === undefined) {
        return null;
    }

    const isVisible = state.activeScreen !== undefined;

    const onClose = () => {
        dispatch({type: 'HIDE_OVERLAY'});
    };

    // Called after the Modal's close animation completes — fully unmount and reset state
    const onModalHide = () => {
        setRenderScreen(undefined);
        setRenderParams(undefined);
        dispatch({type: 'RESET'});
    };

    return (
        <Modal
            type={shouldUseNarrowLayout ? CONST.MODAL.MODAL_TYPE.CENTERED_SWIPEABLE_TO_RIGHT : CONST.MODAL.MODAL_TYPE.RIGHT_DOCKED}
            isVisible={isVisible}
            onClose={onClose}
            onModalHide={onModalHide}
            fullscreen
            shouldApplySidePanelOffset={!shouldUseNarrowLayout}
            enableEdgeToEdgeBottomSafeAreaPadding
        >
            <NavigationIndependentTree>
                <BaseNavigationContainer
                    key={renderScreen}
                    theme={DefaultTheme}
                >
                    <Stack.Navigator
                        screenOptions={{
                            headerShown: false,
                            animationEnabled: false,
                            gestureEnabled: false,
                        }}
                        initialRouteName={renderScreen as keyof MultifactorAuthenticationParamList}
                    >
                        <Stack.Screen
                            name={SCREENS.MULTIFACTOR_AUTHENTICATION.AUTHORIZE_TRANSACTION}
                            getComponent={loadAuthorizeTransactionPage}
                            initialParams={renderParams}
                        />
                        <Stack.Screen
                            name={SCREENS.MULTIFACTOR_AUTHENTICATION.MAGIC_CODE}
                            getComponent={loadValidateCodePage}
                        />
                        <Stack.Screen
                            name={SCREENS.MULTIFACTOR_AUTHENTICATION.PROMPT}
                            getComponent={loadPromptPage}
                            initialParams={renderParams}
                        />
                        <Stack.Screen
                            name={SCREENS.MULTIFACTOR_AUTHENTICATION.OUTCOME_SUCCESS}
                            getComponent={loadOutcomePage}
                        />
                        <Stack.Screen
                            name={SCREENS.MULTIFACTOR_AUTHENTICATION.OUTCOME_FAILURE}
                            getComponent={loadOutcomePage}
                        />
                        <Stack.Screen
                            name={SCREENS.MULTIFACTOR_AUTHENTICATION.NOT_FOUND}
                            getComponent={loadErrorPage}
                        />
                    </Stack.Navigator>
                </BaseNavigationContainer>
            </NavigationIndependentTree>
        </Modal>
    );
}

MultifactorAuthenticationOverlay.displayName = 'MultifactorAuthenticationOverlay';

export default MultifactorAuthenticationOverlay;
