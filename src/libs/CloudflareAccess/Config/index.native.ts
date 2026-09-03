import CONFIG from '@src/CONFIG';

import {Platform} from 'react-native';

import type {GetOAuthClientID, GetOAuthRedirectURI, GetQAOrigins, GetQAResource, IsQAAuthConfigured, IsQAServerRequest} from './types';

import {getQAOrigins, getQAResource, isQAAuthConfigValid, matchesQAOrigin, OAUTH_CALLBACK_PATH, parseHTTPSOrigin} from './common';

/** Returning the authorization code through a claimed `https` URL is only supported from iOS 17.4 */
const MINIMUM_IOS_VERSION = {major: 17, minor: 4};

function isPlatformSupported(): boolean {
    if (Platform.OS !== 'ios') {
        return true;
    }

    const [rawMajor, rawMinor = '0'] = String(Platform.Version).split('.');
    const major = Number(rawMajor);
    const minor = Number(rawMinor);

    if (!Number.isFinite(major) || !Number.isFinite(minor)) {
        return false;
    }

    // Compared per component, because parseFloat would read 17.10 as 17.1
    return major === MINIMUM_IOS_VERSION.major ? minor >= MINIMUM_IOS_VERSION.minor : major > MINIMUM_IOS_VERSION.major;
}

const getOAuthClientID: GetOAuthClientID = () => CONFIG.QA_AUTH.NATIVE_CLIENT_ID;

/**
 * Also gates on the redirect URI, which web derives from the live origin and so cannot get wrong. Native
 * reads it from configuration, and a flow started without one could never come back.
 */
function getCallbackOrigin(): string | null {
    const {NATIVE_CALLBACK_ORIGIN} = CONFIG.QA_AUTH;
    return NATIVE_CALLBACK_ORIGIN ? parseHTTPSOrigin(NATIVE_CALLBACK_ORIGIN) : parseHTTPSOrigin(CONFIG.EXPENSIFY.NEW_EXPENSIFY_URL);
}

const isQAAuthConfigured: IsQAAuthConfigured = () => isQAAuthConfigValid(getOAuthClientID()) && isPlatformSupported() && getCallbackOrigin() !== null;

const isQAServerRequest: IsQAServerRequest = (url) => isQAAuthConfigured() && matchesQAOrigin(url);

/**
 * Whatever host serves the app-link claim files. It defaults to the NewDot origin, which is what serves them
 * in a deployed environment, and is overridable because a bare Cloudflare account has no such deploy.
 */
const getOAuthRedirectURI: GetOAuthRedirectURI = () => {
    const origin = getCallbackOrigin();
    return origin ? `${origin}${OAUTH_CALLBACK_PATH}` : '';
};

export {getOAuthClientID, getOAuthRedirectURI, getQAOrigins, getQAResource, isQAAuthConfigured, isQAServerRequest};
export type {GetOAuthClientID, GetOAuthRedirectURI, GetQAOrigins, GetQAResource, IsQAAuthConfigured, IsQAServerRequest};
