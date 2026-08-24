/**
 * The QA half of the network layer: everything a request must do differently when it targets the Cloudflare
 * Access-protected QA origin. It lives here rather than in `HttpUtils` for two reasons: `HttpUtils` is
 * imported on every platform, so reaching the session module from there would pull the whole authorize/PKCE/
 * token chain into both native bundles — exactly what the `Config` and `ensureQAAuthenticated` stubs next
 * door exist to prevent — and the QA token policy is a Cloudflare concern, not a concern of the function
 * every request in the app goes through.
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
 * one. Whether the round trip actually starts is `handleQAReauthRequired`'s call: only a command the app
 * cannot proceed without may navigate the tab. The request fails either way — there is no credential for it.
 */
function throwQAReauthRequired(command: string | undefined): never {
    handleQAReauthRequired(command);
    throw new HttpsError({message: CONST.ERROR.CF_REAUTH_REQUIRED, status: CONST.HTTP_STATUS.UNAUTHORIZED.toString()});
}

const prepareQARequestAuth: PrepareQARequestAuth = async (command) => {
    // Awaited, not started alongside: a QA request cannot succeed before the handshake has, a bearer-less one
    // can only 401, and the 401 handler cannot rescue it either because it keys off a token that does not
    // exist yet. Such a request would fall through to ordinary failure handling and could flash the offline
    // indicator before the tab leaves. Cheap on every later call, though not free — the gate runs again and
    // finds the session, paying only for hydration awaits that have already settled.
    await ensureQAAuthenticated(command);

    // The design doc's primary refresh path: a token inside the expiry buffer is rotated BEFORE the request,
    // so the common case costs no wasted round trip. `handleQAUnauthorized` stays as the fallback, for a
    // token revoked or rejected early.
    const session = getCloudflareSession();
    if (session && isSessionNearExpiry(session) && (await refreshCloudflareSession(session.accessToken)) === 'reauth-required') {
        // Terminal, and nothing has been sent yet. Same dead-session behaviour as the 401 path, deliberately:
        // one answer to "the session is gone", not two.
        throwQAReauthRequired(command);
    }

    // Read after the refresh above, so this is the rotated token and not the one that was about to expire
    const accessToken = getCloudflareSession()?.accessToken;
    return accessToken ? buildQARequestAuth(accessToken) : undefined;
};

const handleQAUnauthorized: HandleQAUnauthorized = async ({accessToken}, {isRetry, command}) => {
    if (isRetry) {
        // A freshly refreshed token still got 401 — refresh demonstrably cannot fix this session. Drop it
        // (token-guarded, so a concurrently established session is not collateral damage) and re-authorize,
        // which is the only thing that can recover a QA build. Not awaited: the part that matters here — the
        // in-memory cache — is dropped synchronously inside, and only the persistence write is async, with
        // nothing this layer could do about a failed one.
        markCloudflareSessionRejected(accessToken);
        throwQAReauthRequired(command);
    }

    if ((await refreshCloudflareSession(accessToken)) === 'reauth-required') {
        // Terminal; refreshCloudflareSession already cleared the dead session
        throwQAReauthRequired(command);
    }

    // 'refreshed' / 'skipped-newer-token': retry with the rotated token. A transient refresh failure never
    // reaches here — refreshCloudflareSession rethrows it, so it surfaces as an ordinary network error and
    // the session stays alive.
    const rotatedAccessToken = getCloudflareSession()?.accessToken;
    if (!rotatedAccessToken) {
        // The session was cleared while the refresh was in flight: no credential to retry with
        throwQAReauthRequired(command);
    }
    return buildQARequestAuth(rotatedAccessToken);
};

export {handleQAUnauthorized, prepareQARequestAuth};
