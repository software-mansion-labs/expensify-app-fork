/**
 * The probe's decision tree: which branch runs for which session state, and that every failure comes back
 * as a semantic result rather than a rejection. Its dependencies are mocked, since they have their own suites.
 */
import {runCloudflareAuthProbe} from '@userActions/CloudflareProbe';
import {redirectToCloudflareSignIn, getCloudflareSession, getPendingCloudflareCodeExchange} from '@userActions/CloudflareSession';

import CONFIG from '@src/CONFIG';
import CONST from '@src/CONST';
import type CloudflareSession from '@src/types/onyx/CloudflareSession';

import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

/** The parsed body processHTTPRequest resolves to; the probe reads one diagnostic field off it */
const mockProcessHTTPRequest = jest.fn<Promise<Record<string, unknown>>, [string, string]>();

jest.mock('@userActions/CloudflareSession', () => ({
    __esModule: true,
    getCloudflareSession: jest.fn(),
    getPendingCloudflareCodeExchange: jest.fn(() => null),
    waitForCloudflareSessionHydration: jest.fn(() => Promise.resolve()),
    redirectToCloudflareSignIn: jest.fn(),
}));

jest.mock('@libs/HttpUtils', () => ({
    __esModule: true,
    // Forwarding wrapper instead of the mock itself: the factory runs while the hoisted import chain is still
    // executing, before mockProcessHTTPRequest's initializer. A direct reference would capture undefined
    default: {processHTTPRequest: (...args: Parameters<typeof mockProcessHTTPRequest>) => mockProcessHTTPRequest(...args)},
}));

const SESSION: CloudflareSession = {accessToken: 'oauth:access', refreshToken: 'oauth:refresh', expiresAt: 1900000000000};

beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks keeps implementations, and the redirect stub is deliberately never-settling in one
    // case. Leaking that into the next test would hang it
    jest.mocked(redirectToCloudflareSignIn).mockReset();
    jest.mocked(getPendingCloudflareCodeExchange).mockReturnValue(null);
    mockProcessHTTPRequest.mockResolvedValue({jsonCode: 200, authenticatedVia: 'oauth-bearer'});
});

describe('runCloudflareAuthProbe', () => {
    it('with no session: starts the redirect and never fires the request — the page is leaving', async () => {
        // Given no stored session, so the only path to working auth is a fresh authorize round trip
        jest.mocked(getCloudflareSession).mockReturnValue(null);
        // Given a redirect stub that, like the real one, navigates the tab away and never settles
        jest.mocked(redirectToCloudflareSignIn).mockReturnValue(new Promise<never>(() => {}));

        // When the probe runs
        let isSettled = false;
        runCloudflareAuthProbe().then(() => {
            isSettled = true;
            return undefined;
        });
        await waitForBatchedUpdates();

        // Then it should start the redirect and do nothing else: the page is leaving, so firing the request
        // or settling the promise would only report into a tab that is about to be gone
        expect(redirectToCloudflareSignIn).toHaveBeenCalledTimes(1);
        expect(mockProcessHTTPRequest).not.toHaveBeenCalled();
        expect(isSettled).toBe(false);
    });

    it('joins a callback-boot exchange instead of starting a second redirect', async () => {
        // Given the boot after the callback: the exchange is in flight, and populates the cache before the
        // probe reads it, so no second round trip is needed
        jest.mocked(getCloudflareSession).mockReturnValue(SESSION);
        jest.mocked(getPendingCloudflareCodeExchange).mockReturnValue(Promise.resolve());

        // When the probe runs
        // Then it should join the in-flight exchange and succeed off the session that exchange produced
        await expect(runCloudflareAuthProbe()).resolves.toEqual({status: 'success', detail: 'authenticatedVia: oauth-bearer'});

        // Then no second redirect should start: the authorization code is single-use, so another round trip
        // could only invalidate the exchange already under way
        expect(redirectToCloudflareSignIn).not.toHaveBeenCalled();
    });

    it('surfaces a failed callback-boot exchange as signInFailed, with no redirect', async () => {
        // Given a callback boot whose in-flight exchange rejects. The sign-in itself failed
        jest.mocked(getCloudflareSession).mockReturnValue(null);
        jest.mocked(getPendingCloudflareCodeExchange).mockReturnValue(Promise.reject(new Error('invalid_grant')));

        // When the probe joins that exchange
        // Then it should report signInFailed rather than a generic error: the sign-in failed, not the probe,
        // and naming it tells the user that running the probe again (a fresh authorize round trip) is the retry
        await expect(runCloudflareAuthProbe()).resolves.toEqual({status: 'signInFailed', detail: 'invalid_grant'});

        // Then no redirect and no request: the retry must be the user's informed rerun, not something the
        // probe launches behind their back
        expect(redirectToCloudflareSignIn).not.toHaveBeenCalled();
        expect(mockProcessHTTPRequest).not.toHaveBeenCalled();
    });

    it('with a session: goes straight to the request through the same client the app uses', async () => {
        // Given a stored session, so the probe has nothing to do before sending
        jest.mocked(getCloudflareSession).mockReturnValue(SESSION);

        // When the probe runs
        // Then it should succeed and echo how the Worker authenticated the request. Exercising that
        // end-to-end path is the probe's whole purpose
        await expect(runCloudflareAuthProbe()).resolves.toEqual({status: 'success', detail: 'authenticatedVia: oauth-bearer'});

        // Then it should send through processHTTPRequest rather than a probe-only fetch: the bearer, the
        // pre-expiry refresh and the 401 fallback all live there, so a private path would prove nothing
        // about the code the app actually runs
        expect(mockProcessHTTPRequest).toHaveBeenCalledTimes(1);
        // The configured check endpoint, not OpenApp: OPEN_APP is in HttpUtils' addSkewList, so a mock's Date
        // header would poison the app-wide time-skew calculation
        expect(mockProcessHTTPRequest).toHaveBeenCalledWith(`${CONFIG.QA_AUTH.API_ROOT}${CONFIG.QA_AUTH.CHECK_PATH}`, CONST.NETWORK.METHOD.POST);

        // Then no redirect: a session the client accepts needs no auth flow
        expect(redirectToCloudflareSignIn).not.toHaveBeenCalled();
    });

    it('with a dead session: reports reauthRequired and leaves the redirect to the client that found it dead', async () => {
        // Given a stored session the client rejects as unrecoverable. The server, not the local clock, is
        // the authority on when re-auth is needed
        jest.mocked(getCloudflareSession).mockReturnValue(SESSION);
        mockProcessHTTPRequest.mockRejectedValue(new Error(CONST.ERROR.CF_REAUTH_REQUIRED));

        // When the probe runs without consent to redirect
        // Then it should map the rejection to reauthRequired instead of rejecting: the UI consumes the result
        // with .then only
        await expect(runCloudflareAuthProbe()).resolves.toEqual({status: 'reauthRequired'});

        // Then the probe should not redirect on its own. HttpUtils already called handleQAReauthRequired for
        // this rejection (asserted in HttpUtilsTest), so on a QA build the tab is already navigating; a second
        // call here would add nothing, and duplicating that decision is what Task 7 removed
        expect(redirectToCloudflareSignIn).not.toHaveBeenCalled();
    });

    it('redirects on a dead session when the press consented, since the client may not have', async () => {
        // Given the same unrecoverable rejection
        jest.mocked(getCloudflareSession).mockReturnValue(SESSION);
        mockProcessHTTPRequest.mockRejectedValue(new Error(CONST.ERROR.CF_REAUTH_REQUIRED));
        jest.mocked(redirectToCloudflareSignIn).mockReturnValue(new Promise<never>(() => {}));

        // When the probe runs with shouldRedirectOnReauthRequired. The user already saw reauthRequired and
        // pressed Run again, and that informed second press is the consent
        let isSettled = false;
        runCloudflareAuthProbe({shouldRedirectOnReauthRequired: true}).then(() => {
            isSettled = true;
            return undefined;
        });
        await waitForBatchedUpdates();

        // Then the redirect should start and the probe never settle. This is not redundant with HttpUtils:
        // handleQAReauthRequired only redirects while QA is the active server, and the test tool can probe the
        // QA origin from a staging or production session, where the consenting press is the only thing that can
        expect(redirectToCloudflareSignIn).toHaveBeenCalledTimes(1);
        expect(isSettled).toBe(false);
    });

    it('reports any other request failure as a plain error, keeping advice honest', async () => {
        // Given a request that fails for a reason a retry may fix. The network dropped, not the token
        jest.mocked(getCloudflareSession).mockReturnValue(SESSION);
        mockProcessHTTPRequest.mockRejectedValue(new TypeError('Failed to fetch'));

        // When the probe runs
        // Then it should report a plain error rather than reauthRequired: only the re-auth sentinel means the
        // session is gone, so any stronger advice for anything else would be dishonest
        await expect(runCloudflareAuthProbe()).resolves.toEqual({status: 'error', detail: 'Failed to fetch'});

        // Then no redirect: a transient failure must never navigate the tab away
        expect(redirectToCloudflareSignIn).not.toHaveBeenCalled();
    });

    it('maps a redirect that could not start to a semantic error result', async () => {
        // Given no session and a redirect that cannot even begin
        jest.mocked(getCloudflareSession).mockReturnValue(null);
        jest.mocked(redirectToCloudflareSignIn).mockRejectedValue(new Error('Session storage is unavailable'));

        // When the probe runs
        // Then even this failure should resolve as a semantic error result: the probe must never reject,
        // because the UI consumes it with .then only
        await expect(runCloudflareAuthProbe()).resolves.toEqual({status: 'error', detail: 'Session storage is unavailable'});
    });

    it('reports success with a null echo when the Worker response carries no authenticatedVia', async () => {
        // Given a Worker response that omits the authenticatedVia echo
        jest.mocked(getCloudflareSession).mockReturnValue(SESSION);
        mockProcessHTTPRequest.mockResolvedValue({jsonCode: 200});

        // When the probe runs
        // Then it should still report success, showing 'null' for the echo: the echo is a diagnostic read
        // loosely, not a contract, so its absence must not fail an otherwise healthy round trip
        await expect(runCloudflareAuthProbe()).resolves.toEqual({status: 'success', detail: 'authenticatedVia: null'});
    });
});
