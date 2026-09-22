import CONFIG from '@src/CONFIG';

/** A bare hostname: no scheme, no slash, no port. Loose about labels (custom Access domains exist). */
const TEAM_DOMAIN_SHAPE = /^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;

/** Web-only. Native claims CONST.CLOUDFLARE_ACCESS.NATIVE_OAUTH_CALLBACK_PATH so a browser sign-in never lands in the app */
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

    // A malformed secure root disables the feature outright: the shouldUseSecure commands would otherwise
    // go out bearer-less and 401 unrecoverably
    if (SECURE_API_ROOT && !parseHTTPSOrigin(SECURE_API_ROOT)) {
        return false;
    }

    return parseHTTPSOrigin(API_ROOT) !== null;
}

/**
 * RFC 8707 resource indicator: Cloudflare binds the issued token to exactly this one string, so one token
 * covers every allowlisted host only if they all belong to the same (multi-domain) Access application.
 */
function getQAResource(): string {
    // The `??` is unreachable behind the isQAAuthConfigured() gate that every caller sits under
    return parseHTTPSOrigin(CONFIG.QA_AUTH.API_ROOT) ?? '';
}

/** Every origin allowed to receive the QA bearer. Entries are configured hosts, never inferred from the primary name */
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

export {OAUTH_CALLBACK_PATH, getQAResource, isQAAuthConfigValid, matchesQAOrigin};
