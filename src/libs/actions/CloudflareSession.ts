/**
 * Owns the Cloudflare Access OAuth session for the QA server: Onyx-backed cache, the same-tab redirect
 * flow, and the single-flight refresh. Web-only until native claims Universal/App Links.
 */
import {isQAAuthConfigured} from '@libs/CloudflareAccess/Config';
import {generatePKCEPair, generateState} from '@libs/CloudflareAccess/generatePKCE';
import {buildAuthorizeURL, exchangeCode, OAuthError, refreshTokens} from '@libs/CloudflareAccess/OAuthClient';
import {clearPendingAuthFlow, savePendingAuthFlow} from '@libs/CloudflareAccess/PendingAuthFlowStorage';
// TEMPORARY debug instrumentation for the QA Cloudflare flow. Remove with the QAAuthTrace directory.
import {describeError, fingerprint, traceQAAuth} from '@libs/CloudflareAccess/QAAuthTrace';
import Log from '@libs/Log';
import {registerSessionCleanupCallback} from '@libs/SessionCleanup';

import ONYXKEYS from '@src/ONYXKEYS';
import type CloudflareSession from '@src/types/onyx/CloudflareSession';

import Onyx from 'react-native-onyx';

/** Refresh proactively when the access token has less lifetime left than this */
const ACCESS_TOKEN_EXPIRY_BUFFER_MS = 60_000;

/** `undefined` = Onyx not read yet, `null` = read and absent. NetworkStore's hydration convention */
let sessionCache: CloudflareSession | null | undefined;

/**
 * Bumped by sign-out. The async flows below cannot be cancelled, so each captures this at the start and
 * re-checks it after awaits. A mismatch makes the late result inert. Every new `await` added to this
 * module must re-check the captured generation afterwards.
 */
let sessionGeneration = 0;

// Definite assignment: the Promise executor runs synchronously, so this is set before anything reads it
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
            // TEMPORARY debug instrumentation: whether a session survived the round trip, and how long it has left
            traceQAAuth('session.hydrated', {
                hasSession: !!value,
                expiresInMs: value ? value.expiresAt - Date.now() : null,
                hasRefreshToken: !!value?.refreshToken,
                accessToken: fingerprint(value?.accessToken),
            });
            resolveHydration();
        },
    });

    // Onyx.clear wipes the key but its callback is async, so drop the cache synchronously
    registerSessionCleanupCallback(() => {
        sessionGeneration++;
        sessionCache = null;
        clearPendingAuthFlow();
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

/**
 * Navigates this tab to Cloudflare to start the authorize round trip. Never settles once navigation is
 * requested. The page is leaving. Rejects only if the flow record couldn't be stored.
 */
async function beginCloudflareAuthRedirect(returnURL: string = window.location.href): Promise<never> {
    // TEMPORARY debug instrumentation: a redirect suppressed as a duplicate looks identical to one that never started
    traceQAAuth('redirect.begin', {isRedirectInFlight, returnURL});
    if (isRedirectInFlight) {
        // A second press while the first navigation is settling must not overwrite the stored flow
        return new Promise<never>(() => {});
    }
    isRedirectInFlight = true;
    const generation = sessionGeneration;
    try {
        const pkce = await generatePKCEPair();
        const state = generateState();
        // Resolved before the flow record is stored, so a failed discovery leaves nothing behind
        const authorizeURL = await buildAuthorizeURL({state, codeChallenge: pkce.codeChallenge});
        // TEMPORARY debug instrumentation: proves discovery resolved, and records what is being asked for.
        // The whole URL is decomposed rather than logged, so state and code_challenge stay fingerprinted.
        const parsedAuthorizeURL = new URL(authorizeURL);
        const authorizeParams = parsedAuthorizeURL.searchParams;
        traceQAAuth('redirect.authorizeURL', {
            authorizeEndpoint: `${parsedAuthorizeURL.origin}${parsedAuthorizeURL.pathname}`,
            clientID: fingerprint(authorizeParams.get('client_id')),
            redirectURI: authorizeParams.get('redirect_uri'),
            scope: authorizeParams.get('scope'),
            codeChallengeMethod: authorizeParams.get('code_challenge_method'),
            state: fingerprint(state),
        });
        if (generation !== sessionGeneration) {
            // Signed out while this flow was being prepared. Do not navigate a signed-out tab
            throw new Error('Cloudflare auth flow was cancelled by sign-out');
        }
        // Must be stored before the navigation. Module memory does not survive the unload
        savePendingAuthFlow({state, codeVerifier: pkce.codeVerifier, returnURL, createdAt: Date.now()});
        // TEMPORARY debug instrumentation: the flow record is stored and the tab is about to leave. If the next
        // record after this one is not a callback record, the return trip is where the flow broke.
        traceQAAuth('redirect.navigating');
        window.location.assign(authorizeURL);
    } catch (error) {
        isRedirectInFlight = false;
        // TEMPORARY debug instrumentation: a discovery or storage failure before the tab ever left
        traceQAAuth('redirect.failed', {error: describeError(error)});
        throw error;
    }
    return new Promise<never>(() => {});
}

let redirectCompletionPromise: Promise<void> | null = null;

function completeCloudflareAuthRedirect({code, codeVerifier}: {code: string; codeVerifier: string}): Promise<void> {
    const generation = sessionGeneration;
    // TEMPORARY debug instrumentation: joining an in-flight exchange versus starting one
    traceQAAuth('exchange.start', {alreadyInFlight: !!redirectCompletionPromise, code: fingerprint(code)});
    // Single-flight: a caller joining mid-exchange must not burn the single-use authorization code twice
    redirectCompletionPromise ??= exchangeCode({code, codeVerifier})
        .then((session) => {
            // TEMPORARY debug instrumentation: the token endpoint answered
            traceQAAuth('exchange.tokenReceived', {expiresInMs: session.expiresAt - Date.now(), hasRefreshToken: !!session.refreshToken, staleGeneration: generation !== sessionGeneration});
            if (generation !== sessionGeneration) {
                // Signed out mid-exchange
                return;
            }
            // Cache first: requests during this boot must see the token before disk I/O settles. A failed
            // persist is only logged, because the cache keeps the usable session and a reload self-heals
            sessionCache = session;
            return Onyx.set(ONYXKEYS.CLOUDFLARE_SESSION, session).catch((error: unknown) => {
                Log.warn('[CloudflareSession] Failed to persist the exchanged session', {error});
            });
        })
        .finally(() => {
            redirectCompletionPromise = null;
        });
    return redirectCompletionPromise;
}

/** Non-null only mid-exchange, so callers join it instead of starting a second redirect */
function getPendingCloudflareAuthCompletion(): Promise<void> | null {
    return redirectCompletionPromise;
}

type CloudflareRefreshResult = 'refreshed' | 'skipped-newer-token' | 'reauth-required';

let refreshPromise: Promise<CloudflareRefreshResult> | null = null;

/**
 * Cloudflare rotates the refresh token on every call, so two tabs refreshing at once each spend a token
 * the other still needs. Web Locks serialize the read-refresh-persist across the origin's tabs.
 */
function withCrossTabRefreshLock(callback: () => Promise<CloudflareRefreshResult>): Promise<CloudflareRefreshResult> {
    if (!navigator.locks) {
        return callback();
    }
    return navigator.locks.request('cloudflareSessionRefresh', callback);
}

/** Runs with the cross-tab lock held. The session is re-read here rather than captured by the caller */
async function performCloudflareRefresh(staleAccessToken: string): Promise<CloudflareRefreshResult> {
    const generation = sessionGeneration;
    const current = sessionCache;
    if (!current?.refreshToken) {
        return 'reauth-required';
    }
    // Rotation already completed, here or in another tab, while this caller's request was in flight
    if (current.accessToken !== staleAccessToken) {
        return 'skipped-newer-token';
    }

    const submittedRefreshToken = current.refreshToken;
    try {
        // TEMPORARY debug instrumentation: a refresh round trip is starting
        traceQAAuth('refresh.start');
        const session = await refreshTokens(submittedRefreshToken);
        if (generation !== sessionGeneration) {
            // Signed out mid-refresh. Persisting the rotated pair would resurrect the dead session
            return 'reauth-required';
        }
        sessionCache = session;
        await Onyx.set(ONYXKEYS.CLOUDFLARE_SESSION, session);
        return 'refreshed';
    } catch (error) {
        // TEMPORARY debug instrumentation: distinguishes a spent refresh token from a transient network failure
        traceQAAuth('refresh.failed', {error: describeError(error), code: error instanceof OAuthError ? error.code : null});
        // A failed persist is not a spent token, so it falls through here and rethrows
        if (!(error instanceof OAuthError) || (error.code !== 'invalid_grant' && error.code !== 'invalid_response')) {
            throw error;
        }
        if (generation !== sessionGeneration) {
            // Signed out during the round trip
            return 'reauth-required';
        }
        if (sessionCache?.refreshToken !== submittedRefreshToken) {
            // Another tab already rotated the token this call submitted. The caller retries with the newer one
            return 'skipped-newer-token';
        }
        // Both codes mean the submitted token is spent (invalid_response = CF rotated but the new pair was
        // unreadable). Never delete the shared session here. Another tab may hold a working rotation.
        return 'reauth-required';
    }
}

/**
 * Single-flight refresh, serialized across tabs. The rotated pair is persisted before it resolves. Terminal
 * failures resolve 'reauth-required' (recovery is a fresh authorize round trip), transient ones reject with
 * the session intact. `staleAccessToken` is the token the caller decided to refresh from: if it is no longer
 * the current one, a rotation beat this call and it resolves 'skipped-newer-token' without spending a token.
 */
function refreshCloudflareSession(staleAccessToken: string): Promise<CloudflareRefreshResult> {
    // Joining guarantees the rotated pair already hit Onyx. Preconditions are re-checked inside the lock
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = withCrossTabRefreshLock(() => performCloudflareRefresh(staleAccessToken)).finally(() => {
        refreshPromise = null;
    });
    return refreshPromise;
}

/** Deletes the session for every tab. Two callers: the test tool's Clear-session button, and a 401 that refreshing could not fix */
function clearCloudflareSession(): Promise<void> {
    // In-flight work must not undo the clear by persisting its late result, exactly like on sign-out
    sessionGeneration++;
    // Synchronous, so a probe pressed right after Clear cannot read the dead session
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
        // A newer session exists, so the caller's 401 is stale news rather than grounds to delete anything
        return Promise.resolve();
    }
    return clearCloudflareSession();
}

export {
    beginCloudflareAuthRedirect,
    clearCloudflareSession,
    completeCloudflareAuthRedirect,
    getCloudflareSession,
    getPendingCloudflareAuthCompletion,
    isSessionNearExpiry,
    markCloudflareSessionRejected,
    refreshCloudflareSession,
    waitForCloudflareSessionHydration,
};
export type {CloudflareRefreshResult};
