import CONFIG from '@src/CONFIG';

import type {GetOAuthClientID, GetOAuthRedirectURI, GetQAOrigins, GetQAResource, IsQAAuthConfigured, IsQAServerRequest} from './types';

import {getQAOrigins, getQAResource, isQAAuthConfigValid, matchesQAOrigin, OAUTH_CALLBACK_PATH} from './common';

const getOAuthClientID: GetOAuthClientID = () => CONFIG.QA_AUTH.CLIENT_ID;

const isQAAuthConfigured: IsQAAuthConfigured = () => isQAAuthConfigValid(getOAuthClientID());

const isQAServerRequest: IsQAServerRequest = (url) => isQAAuthConfigured() && matchesQAOrigin(url);

/** Must be registered as an allowed redirect URI on the Access application */
const getOAuthRedirectURI: GetOAuthRedirectURI = () => {
    return `${window.location.origin}${OAUTH_CALLBACK_PATH}`;
};

export {getOAuthClientID, getOAuthRedirectURI, getQAOrigins, getQAResource, isQAAuthConfigured, isQAServerRequest};
export type {GetOAuthClientID, GetOAuthRedirectURI, GetQAOrigins, GetQAResource, IsQAAuthConfigured, IsQAServerRequest};
