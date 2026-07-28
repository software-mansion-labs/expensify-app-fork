/**
 * PKCE (RFC 7636) helpers for the Cloudflare Access OAuth flow, written once against the WebCrypto
 * surface and fed by a per-platform provider (see Web_POC.md §2.1).
 */
import Base64URL from '@src/utils/Base64URL';

import getWebCrypto from './getWebCrypto';

type PKCEPair = {
    /** The secret the client keeps and reveals only at token exchange */
    codeVerifier: string;

    /** base64url(SHA-256(codeVerifier)), sent with the authorize request */
    codeChallenge: string;
};

/** 32 random bytes → 43-char base64url verifier: the RFC 7636 minimum length, with full entropy */
const CODE_VERIFIER_BYTE_LENGTH = 32;

/** The state parameter is CSRF protection only — 16 bytes is plenty */
const STATE_BYTE_LENGTH = 16;

/**
 * Cloudflare's URL parameter parsing chokes on challenges starting with `-` or `_` (verified live — it
 * fails with a misleading "code_challenge_method must be S256 for public clients" error), so pairs whose
 * challenge starts non-alphanumeric are regenerated.
 */
const CHALLENGE_STARTS_ALPHANUMERIC = /^[a-zA-Z0-9]/;

async function computeCodeChallenge(codeVerifier: string): Promise<string> {
    const digest = await getWebCrypto.sha256(new TextEncoder().encode(codeVerifier));
    return Base64URL.encode(new Uint8Array(digest));
}

/** Generates a fresh verifier/challenge pair, regenerating until the challenge starts alphanumeric */
async function generatePKCEPair(): Promise<PKCEPair> {
    const codeVerifier = Base64URL.encode(getWebCrypto.getRandomValues(new Uint8Array(CODE_VERIFIER_BYTE_LENGTH)));
    const codeChallenge = await computeCodeChallenge(codeVerifier);

    // ~2/64 of digests start with '-' or '_'; a recursive retry keeps both halves of the pair together
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
