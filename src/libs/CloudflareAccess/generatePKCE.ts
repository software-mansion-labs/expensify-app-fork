import Base64URL from '@src/utils/Base64URL';

import getWebCrypto from './getWebCrypto';

type PKCEPair = {
    /** The secret the client keeps and reveals only at token exchange */
    codeVerifier: string;

    /** base64url(SHA-256(codeVerifier)), sent with the authorize request */
    codeChallenge: string;
};

/** 32 random bytes encode to a 43-char base64url verifier, the RFC 7636 minimum length, with full entropy */
const CODE_VERIFIER_BYTE_LENGTH = 32;

const STATE_BYTE_LENGTH = 16;

/**
 * Cloudflare's parameter parsing chokes on a challenge starting with `-` or `_`, failing with a misleading
 * "code_challenge_method must be S256" error
 */
const CHALLENGE_STARTS_ALPHANUMERIC = /^[a-zA-Z0-9]/;

async function computeCodeChallenge(codeVerifier: string): Promise<string> {
    const digest = await getWebCrypto.sha256(new TextEncoder().encode(codeVerifier));
    return Base64URL.encode(new Uint8Array(digest));
}

async function generatePKCEPair(): Promise<PKCEPair> {
    const codeVerifier = Base64URL.encode(getWebCrypto.getRandomValues(new Uint8Array(CODE_VERIFIER_BYTE_LENGTH)));
    const codeChallenge = await computeCodeChallenge(codeVerifier);

    if (!CHALLENGE_STARTS_ALPHANUMERIC.test(codeChallenge)) {
        return generatePKCEPair();
    }

    return {codeVerifier, codeChallenge};
}

/** Random state parameter to bind the authorize round-trip against CSRF */
function generateState(): string {
    return Base64URL.encode(getWebCrypto.getRandomValues(new Uint8Array(STATE_BYTE_LENGTH)));
}

export {generatePKCEPair, generateState};
export type {PKCEPair};
