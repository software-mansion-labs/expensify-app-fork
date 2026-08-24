/**
 * Test-tool probe: drives the session decision tree and fires one authenticated request at the QA origin.
 * Nothing in the app routes to QA yet, so this is the only way to exercise the whole flow end to end.
 */
import HttpUtils from '@libs/HttpUtils';
import {isRecord} from '@libs/ObjectUtils';

import CONFIG from '@src/CONFIG';
import CONST from '@src/CONST';

import {redirectToCloudflareSignIn, getCloudflareSession, getPendingCloudflareCodeExchange, waitForCloudflareSessionHydration} from './CloudflareSession';

type CloudflareAuthProbeStatus = 'success' | 'reauthRequired' | 'signInFailed' | 'error';

type CloudflareAuthProbeResult = {
    /** Semantic outcome. The UI translates these */
    status: CloudflareAuthProbeStatus;

    /** Raw diagnostic (server echo / error text), deliberately untranslated */
    detail?: string;
};

type CloudflareAuthProbeOptions = {
    /** A press made after seeing reauthRequired. It consents to navigation, so a terminal refresh failure redirects instead of reporting again */
    shouldRedirectOnReauthRequired?: boolean;
};

/**
 * Never rejects. Every failure comes back as a semantic result, so the UI consumes it with `.then` only.
 * With no session it navigates the tab away and never settles. A session that `HttpUtils` finds dead
 * redirects there too, except when QA is not the active server. Nothing downstream may navigate then, so
 * the consenting second press (see the options) is the only thing that can.
 */
async function runCloudflareAuthProbe({shouldRedirectOnReauthRequired = false}: CloudflareAuthProbeOptions = {}): Promise<CloudflareAuthProbeResult> {
    try {
        await waitForCloudflareSessionHydration();
        // A callback boot may still be exchanging the code. Join it instead of starting a second round trip
        const pendingCompletion = getPendingCloudflareCodeExchange();
        if (pendingCompletion) {
            try {
                await pendingCompletion;
            } catch (error) {
                return {status: 'signInFailed', detail: error instanceof Error ? error.message : undefined};
            }
        }

        if (!getCloudflareSession()) {
            // Never settles. Nothing below runs
            await redirectToCloudflareSignIn();
        }

        // The real client, so the probe exercises the app's own path. The bearer, the pre-expiry refresh and
        // the 401 fallback all live in HttpUtils, which is why there is no near-expiry branch of our own here.
        // Typed as unknown, not as the API Response it is declared to be: the field read below is a QA-only
        // diagnostic the shared response type knows nothing about
        const body: unknown = await HttpUtils.processHTTPRequest(`${CONFIG.QA_AUTH.API_ROOT}${CONFIG.QA_AUTH.CHECK_PATH}`, CONST.NETWORK.METHOD.POST);
        // Cloudflare resolves the token at the edge and injects the user's JWT, so the origin can echo back
        // how the request authenticated. Read loosely: it is a diagnostic, not a contract.
        const authenticatedVia = isRecord(body) && typeof body.authenticatedVia === 'string' ? body.authenticatedVia : null;
        return {status: 'success', detail: `authenticatedVia: ${authenticatedVia ?? 'null'}`};
    } catch (error) {
        if (error instanceof Error && error.message === CONST.ERROR.CF_REAUTH_REQUIRED) {
            if (shouldRedirectOnReauthRequired) {
                try {
                    await redirectToCloudflareSignIn();
                } catch (redirectError) {
                    return {status: 'error', detail: redirectError instanceof Error ? redirectError.message : undefined};
                }
            }
            return {status: 'reauthRequired'};
        }
        return {status: 'error', detail: error instanceof Error ? error.message : undefined};
    }
}

export {runCloudflareAuthProbe};
export type {CloudflareAuthProbeResult, CloudflareAuthProbeStatus};
