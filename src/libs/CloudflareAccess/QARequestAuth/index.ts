import {ensureQAAuthenticated, handleQAReauthRequired} from '@libs/CloudflareAccess/ensureQAAuthenticated';
import HttpsError from '@libs/Errors/HttpsError';

import {getCloudflareSession, isSessionNearExpiry, markCloudflareSessionRejected, refreshCloudflareSession} from '@userActions/CloudflareSession';

import CONST from '@src/CONST';

import type {HandleQAUnauthorized, PrepareQARequestAuth, QARequestAuth} from './types';

function buildQARequestAuth(accessToken: string): QARequestAuth {
    return {accessToken, headers: {Authorization: `Bearer ${accessToken}`}};
}

function failAsReauthRequired(): never {
    throw new HttpsError({message: CONST.ERROR.CF_REAUTH_REQUIRED, status: CONST.HTTP_STATUS.UNAUTHORIZED.toString()});
}

function throwQAReauthRequired(command: string | undefined): never {
    handleQAReauthRequired(command);
    failAsReauthRequired();
}

const prepareQARequestAuth: PrepareQARequestAuth = async (command) => {
    // A bearer-less QA request can only 401, and the 401 handler cannot rescue it either, because it keys
    // off a token that does not exist yet
    // Not `throwQAReauthRequired`: the gate just ran a handshake and it was cancelled or failed, so starting
    // another one here would reopen the browser the user dismissed a moment ago
    if ((await ensureQAAuthenticated(command)) === 'reauth-required') {
        failAsReauthRequired();
    }

    const session = getCloudflareSession();
    if (session && isSessionNearExpiry(session) && (await refreshCloudflareSession(session.accessToken)) === 'reauth-required') {
        throwQAReauthRequired(command);
    }

    const accessToken = getCloudflareSession()?.accessToken;
    return accessToken ? buildQARequestAuth(accessToken) : undefined;
};

const handleQAUnauthorized: HandleQAUnauthorized = async ({accessToken}, {isRetry, command}) => {
    if (isRetry) {
        markCloudflareSessionRejected(accessToken);
        throwQAReauthRequired(command);
    }

    if ((await refreshCloudflareSession(accessToken)) === 'reauth-required') {
        throwQAReauthRequired(command);
    }

    const rotatedAccessToken = getCloudflareSession()?.accessToken;
    if (!rotatedAccessToken) {
        // The session was cleared while the refresh was in flight: no credential to retry with
        throwQAReauthRequired(command);
    }
    return buildQARequestAuth(rotatedAccessToken);
};

export {handleQAUnauthorized, prepareQARequestAuth};
