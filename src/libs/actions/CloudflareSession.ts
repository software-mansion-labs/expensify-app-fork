import {isQAAuthConfigured} from '@libs/CloudflareAccess/Config';
import {generatePKCEPair, generateState} from '@libs/CloudflareAccess/generatePKCE';
import {buildAuthorizeURL, exchangeCode, OAuthError, refreshTokens} from '@libs/CloudflareAccess/OAuthClient';
import {savePendingAuthFlow} from '@libs/CloudflareAccess/PendingAuthFlowStorage';
import Log from '@libs/Log';

import ONYXKEYS from '@src/ONYXKEYS';
import type CloudflareSession from '@src/types/onyx/CloudflareSession';

import Onyx from 'react-native-onyx';

const ACCESS_TOKEN_EXPIRY_BUFFER_MS = 60_000;

/** `undefined` = Onyx not read yet, `null` = read and absent */
let sessionCache: CloudflareSession | null | undefined;

/** The async flows below cannot be cancelled, so each captures this at the start and re-checks it after awaits */
let sessionGeneration = 0;

let resolveHydration!: () => void;
const hydrationPromise = new Promise<void>((resolve) => {
    resolveHydration = resolve;
});

if (isQAAuthConfigured()) {
    // We have used `connectWithoutView` here because this module-level cache is not connected to any UI component
    Onyx.connectWithoutView({
        key: ONYXKEYS.CLOUDFLARE_SESSION,
        callback: (value) => {
            sessionCache = value ?? null;
            resolveHydration();
        },
    });
} else {
    // Nothing will ever hydrate the cache, so a waiter must not block forever
    sessionCache = null;
    resolveHydration();
}

function getCloudflareSession(): CloudflareSession | null | undefined {
    return sessionCache;
}

function waitForCloudflareSessionHydration(): Promise<void> {
    return hydrationPromise;
}

function isSessionNearExpiry(session: CloudflareSession): boolean {
    return session.expiresAt - Date.now() < ACCESS_TOKEN_EXPIRY_BUFFER_MS;
}

let isRedirectInFlight = false;

/** Never settles once navigation is requested — the page is leaving */
async function redirectToCloudflareSignIn(returnURL: string = window.location.href): Promise<never> {
    if (isRedirectInFlight) {
        // A second caller while the first navigation is settling must not overwrite the stored flow
        return new Promise<never>(() => {});
    }
    isRedirectInFlight = true;
    const generation = sessionGeneration;
    try {
        const pkce = await generatePKCEPair();
        const state = generateState();
        const authorizeURL = await buildAuthorizeURL({state, codeChallenge: pkce.codeChallenge});
        if (generation !== sessionGeneration) {
            throw new Error('Cloudflare auth flow was cancelled');
        }
        savePendingAuthFlow({state, codeVerifier: pkce.codeVerifier, returnURL, createdAt: Date.now()});
        window.location.assign(authorizeURL);
    } catch (error) {
        isRedirectInFlight = false;
        throw error;
    }
    return new Promise<never>(() => {});
}

let codeExchangePromise: Promise<void> | null = null;

function exchangeCodeForCloudflareSession({code, codeVerifier}: {code: string; codeVerifier: string}): Promise<void> {
    const generation = sessionGeneration;
    // Single-flight: a caller joining mid-exchange must not burn the single-use authorization code twice
    codeExchangePromise ??= exchangeCode({code, codeVerifier})
        .then((session) => {
            if (generation !== sessionGeneration) {
                return;
            }
            // Cache first: requests during this boot must see the token before disk I/O settles
            sessionCache = session;
            return Onyx.set(ONYXKEYS.CLOUDFLARE_SESSION, session).catch((error: unknown) => {
                Log.warn('[CloudflareSession] Failed to persist the exchanged session', {error});
            });
        })
        .finally(() => {
            codeExchangePromise = null;
        });
    return codeExchangePromise;
}

function getPendingCloudflareCodeExchange(): Promise<void> | null {
    return codeExchangePromise;
}

type CloudflareRefreshResult = 'refreshed' | 'skipped-newer-token' | 'reauth-required';

let refreshPromise: Promise<CloudflareRefreshResult> | null = null;

/**
 * Cloudflare rotates the refresh token on every call, so two tabs refreshing at once each spend a token
 * the other still needs.
 */
function withCrossTabRefreshLock(callback: () => Promise<CloudflareRefreshResult>): Promise<CloudflareRefreshResult> {
    if (!navigator.locks) {
        return callback();
    }
    return navigator.locks.request('cloudflareSessionRefresh', callback);
}

async function refreshCloudflareSessionUnderLock(staleAccessToken: string): Promise<CloudflareRefreshResult> {
    const generation = sessionGeneration;
    const current = sessionCache;
    if (!current?.refreshToken) {
        return 'reauth-required';
    }
    if (current.accessToken !== staleAccessToken) {
        return 'skipped-newer-token';
    }

    const submittedRefreshToken = current.refreshToken;
    try {
        const session = await refreshTokens(submittedRefreshToken);
        if (generation !== sessionGeneration) {
            // Persisting the rotated pair would resurrect the dead session
            return 'reauth-required';
        }
        sessionCache = session;
        // The rotation already spent the old token, so the cache holds the only usable pair
        await Onyx.set(ONYXKEYS.CLOUDFLARE_SESSION, session).catch((error: unknown) => {
            Log.warn('[CloudflareSession] Failed to persist the rotated session', {error});
        });
        return 'refreshed';
    } catch (error) {
        if (!(error instanceof OAuthError) || (error.code !== 'invalid_grant' && error.code !== 'invalid_response')) {
            throw error;
        }
        if (generation !== sessionGeneration) {
            return 'reauth-required';
        }
        if (sessionCache?.refreshToken !== submittedRefreshToken) {
            // Another tab already rotated the token this call submitted
            return 'skipped-newer-token';
        }
        // Both codes mean the submitted token is spent (invalid_response = CF rotated but the new pair was
        // unreadable). Another tab may hold a working rotation, so the shared session is never deleted here
        return 'reauth-required';
    }
}

/**
 * Resolves only after the rotated pair is cached and its persist has settled. Terminal failures resolve
 * 'reauth-required' (recovery is a fresh authorize round trip), transient ones reject with the session
 * intact. `staleAccessToken` is the token the caller decided to refresh from: if it is no longer the current
 * one, a rotation beat this call and it resolves 'skipped-newer-token' without spending a token.
 */
function refreshCloudflareSession(staleAccessToken: string): Promise<CloudflareRefreshResult> {
    // Preconditions are re-checked inside the lock
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = withCrossTabRefreshLock(() => refreshCloudflareSessionUnderLock(staleAccessToken)).finally(() => {
        refreshPromise = null;
    });
    return refreshPromise;
}

function clearCloudflareSession(): Promise<void> {
    sessionGeneration++;
    sessionCache = null;
    return Onyx.set(ONYXKEYS.CLOUDFLARE_SESSION, null);
}

/**
 * Drops a session a *freshly refreshed* access token was still rejected with. Token-guarded: another tab may
 * have rotated since the 401 was seen, and deleting that rotation would take a working session down with the
 * dead one.
 */
function markCloudflareSessionRejected(rejectedAccessToken: string): Promise<void> {
    if (sessionCache?.accessToken !== rejectedAccessToken) {
        return Promise.resolve();
    }
    return clearCloudflareSession();
}

export {
    redirectToCloudflareSignIn,
    clearCloudflareSession,
    exchangeCodeForCloudflareSession,
    getCloudflareSession,
    getPendingCloudflareCodeExchange,
    isSessionNearExpiry,
    markCloudflareSessionRejected,
    refreshCloudflareSession,
    waitForCloudflareSessionHydration,
};
export type {CloudflareRefreshResult};
