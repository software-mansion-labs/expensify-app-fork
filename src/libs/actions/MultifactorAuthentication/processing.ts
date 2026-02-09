import {MULTIFACTOR_AUTHENTICATION_SCENARIO_CONFIG} from '@components/MultifactorAuthentication/config';
import type {
    MultifactorAuthenticationProcessScenarioParameters,
    MultifactorAuthenticationScenario,
    MultifactorAuthenticationScenarioConfig,
} from '@components/MultifactorAuthentication/config/types';
import type {MarqetaAuthTypeName, MultifactorAuthenticationReason, RegistrationResponseInfo} from '@libs/MultifactorAuthentication/Biometrics/types';
import VALUES from '@libs/MultifactorAuthentication/Biometrics/VALUES';
import {registerAuthenticationKey} from './index';

type ProcessResult = {
    success: boolean;
    reason: MultifactorAuthenticationReason;
};

/**
 * Determines if an HTTP response code indicates success.
 * Checks if the status code is in the 2xx range.
 *
 * @param httpCode - The HTTP status code to check
 * @returns True if the code is in the 2xx range, false otherwise
 */
function isHttpSuccess(httpCode: number | undefined): boolean {
    return String(httpCode).startsWith('2');
}

type RegistrationParams = {
    registrationResponse: RegistrationResponseInfo;
    authenticationMethod: MarqetaAuthTypeName;
    challenge: string;
};

/**
 * Processes a registration request for both native biometrics (ED25519) and passkeys (WebAuthn).
 * The registrationResponse is already in the correct format for the backend - each platform's
 * hook is responsible for constructing it:
 * - Native: ED25519 keyInfo with publicKey and algorithm
 * - Web: WebAuthn registration response with attestationObject
 *
 * The backend distinguishes the format by the `type` field: 'public-key' (passkey) vs 'ed25519' (native biometrics).
 */
async function processRegistration(params: RegistrationParams): Promise<ProcessResult> {
    if (!params.challenge) {
        return {
            success: false,
            reason: VALUES.REASON.CHALLENGE.CHALLENGE_MISSING,
        };
    }

    const {httpCode, reason} = await registerAuthenticationKey({
        keyInfo: params.registrationResponse,
        authenticationMethod: params.authenticationMethod,
    });

    const success = isHttpSuccess(httpCode);

    return {
        success,
        reason,
    };
}

/**
 * Processes a multifactor authentication scenario action.
 * Executes the scenario-specific action with the signed challenge
 * and additional parameters. Returns success status and reason.
 *
 * @async
 * @template T - The type of the multifactor authentication scenario
 * @param scenario - The MFA scenario to process
 * @param params - Scenario parameters including:
 *   - signedChallenge: The signed challenge response from biometric authentication
 *   - authenticationMethod: The biometric method used
 *   - Additional scenario-specific parameters (e.g., transactionID)
 * @returns Object with success status and reason
 */
async function processScenario<T extends MultifactorAuthenticationScenario>(
    scenario: T,
    params: MultifactorAuthenticationProcessScenarioParameters<T> & {authenticationMethod: MarqetaAuthTypeName},
): Promise<ProcessResult> {
    const currentScenario = MULTIFACTOR_AUTHENTICATION_SCENARIO_CONFIG[scenario] as MultifactorAuthenticationScenarioConfig;

    if (!params.signedChallenge) {
        return {
            success: false,
            reason: VALUES.REASON.GENERIC.SIGNATURE_MISSING,
        };
    }

    const {httpCode, reason} = await currentScenario.action(params);
    const success = isHttpSuccess(httpCode);

    return {
        success,
        reason,
    };
}

export {processRegistration, processScenario};
export type {ProcessResult, RegistrationParams};
