/** Config and request classification for the Cloudflare Access-protected QA server */
import CONFIG from '@src/CONFIG';

import type {GetOAuthRedirectURI, GetQAOrigins, GetQAResource, IsQAAuthConfigured, IsQAServerRequest} from './types';

/** A bare hostname: no scheme, no slash, no port. Loose about labels (custom Access domains exist). */
const TEAM_DOMAIN_SHAPE = /^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;

function parseHTTPSOrigin(value: string): string | null {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' ? url.origin : null;
    } catch {
        return null;
    }
}

const isQAAuthConfigured: IsQAAuthConfigured = () => {
    const {API_ROOT, SECURE_API_ROOT, TEAM_DOMAIN, CLIENT_ID} = CONFIG.QA_AUTH;

    if (!API_ROOT || !TEAM_DOMAIN || !CLIENT_ID) {
        return false;
    }

    if (!TEAM_DOMAIN_SHAPE.test(TEAM_DOMAIN)) {
        return false;
    }

    // A malformed secure root disables the feature outright: half an allowlist would send the
    // shouldUseSecure commands out bearer-less, to an unrecoverable 401
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
    // The `??` is unreachable behind the isQAAuthConfigured() gate that every caller sits under
    return parseHTTPSOrigin(CONFIG.QA_AUTH.API_ROOT) ?? '';
};

const getQAOrigins: GetQAOrigins = () => {
    const {API_ROOT, SECURE_API_ROOT} = CONFIG.QA_AUTH;
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

/** Must be registered as an allowed redirect URI on the Access application */
const getOAuthRedirectURI: GetOAuthRedirectURI = () => {
    return `${window.location.origin}/oauth/callback`;
};

export {getOAuthRedirectURI, getQAOrigins, getQAResource, isQAAuthConfigured, isQAServerRequest};
