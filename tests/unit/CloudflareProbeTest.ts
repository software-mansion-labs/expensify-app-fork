/**
 * Tests for the QA auth probe decision tree (Web_POC.md): which branch runs for which session state,
 * and the guarantee that every failure comes back as a semantic result instead of an unhandled
 * rejection. Session action and HttpUtils are mocked — their own invariants live in their own suites.
 */
import {runQAProbe} from '@userActions/CloudflareProbe';
import {beginQAAuthRedirect, getCfSession, getPendingQAAuthCompletion, isSessionNearExpiry, refreshCfSession} from '@userActions/CloudflareSession';

import CONST from '@src/CONST';
import type CloudflareSession from '@src/types/onyx/CloudflareSession';

import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

/** What the probe reads off the response. The mock is typed to this minimal surface instead of the
 * real generic Response<OnyxKey> — instantiating that union just for a stub trips tsgo's complexity
 * limit when it compares the mock's implementation signature. */
type ProbeResponse = {jsonCode: number; authenticatedVia?: string};

const mockProcessHTTPRequest = jest.fn<Promise<ProbeResponse>, [string, string]>();

jest.mock('@userActions/CloudflareSession', () => ({
    __esModule: true,
    getCfSession: jest.fn(),
    getPendingQAAuthCompletion: jest.fn(() => null),
    isSessionNearExpiry: jest.fn(() => false),
    refreshCfSession: jest.fn(),
    waitForCfSessionHydration: jest.fn(() => Promise.resolve()),
    beginQAAuthRedirect: jest.fn(),
}));

jest.mock('@libs/HttpUtils', () => ({
    __esModule: true,
    // Forwarding wrapper instead of the mock itself: the factory runs while the hoisted import chain
    // is still executing, before mockProcessHTTPRequest's initializer — a direct reference captures undefined
    default: {processHTTPRequest: (...args: Parameters<typeof mockProcessHTTPRequest>) => mockProcessHTTPRequest(...args)},
}));

const SESSION: CloudflareSession = {accessToken: 'oauth:access', refreshToken: 'oauth:refresh', expiresAt: 1900000000000};

beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks keeps implementations, and the redirect stub is deliberately never-settling in one
    // case — leaking that into the next test would hang it
    jest.mocked(beginQAAuthRedirect).mockReset();
    jest.mocked(isSessionNearExpiry).mockReturnValue(false);
    jest.mocked(getPendingQAAuthCompletion).mockReturnValue(null);
    mockProcessHTTPRequest.mockResolvedValue({jsonCode: 200, authenticatedVia: 'oauth-bearer'});
});

describe('runQAProbe', () => {
    it('with no session: starts the redirect and never fires the request — the page is leaving', async () => {
        jest.mocked(getCfSession).mockReturnValue(null);
        // The real one navigates the tab away and never settles
        jest.mocked(beginQAAuthRedirect).mockReturnValue(new Promise<never>(() => {}));

        let isSettled = false;
        runQAProbe().then(() => {
            isSettled = true;
            return undefined;
        });
        await waitForBatchedUpdates();

        expect(beginQAAuthRedirect).toHaveBeenCalledTimes(1);
        expect(mockProcessHTTPRequest).not.toHaveBeenCalled();
        expect(isSettled).toBe(false);
    });

    it('joins a callback-boot exchange instead of starting a second redirect', async () => {
        // The boot after the callback: the exchange is in flight, and populates the cache before the
        // probe reads it — so no second round trip is needed
        jest.mocked(getCfSession).mockReturnValue(SESSION);
        jest.mocked(getPendingQAAuthCompletion).mockReturnValue(Promise.resolve());

        await expect(runQAProbe()).resolves.toEqual({status: 'success', detail: 'authenticatedVia: oauth-bearer'});

        expect(beginQAAuthRedirect).not.toHaveBeenCalled();
    });

    it('surfaces a failed callback-boot exchange as a semantic error', async () => {
        jest.mocked(getCfSession).mockReturnValue(null);
        jest.mocked(getPendingQAAuthCompletion).mockReturnValue(Promise.reject(new Error('invalid_grant')));

        await expect(runQAProbe()).resolves.toEqual({status: 'error', detail: 'invalid_grant'});

        expect(beginQAAuthRedirect).not.toHaveBeenCalled();
        expect(mockProcessHTTPRequest).not.toHaveBeenCalled();
    });

    it('with a fresh session: goes straight to the request, no auth flow', async () => {
        jest.mocked(getCfSession).mockReturnValue(SESSION);

        await expect(runQAProbe()).resolves.toEqual({status: 'success', detail: 'authenticatedVia: oauth-bearer'});

        expect(beginQAAuthRedirect).not.toHaveBeenCalled();
        expect(refreshCfSession).not.toHaveBeenCalled();
    });

    it('near expiry with a terminal refresh: reports reauthRequired with no redirect and no request', async () => {
        jest.mocked(getCfSession).mockReturnValue(SESSION);
        jest.mocked(isSessionNearExpiry).mockReturnValue(true);
        jest.mocked(refreshCfSession).mockResolvedValue('reauth-required');

        await expect(runQAProbe()).resolves.toEqual({status: 'reauthRequired'});

        // A background failure must never navigate the tab away
        expect(beginQAAuthRedirect).not.toHaveBeenCalled();
        expect(mockProcessHTTPRequest).not.toHaveBeenCalled();
    });

    it('near expiry with a transient refresh failure: reports a plain error, keeps advice honest', async () => {
        jest.mocked(getCfSession).mockReturnValue(SESSION);
        jest.mocked(isSessionNearExpiry).mockReturnValue(true);
        jest.mocked(refreshCfSession).mockRejectedValue(new TypeError('Failed to fetch'));

        await expect(runQAProbe()).resolves.toEqual({status: 'error', detail: 'Failed to fetch'});

        expect(mockProcessHTTPRequest).not.toHaveBeenCalled();
    });

    it('maps the request-level re-auth rejection to reauthRequired', async () => {
        jest.mocked(getCfSession).mockReturnValue(SESSION);
        mockProcessHTTPRequest.mockRejectedValue(new Error(CONST.ERROR.CF_REAUTH_REQUIRED));

        await expect(runQAProbe()).resolves.toEqual({status: 'reauthRequired'});
    });

    it('maps a redirect that could not start to a semantic error result', async () => {
        jest.mocked(getCfSession).mockReturnValue(null);
        jest.mocked(beginQAAuthRedirect).mockRejectedValue(new Error('Session storage is unavailable'));

        await expect(runQAProbe()).resolves.toEqual({status: 'error', detail: 'Session storage is unavailable'});
    });

    it('reports success with a null echo when the Worker response carries no authenticatedVia', async () => {
        jest.mocked(getCfSession).mockReturnValue(SESSION);
        mockProcessHTTPRequest.mockResolvedValue({jsonCode: 200});

        await expect(runQAProbe()).resolves.toEqual({status: 'success', detail: 'authenticatedVia: null'});
    });
});
