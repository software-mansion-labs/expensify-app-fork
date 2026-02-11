/**
 * Registration response types sent to the backend during multifactor authentication setup.
 * These are shared between native biometric (ED25519) and passkey (WebAuthn) flows.
 */
import type {Base64URLString} from '@src/utils/Base64URL';

/**
 * Native biometric (ED25519) registration response.
 * The backend identifies this format by the `type` field: 'biometric'.
 */
type NativeBiometricRegistrationResponse = {
    rawId: Base64URLString;
    type: 'biometric';
    response: {
        clientDataJSON: Base64URLString;
        biometric: {
            publicKey: Base64URLString;
            algorithm: -8;
        };
    };
};

/**
 * Passkey (WebAuthn) registration response from navigator.credentials.create().
 * The backend identifies this format by the `type` field: 'public-key'.
 * All binary fields are base64url-encoded for transport to the backend.
 */
type PasskeyRegistrationResponse = {
    rawId: Base64URLString;
    type: 'public-key';
    response: {
        clientDataJSON: Base64URLString;
        attestationObject: Base64URLString;
    };
};

/**
 * Union of both native biometric and passkey registration responses.
 * Used by shared code that handles registration for either platform.
 */
type RegistrationResponseInfo = NativeBiometricRegistrationResponse | PasskeyRegistrationResponse;

export type {NativeBiometricRegistrationResponse, PasskeyRegistrationResponse, RegistrationResponseInfo};
