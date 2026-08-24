import type * as EnsureQAAuthenticatedModule from '@libs/CloudflareAccess/ensureQAAuthenticated/index.ts';

import type CloudflareSession from '@src/types/onyx/CloudflareSession';

import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

const mockBeginRedirect = jest.fn(() => new Promise<never>(() => {}));
const mockGetSession = jest.fn<CloudflareSession | null | undefined, []>();
const mockGetPending = jest.fn<Promise<void> | null, []>();
const mockIsQAServerActive = jest.fn<boolean, []>();
const mockWaitForActiveServerHydration = jest.fn(() => Promise.resolve());
const mockIsConfigured = jest.fn<boolean, []>();

jest.mock('@userActions/CloudflareSession', () => ({
    beginCloudflareAuthRedirect: () => mockBeginRedirect(),
    getCloudflareSession: () => mockGetSession(),
    getPendingCloudflareAuthCompletion: () => mockGetPending(),
    waitForCloudflareSessionHydration: () => Promise.resolve(),
}));
jest.mock('@libs/ApiUtils', () => ({
    isQAServerActive: () => mockIsQAServerActive(),
    waitForActiveServerHydration: () => mockWaitForActiveServerHydration(),
}));
jest.mock('@libs/CloudflareAccess/Config', () => ({isQAAuthConfigured: () => mockIsConfigured()}));
// The gate logs a failed redirect; the real module drags Network in, which the ApiUtils mock above cannot serve
jest.mock('@libs/Log', () => ({warn: jest.fn()}));

const LIVE_SESSION = {accessToken: 'oauth:t', refreshToken: 'oauth:r', expiresAt: Date.now() + 900_000};

describe('ensureQAAuthenticated', () => {
    let ensureQAAuthenticated: () => Promise<void>;
    let handleQAReauthRequired: () => void;

    beforeEach(() => {
        // Fresh module registry per test: the single-flight gate promise is module state
        jest.resetModules();
        jest.clearAllMocks();
        mockIsQAServerActive.mockReturnValue(true);
        mockWaitForActiveServerHydration.mockReturnValue(Promise.resolve());
        mockIsConfigured.mockReturnValue(true);
        mockGetSession.mockReturnValue(null);
        mockGetPending.mockReturnValue(null);
        // Explicit /index.ts: the jest-expo preset resolves the native platform first, and the native variant is a stub
        ({ensureQAAuthenticated, handleQAReauthRequired} = require<typeof EnsureQAAuthenticatedModule>('@libs/CloudflareAccess/ensureQAAuthenticated/index.ts'));
    });

    it('redirects when QA is active and there is no session', async () => {
        // Given a QA build with no stored session — when the gate runs, then it must navigate to Cloudflare,
        // because on QA even the sign-in POST goes to a Zero Trust origin. Not awaited: the gate's promise
        // never settles once it redirects, so the assertion has to run off the side effect instead
        ensureQAAuthenticated();
        await waitForBatchedUpdates();
        expect(mockBeginRedirect).toHaveBeenCalledTimes(1);
    });

    // THE regression test: this is what a synchronous read of isQAServerActive() gets wrong. ApiUtils reports
    // 'production' until getEnvironment() and its first Onyx callback have both run, so a gate that decides
    // before waitForActiveServerHydration() resolves never fires — on a QA build included.
    it('waits for the active-server signal before deciding', async () => {
        // Given the active-server signal has not hydrated yet and reads as non-QA
        let releaseHydration = () => {};
        mockWaitForActiveServerHydration.mockReturnValue(
            new Promise<void>((resolve) => {
                releaseHydration = resolve;
            }),
        );
        mockIsQAServerActive.mockReturnValue(false);

        // When the gate runs, then it must not decide off the un-hydrated value
        ensureQAAuthenticated();
        await waitForBatchedUpdates();
        expect(mockBeginRedirect).not.toHaveBeenCalled();

        // When the signal hydrates to QA, then the gate redirects
        mockIsQAServerActive.mockReturnValue(true);
        releaseHydration();
        await waitForBatchedUpdates();
        expect(mockBeginRedirect).toHaveBeenCalledTimes(1);
    });

    it('does nothing when QA is not active', async () => {
        // Given a hydrated non-QA build — when the gate runs, then nothing navigates
        mockIsQAServerActive.mockReturnValue(false);
        await ensureQAAuthenticated();
        expect(mockBeginRedirect).not.toHaveBeenCalled();
    });

    it('does nothing when QA auth is not configured — a build without credentials must not pay for hydration', async () => {
        // Given a build with no Cloudflare credentials — when the gate runs, then it returns without even
        // awaiting hydration, because CONFIG is synchronously honest and the awaits would buy nothing
        mockIsConfigured.mockReturnValue(false);
        await ensureQAAuthenticated();
        expect(mockWaitForActiveServerHydration).not.toHaveBeenCalled();
        expect(mockBeginRedirect).not.toHaveBeenCalled();
    });

    it('does nothing when a session already exists', async () => {
        // Given a live session — when the gate runs, then it must not navigate away from a working tab
        mockGetSession.mockReturnValue(LIVE_SESSION);
        await ensureQAAuthenticated();
        expect(mockBeginRedirect).not.toHaveBeenCalled();
    });

    it('joins an in-flight callback exchange instead of starting a second round trip', async () => {
        // Given this page load IS the callback: an exchange is in flight and stores the session when it settles.
        // A gate that read the session without awaiting would see null here and burn the code it just got.
        mockGetPending.mockReturnValue(
            Promise.resolve().then(() => {
                mockGetSession.mockReturnValue(LIVE_SESSION);
            }),
        );

        // When the gate runs, then it waits for that exchange and finds the session it produced
        await ensureQAAuthenticated();
        expect(mockBeginRedirect).not.toHaveBeenCalled();
    });

    // Regression: the previous revision asserted the opposite ("still redirects"), which specified a redirect loop
    it('does NOT redirect when the in-flight exchange rejects, so a failed callback cannot start a redirect loop', async () => {
        // Given the callback exchange failed — when the gate runs, then it must stop rather than redirect,
        // because Cloudflare still holds a valid Zero Trust session and would bounce straight back with a
        // fresh code, and module state cannot break a loop made of full page loads
        mockGetPending.mockReturnValue(Promise.reject(new Error('invalid_grant')));
        mockGetSession.mockReturnValue(undefined);
        ensureQAAuthenticated();
        await waitForBatchedUpdates();
        expect(mockBeginRedirect).not.toHaveBeenCalled();
    });

    it('redirects at most once even when called concurrently', async () => {
        // Given two callers race — when both run, then the single-flight gate runs the decision chain once,
        // so a second caller cannot reach the redirect while the first is still awaiting hydration
        ensureQAAuthenticated();
        ensureQAAuthenticated();
        await waitForBatchedUpdates();
        expect(mockBeginRedirect).toHaveBeenCalledTimes(1);
    });

    // Regression: the single-flight promise used to survive its own run, which turned one early decision
    // into the answer for the whole page. The QA switch changes the active server mid-session and signs the
    // user out client-side without reloading, so the gate has to be able to decide again.
    it('decides again after the active server changes, because flipping the switch does not reload the page', async () => {
        // Given a non-QA first run that correctly did nothing
        mockIsQAServerActive.mockReturnValue(false);
        await ensureQAAuthenticated();
        expect(mockBeginRedirect).not.toHaveBeenCalled();

        // When the switch flips to QA and the next QA request runs the gate, then it must redirect. A cached
        // "nothing to do" would leave the tab with no Cloudflare session and every QA request bearer-less
        mockIsQAServerActive.mockReturnValue(true);
        ensureQAAuthenticated();
        await waitForBatchedUpdates();
        expect(mockBeginRedirect).toHaveBeenCalledTimes(1);
    });

    it('handleQAReauthRequired redirects in QA mode', () => {
        // Given a QA request came back CF_REAUTH_REQUIRED — when the handler runs, then it re-authorizes
        // without awaiting hydration, because a QA request already went out and so the signal was hydrated
        handleQAReauthRequired();
        expect(mockBeginRedirect).toHaveBeenCalledTimes(1);
    });

    it('handleQAReauthRequired does nothing outside QA mode', () => {
        // Given a non-QA build — when the handler runs, then nothing navigates
        mockIsQAServerActive.mockReturnValue(false);
        handleQAReauthRequired();
        expect(mockBeginRedirect).not.toHaveBeenCalled();
    });
});
