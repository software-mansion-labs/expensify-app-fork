/**
 * Callback-boot half of the same-tab OAuth redirect: Cloudflare delivers the authorization code as this
 * document's own location, so it is picked up during boot, before any render, and the URL is rewritten
 * back to where the user came from (no app route lives at the redirect path).
 */
import {getOAuthRedirectURI, isQAAuthConfigured} from '@libs/CloudflareAccess/Config';
import {OAuthError} from '@libs/CloudflareAccess/OAuthClient';
import {consumePendingAuthFlow} from '@libs/CloudflareAccess/PendingAuthFlowStorage';
// TEMPORARY debug instrumentation for the QA Cloudflare flow. Remove with the QAAuthTrace directory.
import {fingerprint, traceQAAuth} from '@libs/CloudflareAccess/QAAuthTrace';

import {completeCloudflareAuthRedirect} from '@userActions/CloudflareSession';

import CONFIG from '@src/CONFIG';

import type {CloudflareAuthRedirectOutcome, ConsumeCloudflareAuthCallbackURL, GetCloudflareAuthRedirectOutcome} from './types';

/**
 * TEMPORARY debug instrumentation: a build with no QA fields at all cannot take part in this flow and has
 * nothing to diagnose, so it records nothing. A build with some fields set still records why
 * isQAAuthConfigured() rejected it, which is the case worth seeing.
 */
const hasAnyQAAuthConfig = !!(CONFIG.QA_AUTH.API_ROOT || CONFIG.QA_AUTH.TEAM_DOMAIN || CONFIG.QA_AUTH.CLIENT_ID);

let lastOutcome: CloudflareAuthRedirectOutcome = 'not-a-callback';
let lastErrorMessage: string | undefined;

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

function runCallback(): CloudflareAuthRedirectOutcome {
    lastErrorMessage = undefined;

    // TEMPORARY debug instrumentation: the first thing that runs in the flow, so it is where the baked-in
    // config belongs. Everything here comes from the bundle, so it is readable synchronously and cannot lie.
    if (hasAnyQAAuthConfig) {
        traceQAAuth('boot', {
            environment: CONFIG.ENVIRONMENT,
            isQAAuthConfigured: isQAAuthConfigured(),
            qaApiRoot: CONFIG.QA_AUTH.API_ROOT,
            qaSecureApiRoot: CONFIG.QA_AUTH.SECURE_API_ROOT,
            qaTeamDomain: CONFIG.QA_AUTH.TEAM_DOMAIN,
            qaClientID: fingerprint(CONFIG.QA_AUTH.CLIENT_ID),
            qaCheckPath: CONFIG.QA_AUTH.CHECK_PATH,
            redirectURI: getOAuthRedirectURI(),
            isUsingLocalWeb: CONFIG.IS_USING_LOCAL_WEB,
        });
    }

    if (!isQAAuthConfigured()) {
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
        // TEMPORARY debug instrumentation: separates "this load is not the callback" from a path that almost matched
        traceQAAuth('callback.pathMismatch', {pathname: window.location.pathname, callbackPath});
        lastOutcome = 'not-a-callback';
        return lastOutcome;
    }

    // Params read before the rewrite, flow consumed before any validation: the record is single-use, so a
    // replayed callback finds nothing however this call ends.
    const params = new URL(window.location.href).searchParams;
    const flow = consumePendingAuthFlow();

    // TEMPORARY debug instrumentation: whether the sessionStorage record survived the round trip, and what
    // the provider sent back. State and code are fingerprinted, never recorded.
    traceQAAuth('callback.received', {
        hasPendingFlow: !!flow,
        flowAgeMs: flow ? Date.now() - flow.createdAt : null,
        returnURL: flow?.returnURL ?? null,
        stateFromFlow: fingerprint(flow?.state),
        stateFromURL: fingerprint(params.get('state')),
        hasCode: params.has('code'),
        providerError: params.get('error'),
        providerErrorDescription: params.get('error_description'),
    });

    // Unconditional: even an invalid callback must leave the user on a real route
    window.history.replaceState(null, '', toSafeReturnPath(flow?.returnURL));

    if (!flow) {
        lastOutcome = 'no-pending-flow';
        lastErrorMessage = 'No pending QA auth flow in this tab — start the sign-in again';
        return lastOutcome;
    }

    // State first: a callback that fails provenance is discarded wholesale, its other params untrusted
    if (params.get('state') !== flow.state) {
        lastOutcome = 'invalid-callback';
        lastErrorMessage = 'OAuth callback state mismatch';
        return lastOutcome;
    }

    const oauthError = params.get('error');
    if (oauthError) {
        // e.g. access_denied, never attempt the exchange
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

    // Fire and forget. The catch records the failure as the observable outcome, since the completion promise
    // clears as it settles. It runs a microtask later, so it always lands after the synchronous 'exchanging'.
    // Both handlers attach to the same promise rather than chaining .then().catch(): a chain would push the
    // rejection one extra microtask out, and the outcome is read by callers that only wait one.
    completeCloudflareAuthRedirect({code, codeVerifier: flow.codeVerifier}).then(
        () => {
            // TEMPORARY debug instrumentation: the success half, so a silent exchange is distinguishable from none
            traceQAAuth('callback.exchangeSucceeded');
        },
        (error: unknown) => {
            lastOutcome = 'exchange-failed';
            lastErrorMessage = error instanceof Error ? error.message : String(error);
            // TEMPORARY debug instrumentation: this failure is otherwise swallowed by the gate's boot-loop guard
            traceQAAuth('callback.exchangeFailed', {error: lastErrorMessage});
        },
    );

    lastOutcome = 'exchanging';
    return lastOutcome;
}

const consumeCloudflareAuthCallbackURL: ConsumeCloudflareAuthCallbackURL = () => {
    const outcome = runCallback();
    // TEMPORARY debug instrumentation: the outcome is already computed, it was just never surfaced anywhere
    if (hasAnyQAAuthConfig) {
        traceQAAuth('callback.outcome', {outcome, errorMessage: lastErrorMessage ?? null});
    }
    return outcome;
};

const getCloudflareAuthRedirectOutcome: GetCloudflareAuthRedirectOutcome = () => ({outcome: lastOutcome, errorMessage: lastErrorMessage});

export {consumeCloudflareAuthCallbackURL, getCloudflareAuthRedirectOutcome};
