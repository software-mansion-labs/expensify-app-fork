/**
 * The single place that decides to navigate this tab to Cloudflare.
 *
 * On a QA build every API call — including the Expensify sign-in POST — goes to a Zero Trust-protected
 * origin, so the Cloudflare handshake has to complete before the app makes its first request, not after the
 * user signs in. A redirect needs no user activation, so this can run from boot code and from the network
 * layer alike; that is the whole reason the flow moved off the popup transport.
 */
import {isQAServerActive, waitForActiveServerHydration} from '@libs/ApiUtils';
import Log from '@libs/Log';

import {beginCloudflareAuthRedirect, getCloudflareSession, getPendingCloudflareAuthCompletion, waitForCloudflareSessionHydration} from '@userActions/CloudflareSession';

import {isQAAuthConfigured} from '../Config';

function shouldAuthenticate(): boolean {
    return isQAAuthConfigured() && isQAServerActive();
}

/**
 * "At most one navigation" is `beginCloudflareAuthRedirect`'s own invariant — a second caller gets a
 * never-settling promise rather than a competing flow. All this adds is the logging: both callers are boot
 * or network code with nobody to return an error to.
 */
async function startRedirect(): Promise<void> {
    try {
        await beginCloudflareAuthRedirect();
    } catch (error) {
        Log.warn('[CloudflareAccess] Failed to start the QA auth redirect', {error});
    }
}

async function runGate(): Promise<void> {
    // Both signals below are Onyx-backed and neither is readable on the boot tick: ACTIVE_SERVER arrives via
    // ApiUtils (which itself waits on getEnvironment() before subscribing), CF_SESSION via the session cache.
    // Deciding before they hydrate reads "production, no session" on every build, QA included.
    await Promise.all([waitForActiveServerHydration(), waitForCloudflareSessionHydration()]);

    // This boot may BE the callback: a code is already being exchanged, and redirecting would burn it.
    const pendingCompletion = getPendingCloudflareAuthCompletion();
    if (pendingCompletion) {
        try {
            await pendingCompletion;
        } catch {
            // This boot WAS the callback and its exchange failed. Falling through to the session check would
            // read "no session" and redirect — and Cloudflare, already holding a valid Zero Trust session,
            // bounces straight back here with a fresh code. That is an unbounded boot loop for exactly the
            // failures a first setup produces: wrong client ID, unregistered redirect URI, clock skew.
            // No module-state guard can stop it; every bounce is a fresh page load.
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
 * Call once during boot, after handleCloudflareAuthRedirectCallback(). Resolves immediately on a build with
 * no Cloudflare credentials, and without redirecting on any non-QA build. When it does redirect, the returned
 * promise never settles — the page is leaving.
 */
function ensureQAAuthenticated(): Promise<void> {
    // The only check that is honest synchronously: CONFIG is baked into the bundle. A build with no
    // credentials must boot normally rather than pay for two hydration awaits it can do nothing with.
    if (!isQAAuthConfigured()) {
        return Promise.resolve();
    }
    gatePromise ??= runGate();
    return gatePromise;
}

/**
 * Called when a QA request fails with CF_REAUTH_REQUIRED — the session is dead and refresh cannot save it.
 * On a QA build nothing works without a token, so re-authorizing is the only useful response. No hydration
 * await here, deliberately: a QA request already went out, which means the signal was hydrated to route it.
 *
 * No caller yet: HttpUtils gains one when QA routing lands, in the same way fetchWithQAAuth stays standalone
 * until then.
 */
function handleQAReauthRequired(): void {
    if (!shouldAuthenticate()) {
        return;
    }
    startRedirect();
}

export {ensureQAAuthenticated, handleQAReauthRequired};
