/**
 * Simple types for linear MFA flow.
 */
import type {MultifactorAuthenticationMethodCode, MultifactorAuthenticationReason} from '@libs/MultifactorAuthentication/Biometrics/types';
import type {AllMultifactorAuthenticationOutcomeType, MultifactorAuthenticationScenario, MultifactorAuthenticationScenarioParams} from '../config/types';
import type {MultifactorAuthenticationStatusKeyType, OutcomePaths} from '../types';

/** Error information */
type MfaError = {
    reason: string;
    message?: string;
};

/** Main state - contains actual data, not navigation metadata */
type MfaState = {
    // Error
    error?: MfaError;

    // Scenario
    scenario?: MultifactorAuthenticationScenario;
    params?: MultifactorAuthenticationScenarioParams<MultifactorAuthenticationScenario>;

    // Device
    deviceSupported: boolean;

    // Registration
    isRegistered: boolean;
    validateCode?: number;
    softPromptAccepted?: boolean;

    // Result
    isComplete: boolean;
    success?: boolean;

    // For API compatibility with original context
    outcomePaths?: OutcomePaths;
    reason?: MultifactorAuthenticationReason;
    type?: MultifactorAuthenticationMethodCode;
    scenarioType?: MultifactorAuthenticationStatusKeyType;
};

/** Trigger argument type - matches original */
type TriggerArgument = AllMultifactorAuthenticationOutcomeType | MultifactorAuthenticationScenario | undefined;

/** Result of registration */
type RegistrationResult = {
    success: boolean;
    privateKey?: string;
    error?: MfaError;
};

/** Result of authorization */
type AuthorizationResult = {
    success: boolean;
    error?: MfaError;
};

export type {MfaError, MfaState, RegistrationResult, AuthorizationResult, TriggerArgument};
