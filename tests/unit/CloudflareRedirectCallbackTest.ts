/**
 * Tests for the boot-time OAuth callback handler of the same-tab redirect transport
 * (Web_POC_ExpoWebBrowser.md). This is the gate table that keeps a callback which fails provenance from
 * ever reaching the token exchange, and the URL rewrite that keeps React Navigation from booting on the
 * redirect path (which falls through to /not-found — verified, Web_POC.md §3.7).
 */
import type * as RedirectCallbackModule from '@libs/CloudflareOAuth/redirectCallback';
import type * as RedirectFlowStorageModule from '@libs/CloudflareOAuth/redirectFlowStorage';

import type * as SessionActionsModule from '@userActions/CloudflareSession';

const mockQAAuth = {
    API_ROOT: 'https://qa.example.com/',
    TEAM_DOMAIN: 'team.cloudflareaccess.com',
    CLIENT_ID: 'client-123',
};

jest.mock('@src/CONFIG', () => ({__esModule: true, default: {QA_AUTH: mockQAAuth}}));

jest.mock('@userActions/CloudflareSession', () => ({
    __esModule: true,
    completeQAAuthRedirect: jest.fn(() => Promise.resolve()),
}));

const RETURN_URL = 'http://localhost/settings/troubleshoot';
const FLOW = {state: 'state-1', codeVerifier: 'verifier-1', returnURL: RETURN_URL, createdAt: 1_700_000_000_000};

let redirectCallback: typeof RedirectCallbackModule;
let redirectFlowStorage: typeof RedirectFlowStorageModule;
let sessionActions: typeof SessionActionsModule;
let replaceStateSpy: jest.SpyInstance;
let nowSpy: jest.SpyInstance;

/** Points jsdom at the callback URL without triggering a real navigation */
function arrangeCallbackURL(search: string) {
    Object.defineProperty(window, 'location', {
        value: {origin: 'http://localhost', href: `http://localhost/oauth/callback${search}`, pathname: '/oauth/callback'},
        writable: true,
        configurable: true,
    });
}

let realLocation: Location;

beforeEach(() => {
    jest.resetModules();
    window.sessionStorage.clear();
    realLocation = window.location;
    mockQAAuth.CLIENT_ID = 'client-123';
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(FLOW.createdAt);
    replaceStateSpy = jest.spyOn(window.history, 'replaceState').mockImplementation(() => {});
    redirectFlowStorage = require<typeof RedirectFlowStorageModule>('@libs/CloudflareOAuth/redirectFlowStorage');
    sessionActions = require<typeof SessionActionsModule>('@userActions/CloudflareSession');
    redirectCallback = require<typeof RedirectCallbackModule>('@libs/CloudflareOAuth/redirectCallback');
});

afterEach(() => {
    replaceStateSpy.mockRestore();
    nowSpy.mockRestore();
    Object.defineProperty(window, 'location', {value: realLocation, writable: true, configurable: true});
});

describe('handleQAAuthRedirectCallback', () => {
    it('is a no-op off the callback path — every normal boot runs this', () => {
        redirectFlowStorage.savePendingRedirectFlow(FLOW);
        Object.defineProperty(window, 'location', {
            value: {origin: 'http://localhost', href: RETURN_URL, pathname: '/settings/troubleshoot'},
            writable: true,
            configurable: true,
        });

        expect(redirectCallback.handleQAAuthRedirectCallback()).toBe('not-a-callback');
        expect(replaceStateSpy).not.toHaveBeenCalled();
        expect(sessionActions.completeQAAuthRedirect).not.toHaveBeenCalled();
        // A pending flow from another tab's round trip must survive an unrelated boot
        expect(redirectFlowStorage.consumePendingRedirectFlow()).not.toBeNull();
    });

    it('is a no-op when QA auth is not configured', () => {
        mockQAAuth.CLIENT_ID = '';
        arrangeCallbackURL('?code=auth-code-1&state=state-1');
        redirectFlowStorage.savePendingRedirectFlow(FLOW);

        expect(redirectCallback.handleQAAuthRedirectCallback()).toBe('not-a-callback');
        expect(sessionActions.completeQAAuthRedirect).not.toHaveBeenCalled();
    });

    it('exchanges the code and restores the URL before the exchange resolves', () => {
        arrangeCallbackURL('?code=auth-code-1&state=state-1');
        redirectFlowStorage.savePendingRedirectFlow(FLOW);

        expect(redirectCallback.handleQAAuthRedirectCallback()).toBe('exchanging');
        // Synchronous, and before React Navigation reads window.location
        expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/settings/troubleshoot');
        expect(sessionActions.completeQAAuthRedirect).toHaveBeenCalledWith({code: 'auth-code-1', codeVerifier: FLOW.codeVerifier});
    });

    it('validates state first: a foreign callback is discarded wholesale, even with error and code present', () => {
        arrangeCallbackURL('?state=WRONG&error=access_denied&code=evil-code');
        redirectFlowStorage.savePendingRedirectFlow(FLOW);

        expect(redirectCallback.handleQAAuthRedirectCallback()).toBe('invalid-callback');
        expect(sessionActions.completeQAAuthRedirect).not.toHaveBeenCalled();
        expect(redirectCallback.getQAAuthRedirectOutcome().errorMessage).toBe('OAuth callback state mismatch');
        // Still rescued off the redirect path, which has no app route
        expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/settings/troubleshoot');
    });

    it('surfaces a provider refusal without exchanging', () => {
        arrangeCallbackURL('?state=state-1&error=access_denied&error_description=User+refused');
        redirectFlowStorage.savePendingRedirectFlow(FLOW);

        expect(redirectCallback.handleQAAuthRedirectCallback()).toBe('provider-error');
        expect(sessionActions.completeQAAuthRedirect).not.toHaveBeenCalled();
        expect(redirectCallback.getQAAuthRedirectOutcome().errorMessage).toBe('User refused');
    });

    it('rejects a callback with no authorization code', () => {
        arrangeCallbackURL('?state=state-1');
        redirectFlowStorage.savePendingRedirectFlow(FLOW);

        expect(redirectCallback.handleQAAuthRedirectCallback()).toBe('invalid-callback');
        expect(sessionActions.completeQAAuthRedirect).not.toHaveBeenCalled();
    });

    it('refuses a callback with no stored flow, and lands on a safe route', () => {
        // A replayed callback URL, or one opened in a tab that never started the flow
        arrangeCallbackURL('?code=auth-code-1&state=state-1');

        expect(redirectCallback.handleQAAuthRedirectCallback()).toBe('no-pending-flow');
        expect(sessionActions.completeQAAuthRedirect).not.toHaveBeenCalled();
        expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/');
    });

    it('never navigates to a foreign origin, even though the returnURL is our own storage', () => {
        arrangeCallbackURL('?code=auth-code-1&state=state-1');
        redirectFlowStorage.savePendingRedirectFlow({...FLOW, returnURL: 'https://evil.example.com/steal'});

        expect(redirectCallback.handleQAAuthRedirectCallback()).toBe('exchanging');
        expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/');
    });

    it('consumes the flow record even when the callback is rejected, so it can never be replayed', () => {
        arrangeCallbackURL('?state=WRONG&code=evil-code');
        redirectFlowStorage.savePendingRedirectFlow(FLOW);

        redirectCallback.handleQAAuthRedirectCallback();
        expect(redirectFlowStorage.consumePendingRedirectFlow()).toBeNull();
    });
});
