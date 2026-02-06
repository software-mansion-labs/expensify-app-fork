/**
 * Constants for multifactor authentication passkeys (WebAuthn) flow.
 * Separate from the Biometrics VALUES.ts which handles native biometric authentication.
 */

const PASSKEY_TYPE = 'public-key';

const PASSKEY_AUTH_TYPE = {
    CODE: 7,
    NAME: 'Passkey',
    MARQETA_VALUE: 'OTHER',
} as const;

const REASON = {
    WEBAUTHN: {
        CANCELED: 'WebAuthn: Authentication canceled by user',
        CREDENTIAL_EXISTS: 'WebAuthn: Credential already registered',
        SECURITY_ERROR: 'WebAuthn: Security error',
        NOT_SUPPORTED: 'WebAuthn: No authenticator supports the requested algorithm',
        ABORTED: 'WebAuthn: Operation was aborted',
        GENERIC: 'WebAuthn: An error occurred',
        NO_CREDENTIAL_FOUND: 'WebAuthn: No matching credential found locally',
        REGISTRATION_COMPLETE: 'WebAuthn: Registration complete',
    },
} as const;

export {PASSKEY_TYPE, PASSKEY_AUTH_TYPE, REASON};
