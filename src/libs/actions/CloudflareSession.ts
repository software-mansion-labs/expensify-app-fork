/**
 * Owns the Cloudflare Access OAuth session for the QA server POC (web-only transport — see Web_POC.md):
 * the Onyx-backed module cache, the same-tab redirect auth flow, and the single-flight refresh.
 * Deliberately never imports HttpUtils — HttpUtils imports this module to attach and refresh tokens,
 * and the probe action (CloudflareProbe.ts) is the only place the two meet.
 */
import {buildAuthorizeURL, exchangeCode, OAuthError, refreshTokens} from '@libs/CloudflareOAuth/oauthClient';
import {generatePKCEPair, generateState} from '@libs/CloudflareOAuth/pkce';
import {clearPendingRedirectFlow, savePendingRedirectFlow} from '@libs/CloudflareOAuth/redirectFlowStorage';
import {registerSessionCleanupCallback} from '@libs/SessionCleanup';

import ONYXKEYS from '@src/ONYXKEYS';
import type CloudflareSession from '@src/types/onyx/CloudflareSession';

import Onyx from 'react-native-onyx';

/** Refresh proactively when the access token has less lifetime left than this */
const ACCESS_TOKEN_EXPIRY_BUFFER_MS = 60_000;

/** `undefined` = Onyx not read yet, `null` = read and absent — NetworkStore's hydration convention */
let cfSession: CloudflareSession | null | undefined;

let resolveHydration: () => void;
const hydrationPromise = new Promise<void>((resolve) => {
    resolveHydration = resolve;
});

// We have used `connectWithoutView` here because this module-level cache is not connected to any UI component
Onyx.connectWithoutView({
    key: ONYXKEYS.CF_SESSION,
    callback: (value) => {
        cfSession = value ?? null;
        resolveHydration();
    },
});

// Sign-out drops the cache synchronously (Onyx.clear wipes the persisted key, but its callback is async).
// Cache only, on purpose: nulling the in-flight promise refs below would not cancel the underlying work,
// but WOULD let a second flight start and overlap the first. A refresh/exchange landing after logout and
// re-writing the key is the known, accepted POC race (Web_POC_Plan.md §7).
registerSessionCleanupCallback(() => {
    cfSession = null;
    // An authorize round trip started before sign-out can never be completed by the new session
    clearPendingRedirectFlow();
});

function getCfSession(): CloudflareSession | null | undefined {
    return cfSession;
}

function waitForCfSessionHydration(): Promise<void> {
    return hydrationPromise;
}

function isSessionNearExpiry(session: CloudflareSession): boolean {
    return session.expiresAt - Date.now() < ACCESS_TOKEN_EXPIRY_BUFFER_MS;
}

let isRedirectInFlight = false;

/**
 * Starts the authorize round trip by navigating this tab to Cloudflare. Deliberately never settles once
 * the navigation is requested: the page is going away, so callers must treat the call as terminal and run
 * nothing after it. Rejects only when the redirect could not be started at all (no web storage), because
 * navigating away without a stored verifier would strand the flow with no way to finish the exchange.
 *
 * Unlike the popup transport this needs no pre-warmed PKCE pair: `location.assign` requires no transient
 * user activation and cannot be blocked, so the awaits below are free.
 */
async function beginQAAuthRedirect(returnURL: string = window.location.href): Promise<never> {
    if (isRedirectInFlight) {
        // A second press while the first navigation is settling must not overwrite the stored flow
        return new Promise<never>(() => {});
    }
    isRedirectInFlight = true;
    try {
        const pkce = await generatePKCEPair();
        const state = generateState();
        // Must be stored before the navigation — module memory does not survive the unload
        savePendingRedirectFlow({state, codeVerifier: pkce.codeVerifier, returnURL, createdAt: Date.now()});
        window.location.assign(buildAuthorizeURL({state, codeChallenge: pkce.codeChallenge}));
    } catch (error) {
        isRedirectInFlight = false;
        throw error;
    }
    return new Promise<never>(() => {});
}

/**
 * The callback-boot half of the flow, driven by redirectCallback.ts. Single-flight so a probe that joins
 * mid-exchange shares it instead of burning the single-use authorization code twice.
 */
let redirectCompletionPromise: Promise<void> | null = null;

function completeQAAuthRedirect({code, codeVerifier}: {code: string; codeVerifier: string}): Promise<void> {
    redirectCompletionPromise ??= exchangeCode({code, codeVerifier})
        .then((session) => {
            // Cache first: a request fired during this boot must see the token before disk I/O settles.
            // If Onyx.set rejects (storage quota etc.) this rejects while the cache keeps the fresh
            // session — deliberate: the credential is real and usable for this tab, and a reload
            // self-heals (no persisted session → re-auth).
            cfSession = session;
            return Onyx.set(ONYXKEYS.CF_SESSION, session);
        })
        .finally(() => {
            redirectCompletionPromise = null;
        });
    return redirectCompletionPromise;
}

/**
 * Non-null only while a callback-boot exchange is in flight. QA callers join it rather than reading a
 * still-empty session and starting a second redirect.
 */
function getPendingQAAuthCompletion(): Promise<void> | null {
    return redirectCompletionPromise;
}

type CfRefreshResult = 'refreshed' | 'skipped-newer-token' | 'reauth-required';

let refreshPromise: Promise<CfRefreshResult> | null = null;

/**
 * Single-flight refresh with rotated-token persistence. Resolves `'reauth-required'` only for terminal
 * failures (session already cleared); transient failures (network, 5xx) REJECT so callers see an
 * ordinary error while the session survives. Pass the access token a 401 was observed with so a
 * rotation that already happened resolves `'skipped-newer-token'` instead of burning the refresh token.
 */
function refreshCfSession(staleAccessToken?: string): Promise<CfRefreshResult> {
    // Join any in-flight refresh before the staleness shortcut — its resolution already guarantees
    // the rotated pair hit Onyx, so late 401 callers can't race ahead of persistence
    if (refreshPromise) {
        return refreshPromise;
    }
    const current = cfSession;
    if (!current?.refreshToken) {
        return Promise.resolve('reauth-required');
    }
    // Rotation already completed while this caller's request was in flight — retry with the new token
    if (staleAccessToken && current.accessToken !== staleAccessToken) {
        return Promise.resolve('skipped-newer-token');
    }
    refreshPromise = refreshTokens(current.refreshToken)
        .then((session) => {
            cfSession = session;
            return Onyx.set(ONYXKEYS.CF_SESSION, session).then((): CfRefreshResult => 'refreshed');
        })
        .catch((error): Promise<CfRefreshResult> => {
            if (error instanceof OAuthError && (error.code === 'invalid_grant' || error.code === 'invalid_response')) {
                // invalid_grant: the refresh token is spent/revoked. invalid_response: a 2xx arrived, so
                // CF already rotated — the old token is dead even though the new one was unreadable.
                // Either way this stored session can never refresh again; keeping it would trap every
                // future press in the retry-refresh branch, never reaching the no-session popup branch.
                return clearCfSession().then(() => 'reauth-required');
            }
            throw error;
        })
        .finally(() => {
            refreshPromise = null;
        });
    return refreshPromise;
}

function clearCfSession(): Promise<void> {
    cfSession = null; // synchronous — a probe pressed right after Clear must not read the dead session
    return Onyx.set(ONYXKEYS.CF_SESSION, null);
}

/**
 * A 401 for a freshly refreshed token means the session is broken in a way refresh can't fix.
 * Drop it so the next press reaches the redirect branch — guarded on the rejected token, so a newer
 * session established concurrently is never collateral damage. HttpUtils calls this on a double-401.
 */
function markCfSessionRejected(rejectedAccessToken: string): Promise<void> {
    if (cfSession?.accessToken !== rejectedAccessToken) {
        return Promise.resolve();
    }
    return clearCfSession();
}

export {
    beginQAAuthRedirect,
    clearCfSession,
    completeQAAuthRedirect,
    getCfSession,
    getPendingQAAuthCompletion,
    isSessionNearExpiry,
    markCfSessionRejected,
    refreshCfSession,
    waitForCfSessionHydration,
};
export type {CfRefreshResult};
