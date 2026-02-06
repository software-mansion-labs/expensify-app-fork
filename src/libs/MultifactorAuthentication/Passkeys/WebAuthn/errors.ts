import {REASON} from '@libs/MultifactorAuthentication/Passkeys/VALUES';

/**
 * Normalizes WebAuthn DOMException errors to our passkey reason codes.
 * Maps standard WebAuthn error names to consistent internal reason strings.
 */
function normalizeWebAuthnError(error: unknown): string {
    if (error instanceof DOMException) {
        switch (error.name) {
            case 'NotAllowedError':
                return REASON.WEBAUTHN.CANCELED;
            case 'InvalidStateError':
                return REASON.WEBAUTHN.CREDENTIAL_EXISTS;
            case 'SecurityError':
                return REASON.WEBAUTHN.SECURITY_ERROR;
            case 'NotSupportedError':
                return REASON.WEBAUTHN.NOT_SUPPORTED;
            case 'AbortError':
                return REASON.WEBAUTHN.ABORTED;
            default:
                return REASON.WEBAUTHN.GENERIC;
        }
    }

    return REASON.WEBAUTHN.GENERIC;
}

export default normalizeWebAuthnError;
