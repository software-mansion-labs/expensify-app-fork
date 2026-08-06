/**
 * Callback-boot half of the same-tab OAuth redirect (see Web_POC_ExpoWebBrowser.md). Runs once at App
 * module scope, before any render: the popup transport received the callback URL as a promise result, but
 * a top-level redirect delivers it as this document's own location, so it has to be picked up during boot.
 *
 * The URL is rewritten back to where the user came from with `history.replaceState` before React
 * Navigation reads `window.location` — no app route lives at the redirect path, so without the rewrite the
 * boot would fall through to /not-found (verified — Web_POC.md §3.7).
 */
import {completeQAAuthRedirect} from '@userActions/CloudflareSession';

import {getOAuthRedirectURI, isQAAuthConfigured} from './config';
import {OAuthError} from './oauthClient';
import {consumePendingRedirectFlow} from './redirectFlowStorage';

type QAAuthRedirectOutcome =
    /** Every normal boot, every native boot, and every boot without QA auth configured */
    | 'not-a-callback'
    /** The code exchange started; join it with getPendingQAAuthCompletion() */
    | 'exchanging'
    /** State mismatch or no authorization code — nothing was exchanged */
    | 'invalid-callback'
    /** Cloudflare reported an OAuth error (e.g. access_denied) */
    | 'provider-error'
    /** No stored flow in this tab: a replayed callback URL, or one opened in a different tab */
    | 'no-pending-flow';

let lastOutcome: QAAuthRedirectOutcome = 'not-a-callback';
let lastErrorMessage: string | undefined;

/**
 * Where to send the user after the callback. Same-origin only: the value comes from our own
 * sessionStorage, but it is the one field that gets fed back into navigation, so it is treated as tainted.
 */
function toSafeReturnPath(returnURL: string | undefined): string {
    if (!returnURL) {
        return '/';
    }
    try {
        const parsed = new URL(returnURL, window.location.origin);
        if (parsed.origin !== window.location.origin) {
            return '/';
        }
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return '/';
    }
}

/**
 * Handles this document if it is an OAuth callback. Call once at App module scope, before any render.
 * No-op on every other load, on native, and when QA auth is not configured.
 */
function handleQAAuthRedirectCallback(): QAAuthRedirectOutcome {
    lastErrorMessage = undefined;

    if (typeof window === 'undefined' || !isQAAuthConfigured()) {
        lastOutcome = 'not-a-callback';
        return lastOutcome;
    }

    let callbackPath: string;
    try {
        callbackPath = new URL(getOAuthRedirectURI()).pathname;
    } catch {
        lastOutcome = 'not-a-callback';
        return lastOutcome;
    }

    if (window.location.pathname !== callbackPath) {
        lastOutcome = 'not-a-callback';
        return lastOutcome;
    }

    // Read the params before rewriting the URL, and consume the stored flow before validating anything:
    // the record is single-use, so a replayed callback finds nothing regardless of how this call ends.
    const params = new URL(window.location.href).searchParams;
    const flow = consumePendingRedirectFlow();

    // Rewrite first, and unconditionally: an invalid callback must still leave the user on a real route
    // rather than stranded on the redirect path. The params are already captured above.
    window.history.replaceState(null, '', toSafeReturnPath(flow?.returnURL));

    if (!flow) {
        lastOutcome = 'no-pending-flow';
        lastErrorMessage = 'No pending QA auth flow in this tab — start the sign-in again';
        return lastOutcome;
    }

    // State first: a callback that fails provenance is discarded wholesale — its error and code params
    // are untrusted data and must not be interpreted at all.
    if (params.get('state') !== flow.state) {
        lastOutcome = 'invalid-callback';
        lastErrorMessage = 'OAuth callback state mismatch';
        return lastOutcome;
    }

    const oauthError = params.get('error');
    if (oauthError) {
        // e.g. access_denied — the provider refused; never attempt the exchange
        lastOutcome = 'provider-error';
        lastErrorMessage = new OAuthError(oauthError, params.get('error_description') ?? undefined).message;
        return lastOutcome;
    }

    const code = params.get('code');
    if (!code) {
        lastOutcome = 'invalid-callback';
        lastErrorMessage = 'OAuth callback is missing the authorization code';
        return lastOutcome;
    }

    // Fire and forget: nothing is awaiting this at module scope. The catch is what keeps an exchange
    // failure from surfacing as an unhandled rejection — callers that join via
    // getPendingQAAuthCompletion() still observe the rejection on their own handler.
    completeQAAuthRedirect({code, codeVerifier: flow.codeVerifier}).catch((error: unknown) => {
        lastErrorMessage = error instanceof Error ? error.message : String(error);
    });

    lastOutcome = 'exchanging';
    return lastOutcome;
}

/** What the boot-time callback handling concluded, for UI that wants to surface a failed round trip */
function getQAAuthRedirectOutcome(): {outcome: QAAuthRedirectOutcome; errorMessage?: string} {
    return {outcome: lastOutcome, errorMessage: lastErrorMessage};
}

export {getQAAuthRedirectOutcome, handleQAAuthRedirectCallback};
export type {QAAuthRedirectOutcome};
