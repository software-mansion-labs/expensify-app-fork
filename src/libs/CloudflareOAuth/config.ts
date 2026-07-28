/**
 * Configuration and request-classification helpers for the Cloudflare Access OAuth POC (see Web_POC.md).
 * This module is the security enforcement point: nothing else decides whether a URL may carry the QA
 * bearer token, and a partial or malformed .env must never make a request look like a QA request.
 */
import CONFIG from '@src/CONFIG';

/**
 * A bare hostname (e.g. `team.cloudflareaccess.com`): label characters plus at least one dot-separated
 * TLD, no scheme, no slash, no port. Deliberately loose about the label content — custom Access domains
 * exist — but strict about the overall shape.
 */
const TEAM_DOMAIN_SHAPE = /^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;

/**
 * True only when the QA auth env config is complete and well-formed: all three values present,
 * an https API root, and a bare-hostname team domain. Anything less and every consumer
 * (bearer attachment, auth flow, test menu rows) must behave as if the feature doesn't exist.
 */
function isQAAuthConfigured(): boolean {
    const {API_ROOT, TEAM_DOMAIN, CLIENT_ID} = CONFIG.QA_AUTH;

    if (!API_ROOT || !TEAM_DOMAIN || !CLIENT_ID) {
        return false;
    }

    if (!TEAM_DOMAIN_SHAPE.test(TEAM_DOMAIN)) {
        return false;
    }

    try {
        return new URL(API_ROOT).protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Should this request carry the QA bearer token? Exact-origin match against the configured QA API
 * root — no substring matching, and never true while the config is incomplete or malformed.
 */
function isQAServerRequest(url: string): boolean {
    if (!isQAAuthConfigured()) {
        return false;
    }

    try {
        return new URL(url).origin === new URL(CONFIG.QA_AUTH.API_ROOT).origin;
    } catch {
        return false;
    }
}

/**
 * The RFC 8707 `resource` parameter value. Cloudflare binds issued tokens to the origin form
 * (scheme + host + port, no trailing slash) — the form the live client registration was verified with.
 */
function getQAResource(): string {
    return new URL(CONFIG.QA_AUTH.API_ROOT).origin;
}

function getAuthorizationEndpoint(): string {
    return `https://${CONFIG.QA_AUTH.TEAM_DOMAIN}/cdn-cgi/access/oauth/authorization`;
}

function getTokenEndpoint(): string {
    return `https://${CONFIG.QA_AUTH.TEAM_DOMAIN}/cdn-cgi/access/oauth/token`;
}

/**
 * The redirect URI for the OAuth flow — the app's own origin. Computed lazily and only on web:
 * `window` doesn't exist on native, and native will claim Universal Links instead when it's built.
 */
function getOAuthRedirectURI(): string {
    return `${window.location.origin}/oauth/callback`;
}

export {getAuthorizationEndpoint, getOAuthRedirectURI, getQAResource, getTokenEndpoint, isQAAuthConfigured, isQAServerRequest};
