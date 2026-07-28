/**
 * Thin, strictly-validating client for Cloudflare Access's Managed OAuth endpoints (protocol shapes
 * verified live — Web_POC.md §3). Protocol-level failures surface as OAuthError so callers can tell
 * terminal outcomes (`invalid_grant`, `invalid_response`) apart from transient transport errors.
 */
import {isRecord} from '@libs/ObjectUtils';

import CONFIG from '@src/CONFIG';
import type CloudflareSession from '@src/types/onyx/CloudflareSession';

import {getAuthorizationEndpoint, getOAuthRedirectURI, getQAResource, getTokenEndpoint} from './config';

/**
 * An error the OAuth protocol reported (or a malformed response from it), as opposed to a transient
 * transport failure. `code` is the OAuth error code, e.g. `invalid_grant`.
 */
class OAuthError extends Error {
    constructor(
        readonly code: string,
        message?: string,
    ) {
        super(message ?? code);
    }
}

/** POSTs form-encoded params to the token endpoint and validates the response into a CloudflareSession */
async function postTokenEndpoint(body: URLSearchParams): Promise<CloudflareSession> {
    const response = await fetch(getTokenEndpoint(), {
        method: 'POST',
        headers: [['Content-Type', 'application/x-www-form-urlencoded']],
        body: body.toString(),
        credentials: 'omit',
    });

    const json: unknown = await response.json().catch(() => null);

    if (!response.ok) {
        // OAuth error responses come as {error, error_description} on a 4xx (RFC 6749 §5.2)
        if (isRecord(json) && typeof json.error === 'string') {
            throw new OAuthError(json.error, typeof json.error_description === 'string' ? json.error_description : undefined);
        }
        throw new Error(`Token endpoint failed with HTTP ${response.status}`);
    }

    if (
        !isRecord(json) ||
        typeof json.access_token !== 'string' ||
        json.access_token === '' ||
        typeof json.refresh_token !== 'string' ||
        json.refresh_token === '' ||
        typeof json.expires_in !== 'number' ||
        json.expires_in <= 0 ||
        typeof json.token_type !== 'string' ||
        json.token_type.toLowerCase() !== 'bearer'
    ) {
        // A 2xx with a shape we don't understand is terminal — retrying won't fix a protocol mismatch.
        // token_type is asserted because HttpUtils hardcodes the Bearer scheme; a token of another type
        // must not be persisted as if it were a bearer token.
        throw new OAuthError('invalid_response', 'Token endpoint returned an unexpected response shape');
    }

    return {
        accessToken: json.access_token,
        refreshToken: json.refresh_token,
        expiresAt: Date.now() + json.expires_in * 1000,
    };
}

/** Builds the full authorization URL the popup navigates to */
function buildAuthorizeURL({state, codeChallenge}: {state: string; codeChallenge: string}): string {
    const url = new URL(getAuthorizationEndpoint());
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', CONFIG.QA_AUTH.CLIENT_ID);
    url.searchParams.set('redirect_uri', getOAuthRedirectURI());
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    // RFC 8707 — Cloudflare binds the issued token to this resource; omitting it breaks the exchange
    url.searchParams.set('resource', getQAResource());
    return url.toString();
}

/** Exchanges an authorization code (plus the PKCE verifier) for a session */
function exchangeCode({code, codeVerifier}: {code: string; codeVerifier: string}): Promise<CloudflareSession> {
    const body = new URLSearchParams();
    body.set('grant_type', 'authorization_code');
    body.set('code', code);
    body.set('code_verifier', codeVerifier);
    // Must byte-match the redirect_uri sent in the authorize request
    body.set('redirect_uri', getOAuthRedirectURI());
    body.set('client_id', CONFIG.QA_AUTH.CLIENT_ID);
    body.set('resource', getQAResource());
    return postTokenEndpoint(body);
}

/**
 * Redeems a refresh token for a fresh session. Cloudflare rotates the refresh token on every call —
 * the returned session's refreshToken replaces the one passed in, which is now spent.
 */
function refreshTokens(refreshToken: string): Promise<CloudflareSession> {
    const body = new URLSearchParams();
    body.set('grant_type', 'refresh_token');
    body.set('refresh_token', refreshToken);
    // No `resource` here — the verified live refresh flow omits it (Web_POC.md §3.10)
    body.set('client_id', CONFIG.QA_AUTH.CLIENT_ID);
    return postTokenEndpoint(body);
}

export {buildAuthorizeURL, exchangeCode, OAuthError, refreshTokens};
