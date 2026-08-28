import {READ_COMMANDS} from '@libs/API/types';
import type * as EnsureQAAuthenticatedModule from '@libs/CloudflareAccess/ensureQAAuthenticated/index.ts';
import type {EnsureQAAuthenticated, HandleQAReauthRequired} from '@libs/CloudflareAccess/ensureQAAuthenticated/types';

import CONST from '@src/CONST';
import type CloudflareSession from '@src/types/onyx/CloudflareSession';

import type {ValueOf} from 'type-fest';

import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

const mockBeginRedirect = jest.fn<Promise<'session-established' | 'cancelled' | 'failed'>, []>(() => new Promise(() => {}));
const mockGetSession = jest.fn<CloudflareSession | null | undefined, []>();
const mockGetPending = jest.fn<Promise<void> | null, []>();
const mockIsQAServerActive = jest.fn<boolean, []>();
const mockGetActiveServer = jest.fn<ValueOf<typeof CONST.SERVER>, []>();
const mockWaitForActiveServerHydration = jest.fn(() => Promise.resolve());
const mockIsConfigured = jest.fn<boolean, []>();

jest.mock('@userActions/CloudflareSession', () => ({
    startCloudflareSignIn: () => mockBeginRedirect(),
    getCloudflareSession: () => mockGetSession(),
    getPendingCloudflareCodeExchange: () => mockGetPending(),
    waitForCloudflareSessionHydration: () => Promise.resolve(),
}));
jest.mock('@libs/ApiUtils', () => ({
    getActiveServer: () => mockGetActiveServer(),
    isQAServerActive: () => mockIsQAServerActive(),
    waitForActiveServerHydration: () => mockWaitForActiveServerHydration(),
}));
jest.mock('@libs/CloudflareAccess/Config', () => ({isQAAuthConfigured: () => mockIsConfigured()}));
// The gate logs a failed redirect; the real module drags Network in, which the ApiUtils mock above cannot serve
jest.mock('@libs/Log', () => ({warn: jest.fn()}));

const LIVE_SESSION = {accessToken: 'oauth:t', refreshToken: 'oauth:r', expiresAt: Date.now() + 900_000};

const REDIRECTING_COMMAND = READ_COMMANDS.BEGIN_SIGNIN;
const BACKGROUND_COMMAND = 'Log';

describe('ensureQAAuthenticated', () => {
    let ensureQAAuthenticated: EnsureQAAuthenticated;
    let handleQAReauthRequired: HandleQAReauthRequired;

    beforeEach(() => {
        // Fresh module registry per test: the single-flight gate promise is module state
        jest.resetModules();
        jest.clearAllMocks();
        mockIsQAServerActive.mockReturnValue(true);
        mockGetActiveServer.mockReturnValue(CONST.SERVER.QA);
        mockWaitForActiveServerHydration.mockReturnValue(Promise.resolve());
        mockIsConfigured.mockReturnValue(true);
        mockGetSession.mockReturnValue(null);
        mockGetPending.mockReturnValue(null);
        // Explicit /index.ts: the jest-expo preset resolves the native platform first, and the native variant is a stub
        ({ensureQAAuthenticated, handleQAReauthRequired} = require<typeof EnsureQAAuthenticatedModule>('@libs/CloudflareAccess/ensureQAAuthenticated/index.ts'));
    });

    it('redirects when QA is active and there is no session', async () => {
        // Given a QA build with no stored session — when the gate runs, then it must navigate to Cloudflare.
        // Not awaited: the gate's promise never settles once it redirects, so the assertion runs off the side effect
        ensureQAAuthenticated(REDIRECTING_COMMAND);
        await waitForBatchedUpdates();
        expect(mockBeginRedirect).toHaveBeenCalledTimes(1);
    });

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
        ensureQAAuthenticated(REDIRECTING_COMMAND);
        await waitForBatchedUpdates();
        expect(mockBeginRedirect).not.toHaveBeenCalled();

        // When the signal hydrates to QA, then the gate redirects
        mockIsQAServerActive.mockReturnValue(true);
        mockGetActiveServer.mockReturnValue(CONST.SERVER.QA);
        releaseHydration();
        await waitForBatchedUpdates();
        expect(mockBeginRedirect).toHaveBeenCalledTimes(1);
    });

    it('does nothing when QA is not active', async () => {
        // Given a hydrated non-QA build — when the gate runs, then nothing navigates
        mockIsQAServerActive.mockReturnValue(false);
        await ensureQAAuthenticated(REDIRECTING_COMMAND);
        expect(mockBeginRedirect).not.toHaveBeenCalled();
    });

    it('does nothing when QA auth is not configured — a build without credentials must not pay for hydration', async () => {
        // Given a build with no Cloudflare credentials — when the gate runs, then it returns without
        // awaiting hydration
        mockIsConfigured.mockReturnValue(false);
        await ensureQAAuthenticated(REDIRECTING_COMMAND);
        expect(mockWaitForActiveServerHydration).not.toHaveBeenCalled();
        expect(mockBeginRedirect).not.toHaveBeenCalled();
    });

    it('does nothing when a session already exists', async () => {
        // Given a live session — when the gate runs, then it must not navigate away from a working tab
        mockGetSession.mockReturnValue(LIVE_SESSION);
        await ensureQAAuthenticated(REDIRECTING_COMMAND);
        expect(mockBeginRedirect).not.toHaveBeenCalled();
    });

    it('joins an in-flight callback exchange instead of starting a second round trip', async () => {
        // Given this page load IS the callback: an exchange is in flight and stores the session when it settles
        mockGetPending.mockReturnValue(
            Promise.resolve().then(() => {
                mockGetSession.mockReturnValue(LIVE_SESSION);
            }),
        );

        // When the gate runs, then it waits for that exchange and finds the session it produced
        await ensureQAAuthenticated(REDIRECTING_COMMAND);
        expect(mockBeginRedirect).not.toHaveBeenCalled();
    });

    it('does NOT redirect when the in-flight exchange rejects, so a failed callback cannot start a redirect loop', async () => {
        // Given the callback exchange failed — when the gate runs, then it must stop rather than redirect
        mockGetPending.mockReturnValue(Promise.reject(new Error('invalid_grant')));
        mockGetSession.mockReturnValue(undefined);
        ensureQAAuthenticated(REDIRECTING_COMMAND);
        await waitForBatchedUpdates();
        expect(mockBeginRedirect).not.toHaveBeenCalled();
    });

    it('redirects at most once even when called concurrently', async () => {
        // Given two callers race — when both run, then the single-flight gate runs the decision chain once,
        // so a second caller cannot reach the redirect while the first is still awaiting hydration
        ensureQAAuthenticated(REDIRECTING_COMMAND);
        ensureQAAuthenticated(REDIRECTING_COMMAND);
        await waitForBatchedUpdates();
        expect(mockBeginRedirect).toHaveBeenCalledTimes(1);
    });

    it('decides again after the active server changes, because flipping the switch does not reload the page', async () => {
        // Given a non-QA first run that correctly did nothing
        mockIsQAServerActive.mockReturnValue(false);
        await ensureQAAuthenticated(REDIRECTING_COMMAND);
        expect(mockBeginRedirect).not.toHaveBeenCalled();

        // When the switch flips to QA and the next QA request runs the gate, then it must redirect
        mockIsQAServerActive.mockReturnValue(true);
        mockGetActiveServer.mockReturnValue(CONST.SERVER.QA);
        ensureQAAuthenticated(REDIRECTING_COMMAND);
        await waitForBatchedUpdates();
        expect(mockBeginRedirect).toHaveBeenCalledTimes(1);
    });

    it('does not redirect for a command the user is not waiting on', async () => {
        // Given a QA build with no session, and background traffic rather than a sign-in
        await ensureQAAuthenticated(BACKGROUND_COMMAND);

        // Then nothing navigates
        expect(mockBeginRedirect).not.toHaveBeenCalled();
        // Then it still waited for the signals, so it cannot be sent bearer-less while a session is hydrating
        expect(mockWaitForActiveServerHydration).toHaveBeenCalled();
    });

    it('does not redirect for an unnamed command', async () => {
        // Given a request that reached the QA layer without a command name — when the gate runs, then it is
        // treated as background, because no allowlisted command is anonymous
        await ensureQAAuthenticated();
        expect(mockBeginRedirect).not.toHaveBeenCalled();
    });

    it('a background caller does not consume the redirect an allowlisted caller is entitled to', async () => {
        // Given background traffic reaches the gate first
        ensureQAAuthenticated(BACKGROUND_COMMAND);
        await waitForBatchedUpdates();
        expect(mockBeginRedirect).not.toHaveBeenCalled();

        // When the sign-in POST follows, then it still gets its redirect
        ensureQAAuthenticated(REDIRECTING_COMMAND);
        await waitForBatchedUpdates();
        expect(mockBeginRedirect).toHaveBeenCalledTimes(1);
    });

    it('handleQAReauthRequired does not redirect for a command the user is not waiting on', () => {
        // Given a QA build where background traffic just gave up on the session — when the 401 path runs,
        // then it must not navigate either
        handleQAReauthRequired(BACKGROUND_COMMAND);
        expect(mockBeginRedirect).not.toHaveBeenCalled();
    });

    it('handleQAReauthRequired redirects in QA mode', () => {
        // Given a QA request came back CF_REAUTH_REQUIRED — when the handler runs, then it re-authorizes
        // without awaiting hydration
        handleQAReauthRequired(REDIRECTING_COMMAND);
        expect(mockBeginRedirect).toHaveBeenCalledTimes(1);
    });

    it('handleQAReauthRequired does nothing outside QA mode', () => {
        // Given a non-QA build — when the handler runs, then nothing navigates
        mockIsQAServerActive.mockReturnValue(false);
        handleQAReauthRequired(REDIRECTING_COMMAND);
        expect(mockBeginRedirect).not.toHaveBeenCalled();
    });
});
