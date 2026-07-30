/**
 * Owns the Cloudflare Access OAuth session for the QA server POC (web-only transport — see Web_POC.md):
 * the Onyx-backed module cache, the interactive popup auth flow, and the single-flight refresh.
 * Deliberately never imports HttpUtils — HttpUtils imports this module to attach and refresh tokens,
 * and the probe action (CloudflareProbe.ts) is the only place the two meet.
 */
import {getOAuthRedirectURI} from '@libs/CloudflareOAuth/config';
import {buildAuthorizeURL, exchangeCode, OAuthError, refreshTokens} from '@libs/CloudflareOAuth/oauthClient';
import type {PKCEPair} from '@libs/CloudflareOAuth/pkce';
import {generatePKCEPair, generateState} from '@libs/CloudflareOAuth/pkce';
import type {AuthSessionCompletion} from '@libs/CloudflareOAuth/popupCompletionRecovery';
import {watchForSeveredOpenerCompletion} from '@libs/CloudflareOAuth/popupCompletionRecovery';
import {registerSessionCleanupCallback} from '@libs/SessionCleanup';

import ONYXKEYS from '@src/ONYXKEYS';
import type CloudflareSession from '@src/types/onyx/CloudflareSession';

import type {WebBrowserAuthSessionResult} from 'expo-web-browser';

import {dismissAuthSession, openAuthSessionAsync} from 'expo-web-browser';
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

// Pre-warming is the load-bearing piece of the user-activation story: browsers (Safari strictest) can
// void the transient activation across ANY await, so the click path must reach openAuthSessionAsync —
// whose window.open runs synchronously at the top of the call — with zero awaits. The PKCE pair is
// therefore generated ahead of time and the press only consumes it.
let preparedPKCE: PKCEPair | null = null;
let pkcePreparePromise: Promise<void> | null = null;

/** Single-flight: concurrent callers (mount effect + post-flow re-warm) share one generation */
function ensurePreparedPKCEPair(): Promise<void> {
    if (preparedPKCE) {
        return Promise.resolve();
    }
    pkcePreparePromise ??= generatePKCEPair()
        .then((pair) => {
            preparedPKCE = pair;
        })
        .finally(() => {
            pkcePreparePromise = null;
        });
    return pkcePreparePromise;
}

/** TestToolMenu calls this on mount (web only); the Run button stays disabled until it resolves */
function prepareQAAuthFlow(): Promise<void> {
    return Promise.all([waitForCfSessionHydration(), ensurePreparedPKCEPair()]).then(() => undefined);
}

async function runAuthFlow(): Promise<boolean> {
    // Consume the pre-warmed pair. Deliberately NO inline-generation fallback: an await between the
    // press and window.open is the exact activation-voiding failure pre-warming exists to prevent,
    // so a missing pair fails fast instead (the probe surfaces it as a semantic error).
    const pkce = preparedPKCE;
    preparedPKCE = null;
    if (!pkce) {
        throw new Error('PKCE pair is not pre-warmed — prepareQAAuthFlow() must resolve before the auth flow starts');
    }

    const state = generateState(); // synchronous — still zero awaits before the popup

    // The popup's completion message only reaches us while its window.opener survives the redirect
    // chain; a severed opener posts it into the void and openAuthSessionAsync hangs forever (verified
    // live — Web_POC.md §5.4). Race it against the localStorage breadcrumb the popup publishes first.
    const recovery = watchForSeveredOpenerCompletion(state);
    let result: WebBrowserAuthSessionResult | AuthSessionCompletion;
    try {
        result = await Promise.race([openAuthSessionAsync(buildAuthorizeURL({state, codeChallenge: pkce.codeChallenge}), getOAuthRedirectURI()), recovery.completion]);
    } finally {
        recovery.stop();
    }
    if (result.type !== 'success') {
        // Cancelled/dismissed — a semantic outcome, not an exception
        return false;
    }
    // When the recovery won, expo's session is still dangling: this closes the popup where the handle
    // still works and clears the localStorage handles either way. No-op after a normal completion.
    dismissAuthSession();

    // Expo's own localStorage-handle check is NOT state validation (the popup shares localStorage).
    // State first: a callback that fails provenance is discarded wholesale — its error/code params
    // are untrusted data and must not be interpreted at all.
    const params = new URL(result.url).searchParams;
    if (params.get('state') !== state) {
        throw new Error('OAuth callback state mismatch');
    }
    const oauthError = params.get('error');
    if (oauthError) {
        // e.g. access_denied — the provider refused; never attempt the exchange
        throw new OAuthError(oauthError, params.get('error_description') ?? undefined);
    }
    const code = params.get('code');
    if (!code) {
        throw new Error('OAuth callback is missing the authorization code');
    }

    const session = await exchangeCode({code, codeVerifier: pkce.codeVerifier});
    // Cache first: an immediate retry must see the token before disk I/O settles. If Onyx.set rejects
    // (storage quota etc.) the flow rejects while the cache keeps the fresh session — deliberate: the
    // credential is real and usable for this tab, and a reload self-heals (no persisted session → re-auth).
    cfSession = session;
    await Onyx.set(ONYXKEYS.CF_SESSION, session);
    return true;
}

let authFlowPromise: Promise<boolean> | null = null;

/**
 * Single-flight interactive auth. Resolves true when a session was established, false on cancel.
 * Must be called synchronously from a user press — the popup opens inside this call.
 */
function startQAAuthFlow(): Promise<boolean> {
    authFlowPromise ??= runAuthFlow().finally(() => {
        authFlowPromise = null;
        // Re-warm before the flow settles (finally waits on the returned promise), so the busy UI
        // can't re-enable the button before a fresh pair exists. Re-warm failures are swallowed —
        // they must not veto a successful auth; a later press then fails fast in runAuthFlow.
        return ensurePreparedPKCEPair().catch(() => undefined);
    });
    return authFlowPromise;
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
 * Drop it so the next press reaches the popup branch — guarded on the rejected token, so a newer
 * session established concurrently is never collateral damage. HttpUtils calls this on a double-401.
 */
function markCfSessionRejected(rejectedAccessToken: string): Promise<void> {
    if (cfSession?.accessToken !== rejectedAccessToken) {
        return Promise.resolve();
    }
    return clearCfSession();
}

export {clearCfSession, getCfSession, isSessionNearExpiry, markCfSessionRejected, prepareQAAuthFlow, refreshCfSession, startQAAuthFlow};
export type {CfRefreshResult};
