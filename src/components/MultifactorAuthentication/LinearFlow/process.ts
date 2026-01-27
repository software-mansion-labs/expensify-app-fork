/**
 * Main MFA process function.
 * Simple if/else flow - no abstractions.
 */
import {requestValidateCodeAction} from '@libs/actions/User';
import MultifactorAuthenticationChallenge from '@libs/MultifactorAuthentication/Biometrics/Challenge';
import {generateKeyPair} from '@libs/MultifactorAuthentication/Biometrics/ED25519';
import {processRegistration} from '@libs/MultifactorAuthentication/Biometrics/helpers';
import {PrivateKeyStore, PublicKeyStore} from '@libs/MultifactorAuthentication/Biometrics/KeyStore';
import Navigation from '@navigation/Navigation';
import {requestAuthenticationChallenge} from '@userActions/MultifactorAuthentication';
import CONST from '@src/CONST';
import type {Route} from '@src/ROUTES';
import ROUTES from '@src/ROUTES';
import {MULTIFACTOR_AUTHENTICATION_SCENARIO_CONFIG} from '../config';
import type {AllMultifactorAuthenticationOutcomeType, MultifactorAuthenticationScenario} from '../config/types';
import {doesDeviceSupportBiometrics, getOutcomePath, resetKeys} from '../helpers';
import type {AuthorizationResult, MfaState, RegistrationResult} from './types';

// ============================================================
// NAVIGATION HELPERS
// ============================================================

/**
 * Navigate only if not already on the target route (matches original behavior)
 */
function navigateIfNotActive(route: Route | string) {
    if (!Navigation.isActiveRoute(route as Route)) {
        Navigation.navigate(route as Route);
    }
}

// ============================================================
// MAIN PROCESS FUNCTION
// ============================================================

async function process(state: MfaState, accountID: number, translate: (key: string) => string, setState: (updates: Partial<MfaState>) => void): Promise<void> {
    const {scenario} = state;
    if (!scenario) return;

    // ERROR - navigate to failure
    if (state.error) {
        navigateToFailure(scenario, state.outcomePaths?.failureOutcome);
        setState({isComplete: true, success: false});
        return;
    }

    // DEVICE CHECK
    if (!state.deviceSupported) {
        navigateToNoEligibleMethods(scenario, state.outcomePaths?.failureOutcome);
        setState({isComplete: true, success: false, error: {reason: 'NO_ELIGIBLE_METHODS'}});
        return;
    }

    // NOT REGISTERED - need to register first
    if (!state.isRegistered) {
        // Need validate code first
        if (state.validateCode === undefined) {
            requestValidateCodeAction();
            navigateIfNotActive(ROUTES.MULTIFACTOR_AUTHENTICATION_MAGIC_CODE);
            return;
        }

        // Need soft prompt acceptance
        if (state.softPromptAccepted === undefined) {
            navigateIfNotActive(ROUTES.MULTIFACTOR_AUTHENTICATION_PROMPT.getRoute('enable-biometrics'));
            return;
        }

        // User declined
        if (state.softPromptAccepted === false) {
            navigateToFailure(scenario, state.outcomePaths?.failureOutcome);
            setState({isComplete: true, success: false, error: {reason: 'USER_DECLINED'}});
            return;
        }

        // Register biometrics
        const nativePromptTitle = translate(MULTIFACTOR_AUTHENTICATION_SCENARIO_CONFIG[scenario].nativePromptTitle);
        const regResult = await registerBiometrics(accountID, state.validateCode, nativePromptTitle);

        if (!regResult.success) {
            navigateToFailure(scenario, state.outcomePaths?.failureOutcome);
            setState({isComplete: true, success: false, error: regResult.error});
            return;
        }

        // Update state - now registered
        setState({isRegistered: true, scenarioType: CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO_TYPE.AUTHENTICATION});

        // Continue to authorization with chained private key
        const authResult = await authorize(accountID, scenario, state.params ?? {}, nativePromptTitle, regResult.privateKey);

        if (!authResult.success) {
            navigateToFailure(scenario, state.outcomePaths?.failureOutcome);
            setState({isComplete: true, success: false, error: authResult.error});
            return;
        }

        navigateToSuccess(scenario, state.outcomePaths?.successOutcome);
        setState({isComplete: true, success: true, scenarioType: CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO_TYPE.AUTHORIZATION});
        return;
    }

    // ALREADY REGISTERED - just authorize
    const nativePromptTitle = translate(MULTIFACTOR_AUTHENTICATION_SCENARIO_CONFIG[scenario].nativePromptTitle);
    const authResult = await authorize(accountID, scenario, state.params ?? {}, nativePromptTitle);

    if (!authResult.success) {
        // If key mismatch, reset and require re-registration
        if (authResult.error?.reason === CONST.MULTIFACTOR_AUTHENTICATION.REASON.KEYSTORE.REGISTRATION_REQUIRED) {
            await resetKeys(accountID);
            setState({isRegistered: false});
            // Recursively re-run process with updated state
            await process({...state, isRegistered: false}, accountID, translate, setState);
            return;
        }

        navigateToFailure(scenario, state.outcomePaths?.failureOutcome);
        setState({isComplete: true, success: false, error: authResult.error});
        return;
    }

    navigateToSuccess(scenario, state.outcomePaths?.successOutcome);
    setState({isComplete: true, success: true, scenarioType: CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO_TYPE.AUTHORIZATION});
}

// ============================================================
// NAVIGATION
// ============================================================

function navigateToSuccess(scenario: MultifactorAuthenticationScenario, customPath?: AllMultifactorAuthenticationOutcomeType) {
    if (customPath) {
        const route = ROUTES.MULTIFACTOR_AUTHENTICATION_OUTCOME.getRoute(customPath);
        navigateIfNotActive(route);
        return;
    }
    const scenarioLowerCase = scenario.toLowerCase() as Lowercase<MultifactorAuthenticationScenario>;
    const path = getOutcomePath(scenarioLowerCase, 'success');
    const route = ROUTES.MULTIFACTOR_AUTHENTICATION_OUTCOME.getRoute(path);
    navigateIfNotActive(route);
}

function navigateToFailure(scenario: MultifactorAuthenticationScenario, customPath?: AllMultifactorAuthenticationOutcomeType) {
    if (customPath) {
        const route = ROUTES.MULTIFACTOR_AUTHENTICATION_OUTCOME.getRoute(customPath);
        navigateIfNotActive(route);
        return;
    }
    const scenarioLowerCase = scenario.toLowerCase() as Lowercase<MultifactorAuthenticationScenario>;
    const path = getOutcomePath(scenarioLowerCase, 'failure');
    const route = ROUTES.MULTIFACTOR_AUTHENTICATION_OUTCOME.getRoute(path);
    navigateIfNotActive(route);
}

function navigateToNoEligibleMethods(scenario: MultifactorAuthenticationScenario, customPath?: AllMultifactorAuthenticationOutcomeType) {
    if (customPath) {
        const route = ROUTES.MULTIFACTOR_AUTHENTICATION_OUTCOME.getRoute(customPath);
        navigateIfNotActive(route);
        return;
    }
    const scenarioLowerCase = scenario.toLowerCase() as Lowercase<MultifactorAuthenticationScenario>;
    const path = getOutcomePath(scenarioLowerCase, 'no-eligible-methods');
    const route = ROUTES.MULTIFACTOR_AUTHENTICATION_OUTCOME.getRoute(path);
    navigateIfNotActive(route);
}

// ============================================================
// REGISTRATION
// ============================================================

async function registerBiometrics(accountID: number, validateCode: number, nativePromptTitle: string): Promise<RegistrationResult> {
    const {privateKey, publicKey} = generateKeyPair();

    // Store private key (triggers biometric prompt)
    const privateKeyResult = await PrivateKeyStore.set(accountID, privateKey, {nativePromptTitle});
    if (!privateKeyResult.value) {
        if (privateKeyResult.reason === CONST.MULTIFACTOR_AUTHENTICATION.REASON.EXPO.KEY_EXISTS) {
            await PrivateKeyStore.delete(accountID);
        }
        return {success: false, error: {reason: privateKeyResult.reason ?? 'PRIVATE_KEY_ERROR'}};
    }

    // Store public key
    const publicKeyResult = await PublicKeyStore.set(accountID, publicKey);
    if (!publicKeyResult.value) {
        return {success: false, error: {reason: publicKeyResult.reason ?? 'PUBLIC_KEY_ERROR'}};
    }

    // Register with backend
    const result = await processRegistration({publicKey, validateCode});
    if (!result.step.wasRecentStepSuccessful || !result.step.isRequestFulfilled) {
        await resetKeys(accountID);
        return {success: false, error: {reason: result.reason}};
    }

    return {success: true, privateKey};
}

// ============================================================
// AUTHORIZATION
// ============================================================

async function authorize(accountID: number, scenario: string, params: object, nativePromptTitle: string, chainedPrivateKey?: string): Promise<AuthorizationResult> {
    const challenge = new MultifactorAuthenticationChallenge(scenario as never, params as never, {nativePromptTitle});

    // Request challenge
    const requestResult = await challenge.request();
    if (!requestResult.value) {
        return {success: false, error: {reason: requestResult.reason ?? 'CHALLENGE_REQUEST_ERROR'}};
    }

    // Sign challenge
    const chainedStatus = chainedPrivateKey ? {value: chainedPrivateKey, reason: CONST.MULTIFACTOR_AUTHENTICATION.REASON.KEYSTORE.KEY_RETRIEVED, type: undefined} : undefined;

    const signResult = await challenge.sign(accountID, chainedStatus);
    if (!signResult.value) {
        return {success: false, error: {reason: signResult.reason ?? 'SIGN_ERROR'}};
    }

    // Send signed challenge
    const sendResult = await challenge.send();
    if (!sendResult.value) {
        return {success: false, error: {reason: sendResult.reason ?? 'SEND_ERROR'}};
    }

    return {success: true};
}

// ============================================================
// STATE INITIALIZATION
// ============================================================

async function createInitialState(accountID: number, scenario: string, params?: object): Promise<MfaState> {
    const deviceSupported = doesDeviceSupportBiometrics();

    // Check registration status
    const {value: localPublicKey} = await PublicKeyStore.get(accountID);
    const {publicKeys: authPublicKeys = []} = await requestAuthenticationChallenge();
    const isRegistered = !!localPublicKey && authPublicKeys.includes(localPublicKey);

    // Handle key mismatch - reset keys if local key not in auth
    if (localPublicKey && !isRegistered) {
        await resetKeys(accountID);
    }

    return {
        scenario: scenario as never,
        params: params as never,
        deviceSupported,
        isRegistered,
        validateCode: undefined,
        softPromptAccepted: undefined,
        isComplete: false,
        success: undefined,
        error: undefined,
        outcomePaths: undefined,
        reason: undefined,
        type: undefined,
        scenarioType: undefined,
    };
}

export {process, createInitialState};
