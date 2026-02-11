import type {MultifactorAuthenticationReason} from '@libs/MultifactorAuthentication/Biometrics/types';
import CONST from '@src/CONST';

/**
 * Normalizes WebAuthn DOMException errors to our passkey reason codes.
 * Maps standard WebAuthn error names to consistent internal reason strings.
 */
function normalizeWebAuthnError(error: unknown): MultifactorAuthenticationReason {
    if (error instanceof DOMException) {
        switch (error.name) {
            case 'NotAllowedError':
                return CONST.MULTIFACTOR_AUTHENTICATION.REASON.WEBAUTHN.CANCELED;
            case 'InvalidStateError':
                return CONST.MULTIFACTOR_AUTHENTICATION.REASON.WEBAUTHN.CREDENTIAL_EXISTS;
            case 'SecurityError':
                return CONST.MULTIFACTOR_AUTHENTICATION.REASON.WEBAUTHN.SECURITY_ERROR;
            case 'NotSupportedError':
                return CONST.MULTIFACTOR_AUTHENTICATION.REASON.WEBAUTHN.NOT_SUPPORTED;
            case 'AbortError':
                return CONST.MULTIFACTOR_AUTHENTICATION.REASON.WEBAUTHN.ABORTED;
            default:
                return CONST.MULTIFACTOR_AUTHENTICATION.REASON.WEBAUTHN.GENERIC;
        }
    }

    return CONST.MULTIFACTOR_AUTHENTICATION.REASON.WEBAUTHN.GENERIC;
}

export default normalizeWebAuthnError;
