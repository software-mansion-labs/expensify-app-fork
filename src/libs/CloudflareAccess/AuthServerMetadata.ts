import {isRecord} from '@libs/ObjectUtils';

import CONFIG from '@src/CONFIG';

import {getQAResource} from './Config';
import timeoutSignal from './timeoutSignal';

/** RFC 8414 §3 fixes the path */
const WELL_KNOWN_PATH = '/.well-known/oauth-authorization-server';

const METADATA_TIMEOUT_MS = 10_000;

type AuthServerEndpoints = {
    authorizationEndpoint: string;
    tokenEndpoint: string;
};

let metadataPromise: Promise<AuthServerEndpoints> | null = null;

function getExpectedIssuer(): string {
    return `https://${CONFIG.QA_AUTH.TEAM_DOMAIN}`;
}

function validateEndpoint(value: unknown, issuerOrigin: string, name: string): string {
    let parsed: URL;
    try {
        parsed = new URL(typeof value === 'string' ? value : '');
    } catch {
        throw new Error(`Authorization server metadata has a missing or malformed ${name}`);
    }
    // Endpoints receive the authorization code and refresh tokens, so they must live on the pinned issuer
    if (parsed.origin !== issuerOrigin) {
        throw new Error(`Authorization server metadata ${name} does not belong to the expected issuer`);
    }
    return parsed.href;
}

async function fetchAndValidateMetadata(): Promise<AuthServerEndpoints> {
    // The resource indicator is the primary QA origin by construction, and that is the one origin Cloudflare
    // serves the document on — the other allowlist entries do not carry it
    const response = await fetch(new URL(WELL_KNOWN_PATH, getQAResource()).href, {
        credentials: 'omit',
        signal: timeoutSignal(METADATA_TIMEOUT_MS),
    });
    if (!response.ok) {
        throw new Error(`Authorization server metadata request failed with HTTP ${response.status}`);
    }
    const json: unknown = await response.json().catch(() => null);
    if (!isRecord(json)) {
        throw new Error('Authorization server metadata is not a JSON object');
    }
    // RFC 8414 §3.3 requires an exact issuer match
    const expectedIssuer = getExpectedIssuer();
    if (json.issuer !== expectedIssuer) {
        throw new Error('Authorization server metadata issuer does not match the configured team domain');
    }
    // This client only implements S256 (RFC 7636), so an issuer without it could never complete a flow
    if (!Array.isArray(json.code_challenge_methods_supported) || !json.code_challenge_methods_supported.includes('S256')) {
        throw new Error('Authorization server does not support the S256 PKCE challenge method');
    }
    const issuerOrigin = new URL(expectedIssuer).origin;
    return {
        authorizationEndpoint: validateEndpoint(json.authorization_endpoint, issuerOrigin, 'authorization_endpoint'),
        tokenEndpoint: validateEndpoint(json.token_endpoint, issuerOrigin, 'token_endpoint'),
    };
}

/** The metadata is static per environment, so it is cached for the page's lifetime */
function getAuthServerEndpoints(): Promise<AuthServerEndpoints> {
    metadataPromise ??= fetchAndValidateMetadata().catch((error: unknown) => {
        metadataPromise = null;
        throw error;
    });
    return metadataPromise;
}

export {getAuthServerEndpoints};
export type {AuthServerEndpoints};
