/**
 * Capture half of the same-tab OAuth redirect. Cloudflare delivers the authorization code as this
 * document's own location, and no app route lives at the redirect path, so the URL has to be rewritten
 * before anything can resolve a route from it — otherwise whatever reads the location first decides where
 * the boot lands, and the callback path resolves to not-found.
 *
 * Split out from the exchange for that ordering alone: everything here is synchronous and touches nothing
 * but the URL and sessionStorage, so it can run before the app's module graph is evaluated, while the token
 * exchange it authorizes must wait for Onyx to be initialised before it can persist a session.
 */
import {getOAuthRedirectURI, isQAAuthConfigured} from '@libs/CloudflareAccess/Config';
import {OAuthError} from '@libs/CloudflareAccess/OAuthClient';
import {consumePendingAuthFlow} from '@libs/CloudflareAccess/PendingAuthFlowStorage';

import CONFIG from '@src/CONFIG';

import type {CapturedAuthCallback, CaptureCloudflareAuthCallbackURL, GetCapturedCloudflareAuthCallback} from './types';

let captured: CapturedAuthCallback = {outcome: 'not-a-callback'};

/** Same-origin only: this is the one stored field fed back into navigation, so it is treated as tainted */
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

function runCapture(): CapturedAuthCallback {
    if (!isQAAuthConfigured()) {
        return {outcome: 'not-a-callback'};
    }

    let callbackPath: string;
    try {
        callbackPath = new URL(getOAuthRedirectURI()).pathname;
    } catch {
        return {outcome: 'not-a-callback'};
    }

    if (window.location.pathname !== callbackPath) {
        return {outcome: 'not-a-callback'};
    }

    // Params read before the rewrite, flow consumed before any validation: the record is single-use, so a
    // replayed callback finds nothing however this call ends.
    const params = new URL(window.location.href).searchParams;
    const flow = consumePendingAuthFlow();

    // Unconditional: even an invalid callback must leave the user on a real route
    window.history.replaceState(null, '', toSafeReturnPath(flow?.returnURL));

    if (!flow) {
        return {outcome: 'no-pending-flow', errorMessage: 'No pending QA auth flow in this tab — start the sign-in again'};
    }

    // State first: a callback that fails provenance is discarded wholesale, its other params untrusted
    if (params.get('state') !== flow.state) {
        return {outcome: 'invalid-callback', errorMessage: 'OAuth callback state mismatch'};
    }

    const oauthError = params.get('error');
    if (oauthError) {
        // e.g. access_denied, never attempt the exchange
        return {outcome: 'provider-error', errorMessage: new OAuthError(oauthError, params.get('error_description') ?? undefined).message};
    }

    const code = params.get('code');
    if (!code) {
        return {outcome: 'invalid-callback', errorMessage: 'OAuth callback is missing the authorization code'};
    }

    // 'exchanging' is claimed here rather than by the exchange phase, so the window between the two halves
    // of boot reports the callback as in progress instead of as an unexplained no-op
    return {outcome: 'exchanging', exchange: {code, codeVerifier: flow.codeVerifier}};
}

const captureCloudflareAuthCallbackURL: CaptureCloudflareAuthCallbackURL = () => {
    captured = runCapture();
    return captured;
};

const getCapturedCloudflareAuthCallback: GetCapturedCloudflareAuthCallback = () => captured;

export {captureCloudflareAuthCallbackURL, getCapturedCloudflareAuthCallback};
