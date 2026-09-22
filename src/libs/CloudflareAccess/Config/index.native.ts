import CONFIG from '@src/CONFIG';
import CONST from '@src/CONST';

import {Platform} from 'react-native';

import type {GetOAuthClientID, GetOAuthRedirectURI, GetQAOrigins, GetQAResource, IsQAAuthConfigured, IsQAServerRequest} from './types';

import {getQAOrigins, getQAResource, isQAAuthConfigValid, matchesQAOrigin} from './common';

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

const isQAAuthConfigured: IsQAAuthConfigured = () => isQAAuthConfigValid(getOAuthClientID()) && isPlatformSupported();

const isQAServerRequest: IsQAServerRequest = (url) => isQAAuthConfigured() && matchesQAOrigin(url);

/**
 * Staging serves the app-link claim files for this path and both entitlements already claim the host. The QA
 * origin cannot: it sits behind Access, so Apple and Google would fetch a login page instead of the JSON.
 * Nothing on the host is ever read, the app consumes the link in-process.
 */
const getOAuthRedirectURI: GetOAuthRedirectURI = () => `${CONST.STAGING_NEW_EXPENSIFY_URL}${CONST.CLOUDFLARE_ACCESS.NATIVE_OAUTH_CALLBACK_PATH}`;

export {getOAuthClientID, getOAuthRedirectURI, getQAOrigins, getQAResource, isQAAuthConfigured, isQAServerRequest};
export type {GetOAuthClientID, GetOAuthRedirectURI, GetQAOrigins, GetQAResource, IsQAAuthConfigured, IsQAServerRequest};
