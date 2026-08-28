/**
 * On a QA build every API call — including the Expensify sign-in POST — goes to a Zero Trust-protected
 * origin, so the Cloudflare handshake has to complete before that first request is sent.
 */
import {READ_COMMANDS, SIDE_EFFECT_REQUEST_COMMANDS, WRITE_COMMANDS} from '@libs/API/types';
import {isQAServerActive, waitForActiveServerHydration} from '@libs/ApiUtils';
import {isQAAuthConfigured} from '@libs/CloudflareAccess/Config';
import Log from '@libs/Log';

import {getCloudflareSession, getPendingCloudflareCodeExchange, startCloudflareSignIn, waitForCloudflareSessionHydration} from '@userActions/CloudflareSession';

import type {EnsureQAAuthenticated, HandleQAReauthRequired, QAAuthGateResult} from './types';

/**
 * Denied does not mean blocked: such a request still goes out with whatever session exists, and still
 * refreshes a near-expiry token. It fails rather than authenticating when there is no session to be had, and
 * the next allowlisted request re-establishes one.
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

async function awaitGateSignals(): Promise<'may-authenticate' | 'must-not-authenticate'> {
    // Deciding before these two Onyx-backed signals hydrate reads "production, no session" on every build,
    // QA included, and the first request of a page load can easily beat them.
    await Promise.all([waitForActiveServerHydration(), waitForCloudflareSessionHydration()]);

    // This page load may BE the callback: a code is already being exchanged, and authenticating would burn it.
    const pendingCompletion = getPendingCloudflareCodeExchange();

    if (!pendingCompletion) {
        return 'may-authenticate';
    }

    try {
        await pendingCompletion;
        return 'may-authenticate';
    } catch {
        // This page load WAS the callback and its exchange failed. Falling through to the session check
        // would read "no session" and redirect — and Cloudflare, already holding a valid Zero Trust
        // session, bounces straight back here with a fresh code. That is an unbounded redirect loop, and no
        // module-state guard can stop it; every bounce is a fresh page load.
        return 'must-not-authenticate';
    }
}

async function runGate(): Promise<QAAuthGateResult> {
    if ((await awaitGateSignals()) === 'must-not-authenticate') {
        return 'ready';
    }

    if (!shouldAuthenticate() || getCloudflareSession()) {
        return 'ready';
    }

    // Never returns on web. On native a cancelled or failed sign-in is reported, so the caller can fail the
    // request instead of sending it bearer-less into a 401 the retry path cannot rescue either
    const outcome = await startCloudflareSignIn().catch((error: unknown) => {
        Log.warn('[CloudflareAccess] QA sign-in did not complete', {errorMessage: error instanceof Error ? error.message : String(error)});
        return 'failed' as const;
    });
    return outcome === 'session-established' ? 'ready' : 'reauth-required';
}

let gatePromise: Promise<QAAuthGateResult> | null = null;

const ensureQAAuthenticated: EnsureQAAuthenticated = async (command) => {
    // The only check that is honest synchronously: CONFIG is baked into the bundle
    if (!isQAAuthConfigured()) {
        return 'ready';
    }

    // Sharing the single-flight promise either way would let whichever request arrived first decide for the
    // other: a background flush could swallow the sign-in's handshake, or borrow one it is not entitled to.
    if (!mayCommandStartHandshake(command)) {
        await awaitGateSignals();
        // Native stays alive through the browser session, so a handshake can be in flight right now and it is
        // the only thing that will ever produce a bearer for this request. Web has no such window: the page
        // is gone. A handshake starting immediately after this read is still missed, and still recovers on
        // the next allowlisted request.
        await gatePromise;
        return 'ready';
    }

    // The gate reads `activeServer`, which changes mid-session: flipping it to QA signs the user out
    // client-side without reloading, so a cached "nothing to do" from an earlier run would be the last word
    // for the rest of the page and every QA request would go out with no bearer.
    gatePromise ??= runGate().finally(() => {
        gatePromise = null;
    });
    return gatePromise;
};

/** No hydration await: a QA request already went out, which means the signal was hydrated to route it */
const handleQAReauthRequired: HandleQAReauthRequired = (command) => {
    if (!shouldAuthenticate() || !mayCommandStartHandshake(command)) {
        return;
    }
    // The catch is not optional — an unhandled rejection is reported as a crash
    startCloudflareSignIn().catch((error: unknown) => {
        Log.warn('[CloudflareAccess] Failed to start the QA sign-in', {errorMessage: error instanceof Error ? error.message : String(error)});
    });
};

export {ensureQAAuthenticated, handleQAReauthRequired};
