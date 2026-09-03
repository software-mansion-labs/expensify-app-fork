import {getOAuthRedirectURI, isQAAuthConfigured} from './Config';

/**
 * Origin and path both, never a substring: the app link claim is published in the apple-app-site-association
 * file the production and staging NewDot hosts also serve, so a path-only match would swallow their deep links too.
 */
function isCloudflareAuthCallbackURL(url: string): boolean {
    if (!isQAAuthConfigured()) {
        return false;
    }

    try {
        const parsed = new URL(url);
        const redirectURI = new URL(getOAuthRedirectURI());
        return parsed.origin === redirectURI.origin && parsed.pathname === redirectURI.pathname;
    } catch {
        return false;
    }
}

export default isCloudflareAuthCallbackURL;
