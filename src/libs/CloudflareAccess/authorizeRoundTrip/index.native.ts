import {getOAuthRedirectURI} from '@libs/CloudflareAccess/Config';
import {OAuthError} from '@libs/CloudflareAccess/OAuthClient';
import Log from '@libs/Log';

import {dismissAuthSession, openAuthSessionAsync, WebBrowserResultType} from 'expo-web-browser';
import {Platform} from 'react-native';

import type {AuthorizeRoundTripResult, RunAuthorizeRoundTrip} from './types';

/** iOS keeps the session open when the return arrives through an app link rather than its own redirect */
function dismissBrowserSession(): void {
    if (Platform.OS !== 'ios') {
        return;
    }
    try {
        dismissAuthSession();
    } catch (error) {
        Log.warn('[CloudflareAccess] Failed to dismiss the auth session', {error});
    }
}

function readCallback(callbackURL: string, state: string, codeVerifier: string): AuthorizeRoundTripResult {
    let params: URLSearchParams;
    try {
        params = new URL(callbackURL).searchParams;
    } catch {
        return {outcome: 'failed', errorMessage: 'OAuth callback URL could not be parsed'};
    }

    if (params.get('state') !== state) {
        return {outcome: 'failed', errorMessage: 'OAuth callback state mismatch'};
    }

    const oauthError = params.get('error');
    if (oauthError) {
        return {outcome: 'failed', errorMessage: new OAuthError(oauthError, params.get('error_description') ?? undefined).message};
    }

    const code = params.get('code');
    if (!code) {
        return {outcome: 'failed', errorMessage: 'OAuth callback is missing the authorization code'};
    }

    return {outcome: 'exchange', exchange: {code, codeVerifier}};
}

const runAuthorizeRoundTrip: RunAuthorizeRoundTrip = async ({authorizeURL, state, codeVerifier}) => {
    const redirectURI = getOAuthRedirectURI();

    // preferUniversalLinks returns through the claimed https URL, which is the only redirect shape iOS
    // accepts for an auth session from 17.4 onwards
    const result = await openAuthSessionAsync(authorizeURL, redirectURI, {preferUniversalLinks: true});

    if (result.type === 'success') {
        dismissBrowserSession();
        return readCallback(result.url, state, codeVerifier);
    }

    if (result.type === WebBrowserResultType.CANCEL || result.type === WebBrowserResultType.DISMISS) {
        return {outcome: 'cancelled'};
    }

    return {outcome: 'failed', errorMessage: `Auth session ended with "${result.type}"`};
};

export default runAuthorizeRoundTrip;
