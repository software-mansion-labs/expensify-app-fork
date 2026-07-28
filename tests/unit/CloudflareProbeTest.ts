/**
 * Tests for the QA auth probe decision tree (Web_POC.md): which branch runs for which session state,
 * and the guarantee that every failure comes back as a semantic result instead of an unhandled
 * rejection. Session action and HttpUtils are mocked — their own invariants live in their own suites.
 */
import {runQAProbe} from '@userActions/CloudflareProbe';
import {getCfSession, isSessionNearExpiry, refreshCfSession, startQAAuthFlow} from '@userActions/CloudflareSession';

import CONST from '@src/CONST';
import type CloudflareSession from '@src/types/onyx/CloudflareSession';

/** What the probe reads off the response. The mock is typed to this minimal surface instead of the
 * real generic Response<OnyxKey> — instantiating that union just for a stub trips tsgo's complexity
 * limit when it compares the mock's implementation signature. */
type ProbeResponse = {jsonCode: number; authenticatedVia?: string};

const mockProcessHTTPRequest = jest.fn<Promise<ProbeResponse>, [string, string]>();

jest.mock('@userActions/CloudflareSession', () => ({
    __esModule: true,
    getCfSession: jest.fn(),
    isSessionNearExpiry: jest.fn(() => false),
    refreshCfSession: jest.fn(),
    startQAAuthFlow: jest.fn(),
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
    jest.mocked(isSessionNearExpiry).mockReturnValue(false);
    mockProcessHTTPRequest.mockResolvedValue({jsonCode: 200, authenticatedVia: 'oauth-bearer'});
});

describe('runQAProbe', () => {
    it('with no session: runs the auth flow, then the probe request', async () => {
        jest.mocked(getCfSession).mockReturnValue(null);
        jest.mocked(startQAAuthFlow).mockResolvedValue(true);

        await expect(runQAProbe()).resolves.toEqual({status: 'success', detail: 'authenticatedVia: oauth-bearer'});

        expect(startQAAuthFlow).toHaveBeenCalledTimes(1);
        expect(mockProcessHTTPRequest).toHaveBeenCalledWith(expect.stringContaining('api/CloudflareAuthProbe'), CONST.NETWORK.METHOD.POST);
    });

    it('reports cancel without firing the request', async () => {
        jest.mocked(getCfSession).mockReturnValue(null);
        jest.mocked(startQAAuthFlow).mockResolvedValue(false);

        await expect(runQAProbe()).resolves.toEqual({status: 'cancelled'});

        expect(mockProcessHTTPRequest).not.toHaveBeenCalled();
    });

    it('with a fresh session: goes straight to the request, no auth flow', async () => {
        jest.mocked(getCfSession).mockReturnValue(SESSION);

        await expect(runQAProbe()).resolves.toEqual({status: 'success', detail: 'authenticatedVia: oauth-bearer'});

        expect(startQAAuthFlow).not.toHaveBeenCalled();
        expect(refreshCfSession).not.toHaveBeenCalled();
    });

    it('near expiry with a terminal refresh: reports reauthRequired with no popup and no request', async () => {
        jest.mocked(getCfSession).mockReturnValue(SESSION);
        jest.mocked(isSessionNearExpiry).mockReturnValue(true);
        jest.mocked(refreshCfSession).mockResolvedValue('reauth-required');

        await expect(runQAProbe()).resolves.toEqual({status: 'reauthRequired'});

        expect(startQAAuthFlow).not.toHaveBeenCalled();
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

    it('maps auth flow rejections (state mismatch, blocked popup) to a semantic error result', async () => {
        jest.mocked(getCfSession).mockReturnValue(null);
        jest.mocked(startQAAuthFlow).mockRejectedValue(new Error('OAuth callback state mismatch'));

        await expect(runQAProbe()).resolves.toEqual({status: 'error', detail: 'OAuth callback state mismatch'});
    });

    it('reports success with a null echo when the Worker response carries no authenticatedVia', async () => {
        jest.mocked(getCfSession).mockReturnValue(SESSION);
        mockProcessHTTPRequest.mockResolvedValue({jsonCode: 200});

        await expect(runQAProbe()).resolves.toEqual({status: 'success', detail: 'authenticatedVia: null'});
    });
});
