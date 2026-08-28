import CONFIG from '@src/CONFIG';

/** Loose about labels: custom Access domains exist */
const TEAM_DOMAIN_SHAPE = /^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;

/** RFC 8252 §7.2: the callback path both platforms claim. Web serves it, native claims it as an app link */
const OAUTH_CALLBACK_PATH = '/oauth/callback';

function parseHTTPSOrigin(value: string): string | null {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' ? url.origin : null;
    } catch {
        return null;
    }
}

/** The configuration half of `isQAAuthConfigured`. Platforms add their own support gates on top */
function isQAAuthConfigValid(clientID: string): boolean {
    const {API_ROOT, SECURE_API_ROOT, TEAM_DOMAIN} = CONFIG.QA_AUTH;

    if (!API_ROOT || !TEAM_DOMAIN || !clientID) {
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
}

/**
 * RFC 8707 resource indicator. Single-valued by protocol — Cloudflare binds the issued token to exactly this
 * string — so it stays the primary API root even when the allowlist below carries more than one host. One
 * token still covers every host, provided they all belong to the same (multi-domain) Access application.
 */
function getQAResource(): string {
    return parseHTTPSOrigin(CONFIG.QA_AUTH.API_ROOT) ?? '';
}

function getQAOrigins(): string[] {
    const {API_ROOT, SECURE_API_ROOT} = CONFIG.QA_AUTH;
    return [API_ROOT, SECURE_API_ROOT].map((root) => parseHTTPSOrigin(root)).filter((origin) => origin !== null);
}

/** Origin-exact, never substring: this is the security boundary for the whole feature */
function matchesQAOrigin(url: string): boolean {
    try {
        return getQAOrigins().includes(new URL(url).origin);
    } catch {
        return false;
    }
}

export {OAUTH_CALLBACK_PATH, getQAOrigins, getQAResource, isQAAuthConfigValid, matchesQAOrigin, parseHTTPSOrigin};
