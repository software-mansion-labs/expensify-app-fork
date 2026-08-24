/**
 * The single place that decides to navigate this tab to Cloudflare.
 *
 * On a QA build every API call — including the Expensify sign-in POST — goes to a Zero Trust-protected
 * origin, so the Cloudflare handshake has to complete before the app makes its first request, not after the
 * user signs in. A redirect needs no user activation, so this can run from boot code and from the network
 * layer alike; that is the whole reason the flow moved off the popup transport.
 */
import {getActiveServer, isQAServerActive, waitForActiveServerHydration} from '@libs/ApiUtils';
import {isQAAuthConfigured} from '@libs/CloudflareAccess/Config';
// TEMPORARY debug instrumentation for the QA Cloudflare flow. Remove with the QAAuthTrace directory.
import {describeError, traceQAAuth} from '@libs/CloudflareAccess/QAAuthTrace';
import Log from '@libs/Log';

import {beginCloudflareAuthRedirect, getCloudflareSession, getPendingCloudflareAuthCompletion, waitForCloudflareSessionHydration} from '@userActions/CloudflareSession';

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
        // TEMPORARY debug instrumentation: the last record written before the tab leaves for Cloudflare
        traceQAAuth('gate.startRedirect');
        await beginCloudflareAuthRedirect();
    } catch (error) {
        // TEMPORARY debug instrumentation: a redirect that never happened, which otherwise only reaches the logger
        traceQAAuth('gate.redirectFailed', {error: describeError(error)});
        Log.warn('[CloudflareAccess] Failed to start the QA auth redirect', {error});
    }
}

async function runGate(): Promise<void> {
    // Both signals below are Onyx-backed and neither is readable on the boot tick: ACTIVE_SERVER arrives via
    // ApiUtils (which itself waits on getEnvironment() before subscribing), CLOUDFLARE_SESSION via the session cache.
    // Deciding before they hydrate reads "production, no session" on every build, QA included.
    await Promise.all([waitForActiveServerHydration(), waitForCloudflareSessionHydration()]);

    // This boot may BE the callback: a code is already being exchanged, and redirecting would burn it.
    const pendingCompletion = getPendingCloudflareAuthCompletion();

    // TEMPORARY debug instrumentation: the two Onyx-backed signals the whole decision rests on, recorded the
    // moment they are first readable. `stored: undefined` on activeServer.resolved plus 'production' here means
    // the QA switch was never on for this load.
    traceQAAuth('gate.hydrated', {
        activeServer: getActiveServer(),
        hasCloudflareSession: !!getCloudflareSession(),
        hasPendingCompletion: !!pendingCompletion,
    });

    if (pendingCompletion) {
        try {
            await pendingCompletion;
            // TEMPORARY debug instrumentation
            traceQAAuth('gate.pendingCompletionResolved', {hasCloudflareSession: !!getCloudflareSession()});
        } catch (error) {
            // TEMPORARY debug instrumentation: the deliberate silent early return below is exactly what makes a
            // failed first-setup exchange invisible, so it has to announce itself here.
            traceQAAuth('gate.pendingCompletionFailed', {error: describeError(error)});
            // This boot WAS the callback and its exchange failed. Falling through to the session check would
            // read "no session" and redirect — and Cloudflare, already holding a valid Zero Trust session,
            // bounces straight back here with a fresh code. That is an unbounded boot loop for exactly the
            // failures a first setup produces: wrong client ID, unregistered redirect URI, clock skew.
            // No module-state guard can stop it; every bounce is a fresh page load.
            return;
        }
    }

    const hasSession = !!getCloudflareSession();
    const shouldAuth = shouldAuthenticate();
    // TEMPORARY debug instrumentation: the branch actually taken, so "did nothing" is distinguishable from
    // "redirected" — the gate.startRedirect record that follows, or does not, answers which
    traceQAAuth('gate.decision', {shouldAuthenticate: shouldAuth, hasCloudflareSession: hasSession});

    if (!shouldAuth || hasSession) {
        return;
    }

    await startRedirect();
}

/** Single-flight: the decision spans several awaits, so two callers must not both reach the redirect */
let gatePromise: Promise<void> | null = null;

/**
 * Call once during boot, after consumeCloudflareAuthCallbackURL(). Resolves immediately on a build with
 * no Cloudflare credentials, and without redirecting on any non-QA build. When it does redirect, the returned
 * promise never settles — the page is leaving.
 */
function ensureQAAuthenticated(): Promise<void> {
    // The only check that is honest synchronously: CONFIG is baked into the bundle. A build with no
    // credentials must boot normally rather than pay for two hydration awaits it can do nothing with.
    if (!isQAAuthConfigured()) {
        // TEMPORARY debug instrumentation: a build with no credentials never reaches any other record below
        traceQAAuth('gate.notConfigured');
        return Promise.resolve();
    }
    // TEMPORARY debug instrumentation: shows whether this call started the gate or joined a running one
    traceQAAuth('gate.enter', {alreadyRunning: !!gatePromise});
    gatePromise ??= runGate();
    return gatePromise;
}

/**
 * Called when a QA request fails with CF_REAUTH_REQUIRED — the session is dead and refresh cannot save it.
 * On a QA build nothing works without a token, so re-authorizing is the only useful response. No hydration
 * await here, deliberately: a QA request already went out, which means the signal was hydrated to route it.
 */
function handleQAReauthRequired(): void {
    // TEMPORARY debug instrumentation: a request gave up on the session entirely
    traceQAAuth('gate.reauthRequired', {shouldAuthenticate: shouldAuthenticate()});
    if (!shouldAuthenticate()) {
        return;
    }
    startRedirect();
}

export {ensureQAAuthenticated, handleQAReauthRequired};
