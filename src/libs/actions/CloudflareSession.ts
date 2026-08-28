import runAuthorizeRoundTrip from '@libs/CloudflareAccess/authorizeRoundTrip';
import {isQAAuthConfigured} from '@libs/CloudflareAccess/Config';
import {generatePKCEPair, generateState} from '@libs/CloudflareAccess/generatePKCE';
import {buildAuthorizeURL, exchangeCode, OAuthError, refreshTokens} from '@libs/CloudflareAccess/OAuthClient';
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

/** Native resolves this; web never does, because the page leaves for Cloudflare */
type CloudflareSignInResult = 'session-established' | 'cancelled' | 'failed';

let signInPromise: Promise<CloudflareSignInResult> | null = null;

async function runSignIn(returnURL?: string): Promise<CloudflareSignInResult> {
    const generation = sessionGeneration;
    const pkce = await generatePKCEPair();
    const state = generateState();
    const authorizeURL = await buildAuthorizeURL({state, codeChallenge: pkce.codeChallenge});

    if (generation !== sessionGeneration) {
        throw new Error('Cloudflare auth flow was cancelled');
    }

    const result = await runAuthorizeRoundTrip({authorizeURL, state, codeVerifier: pkce.codeVerifier, returnURL});

    if (result.outcome === 'cancelled') {
        return 'cancelled';
    }

    if (result.outcome === 'failed') {
        Log.warn('[CloudflareSession] Authorize round trip did not complete', {errorMessage: result.errorMessage});
        return 'failed';
    }

    await exchangeCodeForCloudflareSession(result.exchange);
    return getCloudflareSession() ? 'session-established' : 'failed';
}

/**
 * Single-flight: a second caller joins the round trip already running rather than opening a second browser
 * session, or — on web — overwriting the flow the first one parked. On web the promise never settles, so it
 * is never cleared either, which is the intended one-shot-per-page behaviour.
 */
function startCloudflareSignIn(returnURL?: string): Promise<CloudflareSignInResult> {
    signInPromise ??= runSignIn(returnURL).finally(() => {
        signInPromise = null;
    });
    return signInPromise;
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
 * Resolves only after the rotated pair is cached and its persist has settled. No outcome deletes the stored
 * session: terminal failures resolve 'reauth-required' (recovery is a fresh authorize round trip) and
 * transient ones reject, both leaving the session for another tab that may hold a working rotation — a
 * caller that wants it gone must call `clearCloudflareSession`. `staleAccessToken` is the token the caller
 * decided to refresh from: if it is no longer the current one, a rotation beat this call and it resolves
 * 'skipped-newer-token' without spending a token, leaving the newer credential in place for the caller to
 * read back.
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
    startCloudflareSignIn,
    clearCloudflareSession,
    exchangeCodeForCloudflareSession,
    getCloudflareSession,
    getPendingCloudflareCodeExchange,
    isSessionNearExpiry,
    markCloudflareSessionRejected,
    refreshCloudflareSession,
    waitForCloudflareSessionHydration,
};
export type {CloudflareRefreshResult, CloudflareSignInResult};
