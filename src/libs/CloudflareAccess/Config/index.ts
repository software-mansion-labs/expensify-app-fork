/**
 * Config and request classification for the Cloudflare Access-protected QA server. The security boundary:
 * nothing else decides whether a URL may carry the QA bearer token.
 */
import CONFIG from '@src/CONFIG';

import type {GetCloudflareLogoutURL, GetOAuthRedirectURI, GetQAOrigins, GetQAResource, IsQAAuthConfigured, IsQAServerRequest} from './types';

/** A bare hostname: no scheme, no slash, no port. Loose about labels (custom Access domains exist). */
const TEAM_DOMAIN_SHAPE = /^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;

/** Origin of a well-formed https URL, `null` for anything else — the single rule for what a QA root may be */
function parseHTTPSOrigin(value: string): string | null {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' ? url.origin : null;
    } catch {
        return null;
    }
}

/** Anything short of a complete, well-formed config and every consumer behaves as if the feature is absent */
const isQAAuthConfigured: IsQAAuthConfigured = () => {
    const {API_ROOT, SECURE_API_ROOT, TEAM_DOMAIN, CLIENT_ID, CHECK_PATH} = CONFIG.QA_AUTH;

    if (!API_ROOT || !TEAM_DOMAIN || !CLIENT_ID || !CHECK_PATH) {
        return false;
    }

    if (!TEAM_DOMAIN_SHAPE.test(TEAM_DOMAIN)) {
        return false;
    }

    // The secure root is optional, but a malformed one disables the feature outright: half an allowlist is
    // worse than none, because the shouldUseSecure commands would go out bearer-less and 401 unrecoverably
    if (SECURE_API_ROOT && !parseHTTPSOrigin(SECURE_API_ROOT)) {
        return false;
    }

    return parseHTTPSOrigin(API_ROOT) !== null;
};

/**
 * RFC 8707 resource indicator. Single-valued by protocol — Cloudflare binds the issued token to exactly this
 * string — so it stays the primary API root even when the allowlist below carries more than one host. One
 * token still covers every host, provided they all belong to the same (multi-domain) Access application.
 */
const getQAResource: GetQAResource = () => {
    // Derived by the same rule as the allowlist entry it has to match, rather than a second spelling of it.
    // The `??` is unreachable behind the isQAAuthConfigured() gate that every caller sits under.
    return parseHTTPSOrigin(CONFIG.QA_AUTH.API_ROOT) ?? '';
};

/** Every origin allowed to receive the QA bearer. Entries are configured hosts, never inferred from the primary name. */
const getQAOrigins: GetQAOrigins = () => {
    const {API_ROOT, SECURE_API_ROOT} = CONFIG.QA_AUTH;
    // Roots drop out rather than throw: reading the allowlist must never take its caller down
    return [API_ROOT, SECURE_API_ROOT].map((root) => parseHTTPSOrigin(root)).filter((origin) => origin !== null);
};

/** Exact-origin membership, never a substring, and never true on an incomplete config */
const isQAServerRequest: IsQAServerRequest = (url) => {
    if (!isQAAuthConfigured()) {
        return false;
    }

    try {
        return getQAOrigins().includes(new URL(url).origin);
    } catch {
        return false;
    }
};

/** Must be registered as an allowed redirect URI on the Access application. Read lazily: no `window` on native. */
const getOAuthRedirectURI: GetOAuthRedirectURI = () => {
    return `${window.location.origin}/oauth/callback`;
};

/**
 * The team domain is the identity provider for the whole Access account, so this ends the browser's session
 * with every application on it, not only the QA server.
 */
const getCloudflareLogoutURL: GetCloudflareLogoutURL = () => {
    return `https://${CONFIG.QA_AUTH.TEAM_DOMAIN}/cdn-cgi/access/logout`;
};

export {getCloudflareLogoutURL, getOAuthRedirectURI, getQAOrigins, getQAResource, isQAAuthConfigured, isQAServerRequest};
