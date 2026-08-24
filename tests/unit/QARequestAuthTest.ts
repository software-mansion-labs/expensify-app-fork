import type {HandleQAUnauthorized, PrepareQARequestAuth} from '@libs/CloudflareAccess/QARequestAuth/types';

import CONST from '@src/CONST';

const mockEnsureQAAuthenticated = jest.fn(() => Promise.resolve());
const mockHandleQAReauthRequired = jest.fn();
const mockGetCloudflareSession = jest.fn();
const mockIsSessionNearExpiry = jest.fn();
const mockRefreshCloudflareSession = jest.fn();
const mockMarkCloudflareSessionRejected = jest.fn(() => Promise.resolve());

jest.mock('@libs/CloudflareAccess/ensureQAAuthenticated', () => ({
    ensureQAAuthenticated: mockEnsureQAAuthenticated,
    handleQAReauthRequired: mockHandleQAReauthRequired,
}));
jest.mock('@userActions/CloudflareSession', () => ({
    getCloudflareSession: mockGetCloudflareSession,
    // A jest.fn rather than the real comparison, so a test states "near expiry" outright instead of
    // reproducing ACCESS_TOKEN_EXPIRY_BUFFER_MS in an expiresAt it then has to keep in sync
    isSessionNearExpiry: mockIsSessionNearExpiry,
    refreshCloudflareSession: mockRefreshCloudflareSession,
    markCloudflareSessionRejected: mockMarkCloudflareSessionRejected,
}));

// Explicit /index.ts: the jest-expo preset resolves the native platform first, and the native variant is a stub
const {handleQAUnauthorized, prepareQARequestAuth} = require<{
    handleQAUnauthorized: HandleQAUnauthorized;
    prepareQARequestAuth: PrepareQARequestAuth;
}>('@libs/CloudflareAccess/QARequestAuth/index.ts');

const SESSION = {accessToken: 'oauth:abc', refreshToken: 'oauth:ref', expiresAt: Date.now() + 900_000};
const AUTH = {accessToken: SESSION.accessToken, headers: {Authorization: `Bearer ${SESSION.accessToken}`}};

beforeEach(() => {
    jest.clearAllMocks();
    mockEnsureQAAuthenticated.mockResolvedValue(undefined);
    mockGetCloudflareSession.mockReturnValue(SESSION);
    // Default: a healthy token, so only the tests that opt in exercise the pre-flight refresh
    mockIsSessionNearExpiry.mockReturnValue(false);
});

describe('prepareQARequestAuth', () => {
    it('waits for the gate, then returns the bearer for the cached token', async () => {
        // Given a gate that has not resolved yet
        let releaseGate!: () => void;
        mockEnsureQAAuthenticated.mockReturnValue(
            new Promise<void>((resolve) => {
                releaseGate = resolve;
            }),
        );

        const prepared = prepareQARequestAuth();
        let isSettled = false;
        prepared.then(() => {
            isSettled = true;
            return undefined;
        });
        await Promise.resolve();

        // Then no credential is produced yet: a bearer-less QA request can only 401, and the 401 handler
        // cannot rescue it because there is no token yet to refresh
        expect(isSettled).toBe(false);

        releaseGate();
        await expect(prepared).resolves.toEqual(AUTH);
    });

    it('resolves undefined when the gate leaves no session behind', async () => {
        // Given a gate that resolved without establishing a session — the caller must send bearer-less
        // rather than be blocked, so this is `undefined` and not a throw
        mockGetCloudflareSession.mockReturnValue(null);

        await expect(prepareQARequestAuth()).resolves.toBeUndefined();
        expect(mockRefreshCloudflareSession).not.toHaveBeenCalled();
    });

    // The design doc's PRIMARY refresh path: rotating before the request costs no wasted round trip, where
    // the 401 fallback costs one
    it('rotates a near-expiry token before the request and returns the rotated bearer', async () => {
        mockIsSessionNearExpiry.mockReturnValue(true);
        mockRefreshCloudflareSession.mockImplementation(() => {
            mockGetCloudflareSession.mockReturnValue({...SESSION, accessToken: 'oauth:new'});
            return Promise.resolve('refreshed');
        });

        await expect(prepareQARequestAuth()).resolves.toEqual({accessToken: 'oauth:new', headers: {Authorization: 'Bearer oauth:new'}});
        // Refreshed FROM the near-expiry token, so a rotation that already happened elsewhere is skipped
        expect(mockRefreshCloudflareSession).toHaveBeenCalledWith(SESSION.accessToken);
    });

    it('re-authorizes instead of producing a credential when the pre-flight refresh is terminal', async () => {
        mockIsSessionNearExpiry.mockReturnValue(true);
        mockRefreshCloudflareSession.mockResolvedValue('reauth-required');

        await expect(prepareQARequestAuth()).rejects.toThrow(CONST.ERROR.CF_REAUTH_REQUIRED);
        expect(mockHandleQAReauthRequired).toHaveBeenCalledTimes(1);
    });
});

describe('handleQAUnauthorized', () => {
    it('refreshes from the rejected token and returns the rotated credential to retry with', async () => {
        mockRefreshCloudflareSession.mockImplementation(() => {
            mockGetCloudflareSession.mockReturnValue({...SESSION, accessToken: 'oauth:new'});
            return Promise.resolve('refreshed');
        });

        await expect(handleQAUnauthorized(AUTH, {isRetry: false})).resolves.toEqual({accessToken: 'oauth:new', headers: {Authorization: 'Bearer oauth:new'}});
        expect(mockRefreshCloudflareSession).toHaveBeenCalledWith(SESSION.accessToken);
        expect(mockMarkCloudflareSessionRejected).not.toHaveBeenCalled();
    });

    it('re-authorizes when the refresh is terminal', async () => {
        mockRefreshCloudflareSession.mockResolvedValue('reauth-required');

        await expect(handleQAUnauthorized(AUTH, {isRetry: false})).rejects.toThrow(CONST.ERROR.CF_REAUTH_REQUIRED);
        expect(mockHandleQAReauthRequired).toHaveBeenCalledTimes(1);
        // Not dropped here: refreshCloudflareSession owns that decision, and the store is shared across tabs
        expect(mockMarkCloudflareSessionRejected).not.toHaveBeenCalled();
    });

    it('propagates a transient refresh failure as itself, keeping the session', async () => {
        const transientError = new Error('Network request failed');
        mockRefreshCloudflareSession.mockRejectedValue(transientError);

        // Then no re-auth: a network blip says nothing about the token, so it must not force a redirect
        await expect(handleQAUnauthorized(AUTH, {isRetry: false})).rejects.toBe(transientError);
        expect(mockHandleQAReauthRequired).not.toHaveBeenCalled();
        expect(mockMarkCloudflareSessionRejected).not.toHaveBeenCalled();
    });

    it('drops the session and re-authorizes when a freshly refreshed token was the one rejected', async () => {
        // Given the 401 came from the retry: refresh has demonstrably already failed to fix this session
        await expect(handleQAUnauthorized(AUTH, {isRetry: true})).rejects.toThrow(CONST.ERROR.CF_REAUTH_REQUIRED);

        // Then the dead session is dropped token-guarded, and no second refresh is attempted
        expect(mockMarkCloudflareSessionRejected).toHaveBeenCalledWith(SESSION.accessToken);
        expect(mockRefreshCloudflareSession).not.toHaveBeenCalled();
        expect(mockHandleQAReauthRequired).toHaveBeenCalledTimes(1);
    });

    it('re-authorizes when the session is cleared while the refresh is in flight', async () => {
        // Given a refresh that succeeded but a sign-out that removed the session before it was read back:
        // there is no credential left to retry with, so this is the same answer as a dead session
        mockRefreshCloudflareSession.mockImplementation(() => {
            mockGetCloudflareSession.mockReturnValue(null);
            return Promise.resolve('refreshed');
        });

        await expect(handleQAUnauthorized(AUTH, {isRetry: false})).rejects.toThrow(CONST.ERROR.CF_REAUTH_REQUIRED);
        expect(mockHandleQAReauthRequired).toHaveBeenCalledTimes(1);
    });
});
