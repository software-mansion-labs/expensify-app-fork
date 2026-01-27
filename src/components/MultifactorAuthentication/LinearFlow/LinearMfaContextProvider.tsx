/**
 * Linear MFA Context Provider.
 * Same API as original MultifactorAuthenticationContextProvider.
 */
import React, {createContext, useCallback, useContext, useEffect, useMemo} from 'react';
import type {ReactNode} from 'react';
import type {MultifactorAuthenticationTrigger} from '@libs/MultifactorAuthentication/Biometrics/types';
import Navigation from '@navigation/Navigation';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type {MultifactorAuthenticationScenario, MultifactorAuthenticationScenarioParams} from '../config/types';
import {isOnProtectedRoute} from '../helpers';
import type {MultifactorTriggerArgument, OutcomePaths} from '../types';
import type {MfaState} from './types';
import useMfaLinearFlow from './useMfaLinearFlow';

type ContextValue = {
    info: {
        isLocalPublicKeyInAuth: boolean;
        isAnyDeviceRegistered: boolean;
        isBiometryRegisteredLocally: boolean;
        deviceSupportBiometrics: boolean;
        description: string;
        title: string;
        headerTitle: string;
        success: boolean | undefined;
        scenario: MultifactorAuthenticationScenario | undefined;
    };
    proceed: <T extends MultifactorAuthenticationScenario>(scenario: T, params?: MultifactorAuthenticationScenarioParams<T> & Partial<OutcomePaths>) => Promise<MfaState>;
    update: (params: {validateCode?: number; softPromptDecision?: boolean}) => Promise<MfaState>;
    trigger: <T extends MultifactorAuthenticationTrigger>(triggerType: T, argument?: MultifactorTriggerArgument<T>) => Promise<MfaState>;
};

const LinearMfaContext = createContext<ContextValue | null>(null);

function LinearMfaContextProvider({children}: {children: ReactNode}) {
    const flow = useMfaLinearFlow();

    // Redirect if on protected route without active scenario (matches original behavior)
    useEffect(() => {
        Navigation.isNavigationReady().then(() => {
            if (!flow.state.scenario && isOnProtectedRoute()) {
                Navigation.navigate(ROUTES.MULTIFACTOR_AUTHENTICATION_NOT_FOUND, {forceReplace: true});
            }
        });
    }, [flow.state.scenario]);

    const proceed = useCallback(
        async <T extends MultifactorAuthenticationScenario>(scenario: T, params?: MultifactorAuthenticationScenarioParams<T> & Partial<OutcomePaths>) => {
            return flow.start(scenario, params);
        },
        [flow],
    );

    const update = useCallback(
        async (params: {validateCode?: number; softPromptDecision?: boolean}) => {
            // Only include defined values to avoid overwriting existing state with undefined
            const data: {validateCode?: number; softPromptAccepted?: boolean} = {};
            if (params.validateCode !== undefined) {
                data.validateCode = params.validateCode;
            }
            if (params.softPromptDecision !== undefined) {
                data.softPromptAccepted = params.softPromptDecision;
            }
            return flow.continueFlow(data);
        },
        [flow],
    );

    const trigger = useCallback(
        async <T extends MultifactorAuthenticationTrigger>(triggerType: T, argument?: MultifactorTriggerArgument<T>) => {
            // Pass argument to flow.trigger (now supports arguments like original)
            return flow.trigger(triggerType, argument as never);
        },
        [flow],
    );

    const value: ContextValue = useMemo(() => ({info: flow.info, proceed, update, trigger}), [flow.info, proceed, update, trigger]);

    return <LinearMfaContext.Provider value={value}>{children}</LinearMfaContext.Provider>;
}

function useLinearMfaContext(): ContextValue {
    const context = useContext(LinearMfaContext);
    if (!context) {
        throw new Error('useLinearMfaContext must be used within LinearMfaContextProvider');
    }
    return context;
}

LinearMfaContextProvider.displayName = 'LinearMfaContextProvider';

export default LinearMfaContextProvider;
export {useLinearMfaContext};
