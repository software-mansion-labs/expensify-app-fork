import type {GetOAuthRedirectURI, GetQAResource, IsQAAuthConfigured, IsQAServerRequest} from './types';

/**
 * QA auth is web-only: receiving the OAuth callback needs claimed Universal/App Links, so the feature is
 * structurally off on native regardless of build configuration.
 */
const isQAAuthConfigured: IsQAAuthConfigured = () => false;

const isQAServerRequest: IsQAServerRequest = () => false;

const getQAResource: GetQAResource = () => '';

const getOAuthRedirectURI: GetOAuthRedirectURI = () => '';

export {getOAuthRedirectURI, getQAResource, isQAAuthConfigured, isQAServerRequest};
