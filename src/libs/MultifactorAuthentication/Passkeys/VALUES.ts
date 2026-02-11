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

export {PASSKEY_TYPE, PASSKEY_AUTH_TYPE};
