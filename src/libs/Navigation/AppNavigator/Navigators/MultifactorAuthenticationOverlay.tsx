import {BaseNavigationContainer, NavigationIndependentTree} from '@react-navigation/core';
import {DefaultTheme} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import Modal from '@components/Modal';
import {useMultifactorAuthenticationActions, useMultifactorAuthenticationState} from '@components/MultifactorAuthentication/Context/State';
import {applyPendingNavigation, clearPendingNavigation, getPendingNavigation, mfaNavigationRef} from '@components/MultifactorAuthentication/mfaNavigation';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import type {MultifactorAuthenticationParamList} from '@navigation/types';
import CONST from '@src/CONST';
import SCREENS from '@src/SCREENS';
import type ReactComponentModule from '@src/types/utils/ReactComponentModule';

const Stack = createStackNavigator<MultifactorAuthenticationParamList>();

const loadValidateCodePage = () => require<ReactComponentModule>('../../../../pages/MultifactorAuthentication/ValidateCodePage').default;
const loadOutcomePage = () => require<ReactComponentModule>('../../../../pages/MultifactorAuthentication/OutcomePage').default;
const loadPromptPage = () => require<ReactComponentModule>('../../../../pages/MultifactorAuthentication/PromptPage').default;
const loadErrorPage = () => require<ReactComponentModule>('../../../../pages/ErrorPage/NotFoundPage').default;

function MultifactorAuthenticationOverlay() {
    const state = useMultifactorAuthenticationState();
    const {dispatch} = useMultifactorAuthenticationActions();
    const {shouldUseNarrowLayout} = useResponsiveLayout();

    if (!state.isOpen) {
        return null;
    }

    const pending = getPendingNavigation();
    const initialState = pending ? {routes: [{name: pending.screen as keyof MultifactorAuthenticationParamList, params: pending.params}]} : undefined;

    return (
        <Modal
            type={shouldUseNarrowLayout ? CONST.MODAL.MODAL_TYPE.CENTERED_SWIPEABLE_TO_RIGHT : CONST.MODAL.MODAL_TYPE.RIGHT_DOCKED}
            isVisible={state.isOpen}
            onClose={() => dispatch({type: 'HIDE_OVERLAY'})}
            onModalHide={() => {
                clearPendingNavigation();
                dispatch({type: 'RESET'});
            }}
            fullscreen
            shouldApplySidePanelOffset={!shouldUseNarrowLayout}
            enableEdgeToEdgeBottomSafeAreaPadding
        >
            <NavigationIndependentTree>
                <BaseNavigationContainer
                    ref={mfaNavigationRef}
                    theme={DefaultTheme}
                    onReady={applyPendingNavigation}
                    initialState={initialState}
                >
                    <Stack.Navigator
                        screenOptions={{
                            headerShown: false,
                            animation: 'none',
                        }}
                    >
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
