import type {Base64URLString} from '@src/utils/Base64URL';

/**
 * Registration response shape matching PublicKeyCredential from navigator.credentials.create().
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

export type {PasskeyRegistrationResponse};
