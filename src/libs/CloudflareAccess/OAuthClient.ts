import {isRecord} from '@libs/ObjectUtils';

import type CloudflareSession from '@src/types/onyx/CloudflareSession';

import {getAuthServerEndpoints} from './AuthServerMetadata';
import {getOAuthClientID, getOAuthRedirectURI, getQAResource} from './Config';
import timeoutSignal from './timeoutSignal';

/** A hung token endpoint would otherwise hold the cross-tab refresh lock indefinitely */
const TOKEN_ENDPOINT_TIMEOUT_MS = 10_000;

/** A protocol-reported error (or a malformed response). `code` is the OAuth code, e.g. `invalid_grant` */
class OAuthError extends Error {
    constructor(
        readonly code: string,
        message?: string,
    ) {
        super(message ?? code);
    }
}

async function postTokenEndpoint(body: URLSearchParams): Promise<CloudflareSession> {
    const {tokenEndpoint} = await getAuthServerEndpoints();
    const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: [['Content-Type', 'application/x-www-form-urlencoded']],
        body: body.toString(),
        credentials: 'omit',
        // A 307/308 would re-send this body (code, verifier, refresh token) wherever the redirect points
        redirect: 'error',
        // Times out as a transient transport error, not an OAuthError
        signal: timeoutSignal(TOKEN_ENDPOINT_TIMEOUT_MS),
    });

    const json: unknown = await response.json().catch(() => null);

    if (!response.ok) {
        // RFC 6749 §5.2
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
        // Terminal: retrying won't fix a protocol mismatch. token_type is checked because callers hardcode
        // the Bearer scheme
        throw new OAuthError('invalid_response', 'Token endpoint returned an unexpected response shape');
    }

    return {
        accessToken: json.access_token,
        refreshToken: json.refresh_token,
        expiresAt: Date.now() + json.expires_in * 1000,
    };
}

async function buildAuthorizeURL({state, codeChallenge}: {state: string; codeChallenge: string}): Promise<string> {
    const {authorizationEndpoint} = await getAuthServerEndpoints();
    const url = new URL(authorizationEndpoint);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', getOAuthClientID());
    url.searchParams.set('redirect_uri', getOAuthRedirectURI());
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    // RFC 8707. Omitting the resource breaks the exchange
    url.searchParams.set('resource', getQAResource());
    return url.toString();
}

function exchangeCode({code, codeVerifier}: {code: string; codeVerifier: string}): Promise<CloudflareSession> {
    const body = new URLSearchParams();
    body.set('grant_type', 'authorization_code');
    body.set('code', code);
    body.set('code_verifier', codeVerifier);
    // Must byte-match the redirect_uri sent in the authorize request
    body.set('redirect_uri', getOAuthRedirectURI());
    body.set('client_id', getOAuthClientID());
    body.set('resource', getQAResource());
    return postTokenEndpoint(body);
}

/** Cloudflare rotates the refresh token on every call, so the returned one replaces the (now spent) input */
function refreshTokens(refreshToken: string): Promise<CloudflareSession> {
    const body = new URLSearchParams();
    body.set('grant_type', 'refresh_token');
    body.set('refresh_token', refreshToken);
    // No `resource` here. Cloudflare's refresh grant takes the client ID and the token only
    body.set('client_id', getOAuthClientID());
    return postTokenEndpoint(body);
}

export {buildAuthorizeURL, exchangeCode, OAuthError, refreshTokens};
