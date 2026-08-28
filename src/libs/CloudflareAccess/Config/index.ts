/**
 * Config and request classification for the Cloudflare Access-protected QA server. The security boundary:
 * nothing else decides whether a URL may carry the QA bearer token.
 */
import CONFIG from '@src/CONFIG';

import type {GetOAuthClientID, GetOAuthRedirectURI, GetQAResource, IsQAAuthConfigured, IsQAServerRequest} from './types';

import {getQAResource, isQAAuthConfigValid, matchesQAOrigin, OAUTH_CALLBACK_PATH} from './common';

const getOAuthClientID: GetOAuthClientID = () => CONFIG.QA_AUTH.CLIENT_ID;

/** Anything short of a complete, well-formed config and every consumer behaves as if the feature is absent */
const isQAAuthConfigured: IsQAAuthConfigured = () => isQAAuthConfigValid(getOAuthClientID());

const isQAServerRequest: IsQAServerRequest = (url) => isQAAuthConfigured() && matchesQAOrigin(url);

/** Must be registered as an allowed redirect URI on the Access application. Read lazily: no `window` on native. */
const getOAuthRedirectURI: GetOAuthRedirectURI = () => {
    return `${window.location.origin}${OAUTH_CALLBACK_PATH}`;
};

export {getOAuthClientID, getOAuthRedirectURI, getQAResource, isQAAuthConfigured, isQAServerRequest};
export type {GetOAuthClientID, GetOAuthRedirectURI, GetQAResource, IsQAAuthConfigured, IsQAServerRequest};
