/**
 * The single place that decides to navigate this tab to Cloudflare.
 *
 * On a QA build every API call — including the Expensify sign-in POST — goes to a Zero Trust-protected
 * origin, so the Cloudflare handshake has to complete before that first request is sent, not after the user
 * signs in. It runs on demand from the network layer rather than at startup, which is what keeps a signed-out
 * tab with the QA switch on where it is: no QA request, no redirect — and on the sign-in screen the first QA
 * request is normally the login itself. A redirect needs no user activation, so the network layer can start
 * one with no user gesture in hand; that is the whole reason the flow moved off the popup transport.
 *
 * That same freedom is why only the commands named below may cause one. Any request could otherwise navigate
 * the tab, which means background traffic could too, and a log flush landing mid-typing would take the page
 * away for reasons the person watching cannot connect to anything they did.
 */
import {READ_COMMANDS, SIDE_EFFECT_REQUEST_COMMANDS, WRITE_COMMANDS} from '@libs/API/types';
import {isQAServerActive, waitForActiveServerHydration} from '@libs/ApiUtils';
import {isQAAuthConfigured} from '@libs/CloudflareAccess/Config';
import Log from '@libs/Log';

import {redirectToCloudflareSignIn, getCloudflareSession, getPendingCloudflareCodeExchange, waitForCloudflareSessionHydration} from '@userActions/CloudflareSession';

import type {EnsureQAAuthenticated, HandleQAReauthRequired} from './types';

/**
 * The commands allowed to navigate this tab to Cloudflare, and nothing else is. A redirect is a full page
 * load: it discards whatever the person had typed and takes the screen out from under them, so the right to
 * cause one belongs only to requests the app cannot get anywhere without. These are exactly those — the
 * sign-in exchange, and the two commands that load the app once signed in. On QA the sign-in POST itself
 * goes to the Zero Trust origin, which is why the list starts on the sign-in screen rather than after it.
 *
 * Everything else — telemetry, prefetches, polling, anything the user is not waiting on — is denied. Denied
 * does not mean blocked: such a request still goes out with whatever session exists, and still refreshes a
 * near-expiry token, because neither of those is visible. It just fails rather than navigating when there is
 * no session to be had, and the next allowlisted request re-establishes one. A background log flush taking
 * the page away mid-typing is the failure this prevents.
 */
const COMMANDS_THAT_MAY_START_HANDSHAKE = new Set<string>([
    READ_COMMANDS.BEGIN_SIGNIN,
    READ_COMMANDS.SIGN_IN_WITH_SHORT_LIVED_AUTH_TOKEN,
    READ_COMMANDS.SIGN_IN_WITH_SUPPORT_AUTH_TOKEN,
    WRITE_COMMANDS.SIGN_IN_USER,
    WRITE_COMMANDS.SIGN_IN_USER_WITH_LINK,
    WRITE_COMMANDS.SIGN_IN_WITH_APPLE,
    WRITE_COMMANDS.SIGN_IN_WITH_GOOGLE,
    WRITE_COMMANDS.OPEN_APP,
    WRITE_COMMANDS.RECONNECT_APP,
    SIDE_EFFECT_REQUEST_COMMANDS.RECONNECT_APP,
]);

/**
 * An unnamed command is denied. The name is threaded from `HttpUtils`, where it is optional, and a request
 * that arrives without one is not a command the allowlist above names — so treating it as background is both
 * the accurate reading and the safe default.
 */
function mayCommandStartHandshake(command: string | undefined): boolean {
    return !!command && COMMANDS_THAT_MAY_START_HANDSHAKE.has(command);
}

function shouldAuthenticate(): boolean {
    return isQAAuthConfigured() && isQAServerActive();
}

/**
 * "At most one navigation" is `redirectToCloudflareSignIn`'s own invariant — a second caller gets a
 * never-settling promise rather than a competing flow. All this adds is the logging: both callers sit on the
 * request path, with nobody to return an error to.
 */
async function startRedirect(): Promise<void> {
    try {
        await redirectToCloudflareSignIn();
    } catch (error) {
        Log.warn('[CloudflareAccess] Failed to start the QA auth redirect', {error});
    }
}

/**
 * Waits for everything the decision rests on, and reports whether a redirect may still be considered
 * afterwards. Every QA request awaits this, allowlisted or not: a request that goes out while the session is
 * still hydrating can only 401, which is a wasted round trip whatever the command.
 */
async function awaitGateSignals(): Promise<'may-redirect' | 'must-not-redirect'> {
    // Both signals below are Onyx-backed and neither is readable synchronously: ACTIVE_SERVER arrives via
    // ApiUtils (which itself waits on getEnvironment() before subscribing), CLOUDFLARE_SESSION via the session cache.
    // Deciding before they hydrate reads "production, no session" on every build, QA included, and the first
    // request of a page load can easily beat them.
    await Promise.all([waitForActiveServerHydration(), waitForCloudflareSessionHydration()]);

    // This page load may BE the callback: a code is already being exchanged, and redirecting would burn it.
    const pendingCompletion = getPendingCloudflareCodeExchange();

    if (!pendingCompletion) {
        return 'may-redirect';
    }

    try {
        await pendingCompletion;
        return 'may-redirect';
    } catch (error) {
        // This page load WAS the callback and its exchange failed. Falling through to the session check
        // would read "no session" and redirect — and Cloudflare, already holding a valid Zero Trust
        // session, bounces straight back here with a fresh code. That is an unbounded redirect loop for
        // exactly the failures a first setup produces: wrong client ID, unregistered redirect URI, clock
        // skew. No module-state guard can stop it; every bounce is a fresh page load.
        return 'must-not-redirect';
    }
}

async function runGate(): Promise<void> {
    if ((await awaitGateSignals()) === 'must-not-redirect') {
        return;
    }

    const hasSession = !!getCloudflareSession();
    const shouldAuth = shouldAuthenticate();

    if (!shouldAuth || hasSession) {
        return;
    }

    await startRedirect();
}

/** Single-flight: the decision spans several awaits, so two callers must not both reach the redirect */
let gatePromise: Promise<void> | null = null;

/**
 * Called before every QA request that resolves its own credential — the 401 retry path reuses the token it
 * already holds and skips this — and nowhere else, so the first allowlisted QA request of a page load is what
 * starts the handshake. Resolves immediately on a build with no Cloudflare credentials, and without
 * redirecting on any non-QA build, for any command outside `COMMANDS_THAT_MAY_START_HANDSHAKE`, or when a
 * session is already in hand. When it does redirect, the returned promise never settles — the page is leaving.
 */
const ensureQAAuthenticated: EnsureQAAuthenticated = (command) => {
    // The only check that is honest synchronously: CONFIG is baked into the bundle. A build with no
    // credentials must not pay for two hydration awaits on every request that it can do nothing with.
    if (!isQAAuthConfigured()) {
        return Promise.resolve();
    }

    // A denied command still waits for the signals — it wants whatever session exists — but takes no part in
    // the single-flight below. Sharing that promise either way would let whichever request happened to arrive
    // first decide for the other: a background flush could swallow the sign-in's redirect, or borrow one it
    // is not entitled to.
    if (!mayCommandStartHandshake(command)) {
        return awaitGateSignals().then(() => {});
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
};

/**
 * Called when a QA request fails with CF_REAUTH_REQUIRED — the session is dead and refresh cannot save it.
 * On a QA build nothing works without a token, so re-authorizing is the only useful response for a command
 * the app cannot proceed without; for anything else the request simply fails and the next allowlisted one
 * recovers the session. No hydration await here, deliberately: a QA request already went out, which means the
 * signal was hydrated to route it.
 */
const handleQAReauthRequired: HandleQAReauthRequired = (command) => {
    const mayRedirect = mayCommandStartHandshake(command);
    if (!shouldAuthenticate() || !mayRedirect) {
        return;
    }
    startRedirect();
};

export {ensureQAAuthenticated, handleQAReauthRequired};
