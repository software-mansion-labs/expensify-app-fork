import type {AuthorizeRoundTripResult, RunAuthorizeRoundTrip} from '@libs/CloudflareAccess/authorizeRoundTrip/types';

import type {WebBrowserAuthSessionResult} from 'expo-web-browser';

import {WebBrowserResultType} from 'expo-web-browser';

const REDIRECT_URI = 'https://qa.new.expensify.com/oauth/callback';
const STATE = 'state-abc';
const CODE_VERIFIER = 'verifier-abc';

const mockOpenAuthSession = jest.fn<Promise<WebBrowserAuthSessionResult>, [string, string | null | undefined, unknown]>();
const mockDismissAuthSession = jest.fn<void, []>();

jest.mock('expo-web-browser', () => ({
    // Mirrored rather than required through: requireActual pulls in the native module
    WebBrowserResultType: {CANCEL: 'cancel', DISMISS: 'dismiss', OPENED: 'opened', LOCKED: 'locked'},
    openAuthSessionAsync: (url: string, redirectURL: string, options: unknown) => mockOpenAuthSession(url, redirectURL, options),
    dismissAuthSession: () => mockDismissAuthSession(),
}));
jest.mock('@libs/CloudflareAccess/Config', () => ({getOAuthRedirectURI: () => REDIRECT_URI}));
jest.mock('@libs/Log', () => ({warn: jest.fn()}));

function runRoundTrip(): Promise<AuthorizeRoundTripResult> {
    const run = jest.requireActual<{default: RunAuthorizeRoundTrip}>('../../src/libs/CloudflareAccess/authorizeRoundTrip/index.native.ts').default;
    return run({authorizeURL: 'https://team.cloudflareaccess.com/authorize', state: STATE, codeVerifier: CODE_VERIFIER});
}

describe('native runAuthorizeRoundTrip', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('opens the session against the claimed https callback and prefers universal links', async () => {
        // Given a callback that never arrives, so only the open call is under test
        mockOpenAuthSession.mockResolvedValue({type: WebBrowserResultType.DISMISS});

        // When the round trip runs
        await runRoundTrip();

        // Then the redirect URI is the claimed one and universal links are preferred: from iOS 17.4 that is
        // the only redirect shape an auth session will return through
        expect(mockOpenAuthSession).toHaveBeenCalledWith('https://team.cloudflareaccess.com/authorize', REDIRECT_URI, {preferUniversalLinks: true});
    });

    it('returns the code paired with the verifier it was generated against', async () => {
        // Given a callback carrying a matching state and a code
        mockOpenAuthSession.mockResolvedValue({type: 'success', url: `${REDIRECT_URI}?code=auth-code&state=${STATE}`});

        // When the round trip runs
        const result = await runRoundTrip();

        // Then the verifier travels back out with the code: the exchange needs both, and nothing persisted it
        expect(result).toEqual({outcome: 'exchange', exchange: {code: 'auth-code', codeVerifier: CODE_VERIFIER}});
    });

    it('dismisses the browser once the callback arrives', async () => {
        // Given a successful callback delivered through the app link rather than the browser's own redirect
        mockOpenAuthSession.mockResolvedValue({type: 'success', url: `${REDIRECT_URI}?code=auth-code&state=${STATE}`});

        // When the round trip runs
        await runRoundTrip();

        // Then the session is closed explicitly: iOS leaves it open when the return came through a link
        expect(mockDismissAuthSession).toHaveBeenCalledTimes(1);
    });

    it('rejects a callback whose state does not match', async () => {
        // Given a callback carrying somebody else's state
        mockOpenAuthSession.mockResolvedValue({type: 'success', url: `${REDIRECT_URI}?code=auth-code&state=not-mine`});

        // When the round trip runs, Then no code is handed on: the state is the only proof this callback
        // answers the request this client started
        await expect(runRoundTrip()).resolves.toEqual({outcome: 'failed', errorMessage: 'OAuth callback state mismatch'});
    });

    it('reports a provider error instead of looking for a code', async () => {
        // Given Cloudflare declining the authorization
        mockOpenAuthSession.mockResolvedValue({type: 'success', url: `${REDIRECT_URI}?error=access_denied&error_description=Nope&state=${STATE}`});

        // When the round trip runs
        const result = await runRoundTrip();

        // Then the provider's own message is surfaced
        expect(result).toEqual({outcome: 'failed', errorMessage: 'Nope'});
    });

    it('reports a callback with neither code nor error as failed', async () => {
        // Given a callback that passed the state check but carries nothing usable
        mockOpenAuthSession.mockResolvedValue({type: 'success', url: `${REDIRECT_URI}?state=${STATE}`});

        // When the round trip runs, Then it fails rather than exchanging an undefined code
        await expect(runRoundTrip()).resolves.toEqual({outcome: 'failed', errorMessage: 'OAuth callback is missing the authorization code'});
    });

    it.each([[WebBrowserResultType.CANCEL], [WebBrowserResultType.DISMISS]])('reports %s as cancelled, not failed', async (type) => {
        // Given the user closing the browser
        mockOpenAuthSession.mockResolvedValue({type});

        // When the round trip runs, Then it is cancelled: the caller must not reopen the browser the user
        // just dismissed
        await expect(runRoundTrip()).resolves.toEqual({outcome: 'cancelled'});
    });

    it('reports any other session outcome as failed', async () => {
        // Given a session that could not be opened at all
        mockOpenAuthSession.mockResolvedValue({type: WebBrowserResultType.LOCKED});

        // When the round trip runs, Then it fails, so the request fails rather than going out bearer-less
        await expect(runRoundTrip()).resolves.toEqual({outcome: 'failed', errorMessage: 'Auth session ended with "locked"'});
    });
});
