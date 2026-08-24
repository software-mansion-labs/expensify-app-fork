/**
 * Exchange half of the same-tab OAuth redirect. The callback URL was already read and rewritten by the
 * capture phase, which runs earlier in boot; all that is left is to spend the authorization code it
 * approved. Kept separate because this half needs an initialised Onyx to persist the session it produces,
 * and so cannot run as early as the URL rewrite has to.
 */
import {getCapturedCloudflareAuthCallback} from '@libs/CloudflareAccess/captureAuthCallbackURL';

import {completeCloudflareAuthRedirect} from '@userActions/CloudflareSession';

import CONFIG from '@src/CONFIG';

import type {CloudflareAuthRedirectOutcome, ConsumeCloudflareAuthCallbackURL, GetCloudflareAuthRedirectOutcome} from './types';

let lastOutcome: CloudflareAuthRedirectOutcome = 'not-a-callback';
let lastErrorMessage: string | undefined;

const consumeCloudflareAuthCallbackURL: ConsumeCloudflareAuthCallbackURL = () => {
    const captured = getCapturedCloudflareAuthCallback();
    lastOutcome = captured.outcome;
    lastErrorMessage = captured.errorMessage;

    if (captured.exchange) {
        // Fire and forget. The catch records the failure as the observable outcome, since the completion
        // promise clears as it settles. It runs a microtask later, so it always lands after the synchronous
        // 'exchanging'. Both handlers attach to the same promise rather than chaining .then().catch(): a
        // chain would push the rejection one extra microtask out, and the outcome is read by callers that
        // only wait one.
        completeCloudflareAuthRedirect(captured.exchange).catch((error: unknown) => {
            lastOutcome = 'exchange-failed';
            lastErrorMessage = error instanceof Error ? error.message : String(error);
        });
    }

    return lastOutcome;
};

const getCloudflareAuthRedirectOutcome: GetCloudflareAuthRedirectOutcome = () => ({outcome: lastOutcome, errorMessage: lastErrorMessage});

export {consumeCloudflareAuthCallbackURL, getCloudflareAuthRedirectOutcome};
