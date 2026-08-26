/**
 * The QA half of the network layer: everything a request must do differently when it targets the Cloudflare
 * Access-protected QA origin.
 */
import {ensureQAAuthenticated, handleQAReauthRequired} from '@libs/CloudflareAccess/ensureQAAuthenticated';
import HttpsError from '@libs/Errors/HttpsError';

import {getCloudflareSession, isSessionNearExpiry, markCloudflareSessionRejected, refreshCloudflareSession} from '@userActions/CloudflareSession';

import CONST from '@src/CONST';

import type {HandleQAUnauthorized, PrepareQARequestAuth, QARequestAuth} from './types';

function buildQARequestAuth(accessToken: string): QARequestAuth {
    return {accessToken, headers: {Authorization: `Bearer ${accessToken}`}};
}

/**
 * The session is gone and only a fresh authorize round trip can recover it, so fail this request and ask for
 * one.
 */
function throwQAReauthRequired(command: string | undefined): never {
    handleQAReauthRequired(command);
    throw new HttpsError({message: CONST.ERROR.CF_REAUTH_REQUIRED, status: CONST.HTTP_STATUS.UNAUTHORIZED.toString()});
}

const prepareQARequestAuth: PrepareQARequestAuth = async (command) => {
    // Awaited: a bearer-less QA request can only 401, and the 401 handler cannot rescue it either, because
    // it keys off a token that does not exist yet
    await ensureQAAuthenticated(command);

    // A token inside the expiry buffer is rotated BEFORE the request, so the common case costs no wasted
    // round trip
    const session = getCloudflareSession();
    if (session && isSessionNearExpiry(session) && (await refreshCloudflareSession(session.accessToken)) === 'reauth-required') {
        throwQAReauthRequired(command);
    }

    // Read after the refresh above, so this is the rotated token and not the one that was about to expire
    const accessToken = getCloudflareSession()?.accessToken;
    return accessToken ? buildQARequestAuth(accessToken) : undefined;
};

const handleQAUnauthorized: HandleQAUnauthorized = async ({accessToken}, {isRetry, command}) => {
    if (isRetry) {
        // A freshly refreshed token still got 401: refresh demonstrably cannot fix this session
        markCloudflareSessionRejected(accessToken);
        throwQAReauthRequired(command);
    }

    if ((await refreshCloudflareSession(accessToken)) === 'reauth-required') {
        // Terminal; refreshCloudflareSession already cleared the dead session
        throwQAReauthRequired(command);
    }

    // A transient refresh failure never reaches here — refreshCloudflareSession rethrows it, so it surfaces
    // as an ordinary network error and the session stays alive
    const rotatedAccessToken = getCloudflareSession()?.accessToken;
    if (!rotatedAccessToken) {
        // The session was cleared while the refresh was in flight: no credential to retry with
        throwQAReauthRequired(command);
    }
    return buildQARequestAuth(rotatedAccessToken);
};

export {handleQAUnauthorized, prepareQARequestAuth};
