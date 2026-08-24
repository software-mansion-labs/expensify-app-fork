/**
 * The single place that decides to navigate this tab to Cloudflare.
 *
 * On a QA build every API call — including the Expensify sign-in POST — goes to a Zero Trust-protected
 * origin, so the Cloudflare handshake has to complete before that first request is sent, not after the user
 * signs in. It runs on demand from the network layer rather than at startup, which is what keeps a signed-out
 * tab with the QA switch on where it is: no QA request, no redirect — and on the sign-in screen the first QA
 * request is normally the login itself. A redirect needs no user activation, so the network layer can start
 * one with no user gesture in hand; that is the whole reason the flow moved off the popup transport.
 */
import {isQAServerActive, waitForActiveServerHydration} from '@libs/ApiUtils';
import {isQAAuthConfigured} from '@libs/CloudflareAccess/Config';
import Log from '@libs/Log';

import {beginCloudflareAuthRedirect, getCloudflareSession, getPendingCloudflareAuthCompletion, waitForCloudflareSessionHydration} from '@userActions/CloudflareSession';

function shouldAuthenticate(): boolean {
    return isQAAuthConfigured() && isQAServerActive();
}

/**
 * "At most one navigation" is `beginCloudflareAuthRedirect`'s own invariant — a second caller gets a
 * never-settling promise rather than a competing flow. All this adds is the logging: both callers sit on the
 * request path, with nobody to return an error to.
 */
async function startRedirect(): Promise<void> {
    try {
        await beginCloudflareAuthRedirect();
    } catch (error) {
        Log.warn('[CloudflareAccess] Failed to start the QA auth redirect', {error});
    }
}

async function runGate(): Promise<void> {
    // Both signals below are Onyx-backed and neither is readable synchronously: ACTIVE_SERVER arrives via
    // ApiUtils (which itself waits on getEnvironment() before subscribing), CLOUDFLARE_SESSION via the session cache.
    // Deciding before they hydrate reads "production, no session" on every build, QA included, and the first
    // request of a page load can easily beat them.
    await Promise.all([waitForActiveServerHydration(), waitForCloudflareSessionHydration()]);

    // This page load may BE the callback: a code is already being exchanged, and redirecting would burn it.
    const pendingCompletion = getPendingCloudflareAuthCompletion();
    if (pendingCompletion) {
        try {
            await pendingCompletion;
        } catch {
            // This page load WAS the callback and its exchange failed. Falling through to the session check
            // would read "no session" and redirect — and Cloudflare, already holding a valid Zero Trust
            // session, bounces straight back here with a fresh code. That is an unbounded redirect loop for
            // exactly the failures a first setup produces: wrong client ID, unregistered redirect URI, clock
            // skew. No module-state guard can stop it; every bounce is a fresh page load.
            return;
        }
    }

    if (!shouldAuthenticate() || getCloudflareSession()) {
        return;
    }

    await startRedirect();
}

/** Single-flight: the decision spans several awaits, so two callers must not both reach the redirect */
let gatePromise: Promise<void> | null = null;

/**
 * Called before every QA request that resolves its own credential — the 401 retry path reuses the token it
 * already holds and skips this — and nowhere else, so the first QA request of a page load is what starts the
 * handshake. Resolves immediately on a build with no Cloudflare credentials, and without redirecting on any
 * non-QA build. When it does redirect, the returned promise never settles — the page is leaving.
 */
function ensureQAAuthenticated(): Promise<void> {
    // The only check that is honest synchronously: CONFIG is baked into the bundle. A build with no
    // credentials must not pay for two hydration awaits on every request that it can do nothing with.
    if (!isQAAuthConfigured()) {
        return Promise.resolve();
    }
    // Cleared once the run settles, so the single-flight covers concurrent callers without memoising the
    // answer. The gate reads `activeServer`, which the test-tool switch changes mid-session: flipping it to QA
    // signs the user out client-side without reloading, so a cached "nothing to do" from an earlier run would
    // be the last word for the rest of the page and every QA request would go out with no bearer. A run that
    // does redirect never settles, so this cannot fire mid-navigation and admit a competing flow.
    gatePromise ??= runGate().finally(() => {
        gatePromise = null;
    });
    return gatePromise;
}

/**
 * Called when a QA request fails with CF_REAUTH_REQUIRED — the session is dead and refresh cannot save it.
 * On a QA build nothing works without a token, so re-authorizing is the only useful response. No hydration
 * await here, deliberately: a QA request already went out, which means the signal was hydrated to route it.
 */
function handleQAReauthRequired(): void {
    if (!shouldAuthenticate()) {
        return;
    }
    startRedirect();
}

export {ensureQAAuthenticated, handleQAReauthRequired};
