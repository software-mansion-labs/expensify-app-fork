import type {AuthenticationChallenge, RegistrationChallenge, SignedChallenge} from '@libs/MultifactorAuthentication/Biometrics/ED25519/types';
import type {PasskeyRegistrationResponse} from '@libs/MultifactorAuthentication/Biometrics/types';
import {arrayBufferToBase64URL, base64URLToArrayBuffer} from './encoding';

/**
 * Checks if the browser supports the WebAuthn API.
 */
function isWebAuthnSupported(): boolean {
    return typeof window !== 'undefined' && !!window.PublicKeyCredential;
}

/**
 * Builds PublicKeyCredentialCreationOptions from a RegistrationChallenge.
 * Converts base64url-encoded fields to ArrayBuffers as required by the WebAuthn API.
 */
function buildCreationOptions(challenge: RegistrationChallenge): PublicKeyCredentialCreationOptions {
    return {
        challenge: base64URLToArrayBuffer(challenge.challenge),
        rp: {
            id: challenge.rp.id,
            name: challenge.rp.id,
        },
        user: {
            id: base64URLToArrayBuffer(challenge.user.id),
            name: challenge.user.displayName,
            displayName: challenge.user.displayName,
        },
        pubKeyCredParams: challenge.pubKeyCredParams.map((param) => ({
            type: param.type as PublicKeyCredentialType,
            alg: param.alg,
        })),
        timeout: challenge.timeout,
        attestation: 'none' as AttestationConveyancePreference,
    };
}

/**
 * Builds PublicKeyCredentialRequestOptions from an AuthenticationChallenge.
 * Optionally filters allowCredentials to only include locally known credential IDs.
 */
function buildRequestOptions(challenge: AuthenticationChallenge, localCredentialIds?: string[]): PublicKeyCredentialRequestOptions {
    const allowCredentials = challenge.allowCredentials
        ?.filter((cred) => !localCredentialIds || localCredentialIds.includes(cred.id))
        .map((cred) => ({
            id: base64URLToArrayBuffer(cred.id),
            type: cred.type as PublicKeyCredentialType,
        }));

    return {
        challenge: base64URLToArrayBuffer(challenge.challenge),
        rpId: challenge.rpId,
        allowCredentials,
        userVerification: challenge.userVerification as UserVerificationRequirement,
        timeout: challenge.timeout,
    };
}

/**
 * Calls navigator.credentials.create() and extracts the registration response.
 * Returns base64url-encoded fields matching the PasskeyRegistrationResponse shape.
 */
async function createPasskey(options: PublicKeyCredentialCreationOptions): Promise<PasskeyRegistrationResponse> {
    const credential = (await navigator.credentials.create({publicKey: options})) as PublicKeyCredential | null;

    if (!credential) {
        throw new Error('No credential returned from navigator.credentials.create()');
    }

    const attestationResponse = credential.response as AuthenticatorAttestationResponse;

    return {
        rawId: arrayBufferToBase64URL(credential.rawId),
        type: 'public-key',
        response: {
            clientDataJSON: arrayBufferToBase64URL(attestationResponse.clientDataJSON),
            attestationObject: arrayBufferToBase64URL(attestationResponse.attestationObject),
        },
    };
}

/**
 * Calls navigator.credentials.get() and extracts the assertion response.
 * Returns a SignedChallenge with base64url-encoded fields matching the existing type.
 */
async function getPasskeyAssertion(options: PublicKeyCredentialRequestOptions): Promise<SignedChallenge> {
    const credential = (await navigator.credentials.get({publicKey: options})) as PublicKeyCredential | null;

    if (!credential) {
        throw new Error('No credential returned from navigator.credentials.get()');
    }

    const assertionResponse = credential.response as AuthenticatorAssertionResponse;

    return {
        rawId: arrayBufferToBase64URL(credential.rawId),
        type: 'public-key',
        response: {
            authenticatorData: arrayBufferToBase64URL(assertionResponse.authenticatorData),
            clientDataJSON: arrayBufferToBase64URL(assertionResponse.clientDataJSON),
            signature: arrayBufferToBase64URL(assertionResponse.signature),
        },
    };
}

export {isWebAuthnSupported, buildCreationOptions, buildRequestOptions, createPasskey, getPasskeyAssertion};
