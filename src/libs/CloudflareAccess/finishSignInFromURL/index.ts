/**
 * Exchange half of the same-tab OAuth redirect. The callback URL was already read and rewritten by the
 * capture phase, which runs earlier in boot; all that is left is to spend the authorization code it
 * approved. Kept separate because this half needs an initialised Onyx to persist the session it produces,
 * and so cannot run as early as the URL rewrite has to.
 */
import {getCapturedCloudflareAuthCallback} from '@libs/CloudflareAccess/captureAuthCallbackURL';
import Log from '@libs/Log';

import {exchangeCodeForCloudflareSession} from '@userActions/CloudflareSession';

import type {FinishCloudflareSignInFromURL} from './types';

const finishCloudflareSignInFromURL: FinishCloudflareSignInFromURL = () => {
    const captured = getCapturedCloudflareAuthCallback();
    if (captured.errorMessage) {
        Log.warn('Cloudflare sign-in callback did not complete', {outcome: captured.outcome, errorMessage: captured.errorMessage});
    }

    if (captured.exchange) {
        // Fire and forget: boot cannot wait on the round trip. The catch is not optional — an unhandled
        // rejection is reported as a crash
        exchangeCodeForCloudflareSession(captured.exchange).catch((error: unknown) => {
            Log.warn('Cloudflare code exchange failed', {errorMessage: error instanceof Error ? error.message : String(error)});
        });
    }

    return captured.outcome;
};

export default finishCloudflareSignInFromURL;
