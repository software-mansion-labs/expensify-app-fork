/**
 * On a QA build every API call — including the Expensify sign-in POST — goes to a Zero Trust-protected
 * origin, so the Cloudflare handshake has to complete before that first request is sent, not after the user
 * signs in.
 */
import {READ_COMMANDS, SIDE_EFFECT_REQUEST_COMMANDS, WRITE_COMMANDS} from '@libs/API/types';
import {isQAServerActive, waitForActiveServerHydration} from '@libs/ApiUtils';
import {isQAAuthConfigured} from '@libs/CloudflareAccess/Config';
import Log from '@libs/Log';

import {redirectToCloudflareSignIn, getCloudflareSession, getPendingCloudflareCodeExchange, waitForCloudflareSessionHydration} from '@userActions/CloudflareSession';

import type {EnsureQAAuthenticated, HandleQAReauthRequired} from './types';

/**
 * The commands allowed to navigate this tab to Cloudflare. A redirect is a full page load: it discards
 * whatever the person had typed and takes the screen out from under them, so the right to cause one belongs
 * only to requests the app cannot get anywhere without.
 *
 * Denied does not mean blocked: such a request still goes out with whatever session exists, and still
 * refreshes a near-expiry token, because neither of those is visible. It just fails rather than navigating
 * when there is no session to be had, and the next allowlisted request re-establishes one.
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

function mayCommandStartHandshake(command: string | undefined): boolean {
    return !!command && COMMANDS_THAT_MAY_START_HANDSHAKE.has(command);
}

function shouldAuthenticate(): boolean {
    return isQAAuthConfigured() && isQAServerActive();
}

async function startRedirect(): Promise<void> {
    try {
        await redirectToCloudflareSignIn();
    } catch (error) {
        Log.warn('[CloudflareAccess] Failed to start the QA auth redirect', {error});
    }
}

/**
 * Every QA request awaits this: a request that goes out while the session is still hydrating can only 401,
 * which is a wasted round trip whatever the command.
 */
async function awaitGateSignals(): Promise<'may-redirect' | 'must-not-redirect'> {
    // Deciding before these two Onyx-backed signals hydrate reads "production, no session" on every build,
    // QA included, and the first request of a page load can easily beat them.
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
        // session, bounces straight back here with a fresh code. That is an unbounded redirect loop, and no
        // module-state guard can stop it; every bounce is a fresh page load.
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

const ensureQAAuthenticated: EnsureQAAuthenticated = (command) => {
    // The only check that is honest synchronously: CONFIG is baked into the bundle
    if (!isQAAuthConfigured()) {
        return Promise.resolve();
    }

    // Sharing the single-flight promise either way would let whichever request arrived first decide for the
    // other: a background flush could swallow the sign-in's redirect, or borrow one it is not entitled to.
    if (!mayCommandStartHandshake(command)) {
        return awaitGateSignals().then(() => {});
    }

    // The gate reads `activeServer`, which the test-tool switch changes mid-session: flipping it to QA signs
    // the user out client-side without reloading, so a cached "nothing to do" from an earlier run would be
    // the last word for the rest of the page and every QA request would go out with no bearer.
    gatePromise ??= runGate().finally(() => {
        gatePromise = null;
    });
    return gatePromise;
};

/** No hydration await here, deliberately: a QA request already went out, which means the signal was hydrated to route it */
const handleQAReauthRequired: HandleQAReauthRequired = (command) => {
    const mayRedirect = mayCommandStartHandshake(command);
    if (!shouldAuthenticate() || !mayRedirect) {
        return;
    }
    startRedirect();
};

export {ensureQAAuthenticated, handleQAReauthRequired};
