/**
 * Tests for the Cloudflare QA session action (Web_POC.md): single-flight refresh with rotated-token
 * persistence, the terminal/transient failure split, and the two halves of the same-tab redirect auth
 * flow. Modules are re-required per test because the module-level caches (session, in-flight promises)
 * are exactly what's under test.
 */
import type WebCryptoProvider from '@libs/CloudflareOAuth/getWebCrypto/types';
import type * as OauthClientModule from '@libs/CloudflareOAuth/oauthClient';
import type * as PkceModule from '@libs/CloudflareOAuth/pkce';
import type * as RedirectFlowStorageModule from '@libs/CloudflareOAuth/redirectFlowStorage';

import type * as SessionActionsModule from '@userActions/CloudflareSession';

import type * as OnyxKeysModule from '@src/ONYXKEYS';
import type CloudflareSession from '@src/types/onyx/CloudflareSession';

// Default type import only: a namespace import would pull in the restricted `useOnyx` name
import type OnyxDefault from 'react-native-onyx';

import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

type PKCEPair = PkceModule.PKCEPair;

const AUTHORIZE_URL = 'https://team.cloudflareaccess.com/cdn-cgi/access/oauth/authorization?mock=1';

jest.mock('@libs/CloudflareOAuth/oauthClient', () => ({
    __esModule: true,
    // Keep the real OAuthError class — the terminal/transient split hangs on instanceof
    ...jest.requireActual<typeof OauthClientModule>('@libs/CloudflareOAuth/oauthClient'),
    buildAuthorizeURL: jest.fn(() => AUTHORIZE_URL),
    exchangeCode: jest.fn(),
    refreshTokens: jest.fn(),
}));

jest.mock('@libs/CloudflareOAuth/pkce', () => ({
    __esModule: true,
    generatePKCEPair: jest.fn(),
    generateState: jest.fn(() => 'test-state'),
}));

const SESSION_A: CloudflareSession = {accessToken: 'oauth:access-a', refreshToken: 'oauth:refresh-a', expiresAt: 1900000000000};
const SESSION_B: CloudflareSession = {accessToken: 'oauth:access-b', refreshToken: 'oauth:refresh-b', expiresAt: 1900000900000};

const PAIR_1: PKCEPair = {codeVerifier: 'verifier-1', codeChallenge: 'challenge-1'};

function createDeferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return {promise, resolve, reject};
}

let Onyx: typeof OnyxDefault;
let ONYXKEYS: typeof OnyxKeysModule.default;
let SessionActions: typeof SessionActionsModule;
let oauthClient: typeof OauthClientModule;
let pkce: typeof PkceModule;
let redirectFlowStorage: typeof RedirectFlowStorageModule;
let assignSpy: jest.Mock;
let realLocation: Location;

beforeEach(() => {
    jest.resetModules();
    // The redirect flow record lives in jsdom's real sessionStorage — drop leftovers from earlier tests
    window.sessionStorage.clear();
    // jsdom throws "Not implemented: navigation" on a real location.assign
    realLocation = window.location;
    assignSpy = jest.fn<void, [string]>();
    Object.defineProperty(window, 'location', {
        value: {origin: 'http://localhost', href: 'http://localhost/settings/troubleshoot', pathname: '/settings/troubleshoot', assign: assignSpy},
        writable: true,
        configurable: true,
    });
    Onyx = require<{default: typeof OnyxDefault}>('react-native-onyx').default;
    ONYXKEYS = require<typeof OnyxKeysModule>('@src/ONYXKEYS').default;
    Onyx.init({keys: ONYXKEYS});
    oauthClient = require<typeof OauthClientModule>('@libs/CloudflareOAuth/oauthClient');
    pkce = require<typeof PkceModule>('@libs/CloudflareOAuth/pkce');
    redirectFlowStorage = require<typeof RedirectFlowStorageModule>('@libs/CloudflareOAuth/redirectFlowStorage');
    SessionActions = require<typeof SessionActionsModule>('@userActions/CloudflareSession');
});

afterEach(() => {
    Object.defineProperty(window, 'location', {value: realLocation, writable: true, configurable: true});
});

async function seedSession(session: CloudflareSession | null) {
    await Onyx.set(ONYXKEYS.CF_SESSION, session);
    await waitForBatchedUpdates();
}

describe('refreshCfSession', () => {
    it('is single-flight: concurrent callers share one refreshTokens call', async () => {
        await seedSession(SESSION_A);
        const refreshDeferred = createDeferred<CloudflareSession>();
        jest.mocked(oauthClient.refreshTokens).mockReturnValue(refreshDeferred.promise);

        const first = SessionActions.refreshCfSession();
        const second = SessionActions.refreshCfSession();
        expect(second).toBe(first);

        refreshDeferred.resolve(SESSION_B);
        await expect(first).resolves.toBe('refreshed');
        await expect(second).resolves.toBe('refreshed');
        expect(oauthClient.refreshTokens).toHaveBeenCalledTimes(1);
        expect(SessionActions.getCfSession()).toEqual(SESSION_B);
    });

    it('joins the in-flight refresh before the staleness shortcut, so late callers cannot race ahead of persistence', async () => {
        await seedSession(SESSION_A);
        jest.mocked(oauthClient.refreshTokens).mockResolvedValue(SESSION_B);
        const persistDeferred = createDeferred<void>();
        const setSpy = jest.spyOn(Onyx, 'set').mockReturnValue(persistDeferred.promise);

        const inFlight = SessionActions.refreshCfSession();
        await waitForBatchedUpdates(); // rotation resolved, cache updated, Onyx.set still pending

        // The cache already holds SESSION_B, so the staleness shortcut WOULD match — but the join must win
        const lateCaller = SessionActions.refreshCfSession(SESSION_A.accessToken);
        expect(lateCaller).toBe(inFlight);

        let isSettled = false;
        inFlight.then(() => {
            isSettled = true;
            return undefined;
        });
        await waitForBatchedUpdates();
        expect(isSettled).toBe(false); // not before the rotated pair is persisted

        persistDeferred.resolve();
        await expect(inFlight).resolves.toBe('refreshed');
        expect(oauthClient.refreshTokens).toHaveBeenCalledTimes(1);
        setSpy.mockRestore();
    });

    it('skips with no network call when the token was already rotated and no refresh is in flight', async () => {
        await seedSession(SESSION_B);
        await expect(SessionActions.refreshCfSession(SESSION_A.accessToken)).resolves.toBe('skipped-newer-token');
        expect(oauthClient.refreshTokens).not.toHaveBeenCalled();
    });

    it.each(['invalid_grant', 'invalid_response'])('clears the session and resolves reauth-required on the terminal %s', async (code) => {
        await seedSession(SESSION_A);
        jest.mocked(oauthClient.refreshTokens).mockRejectedValue(new oauthClient.OAuthError(code));

        await expect(SessionActions.refreshCfSession()).resolves.toBe('reauth-required');
        expect(SessionActions.getCfSession()).toBeNull();
    });

    it('rethrows transient failures and keeps the session', async () => {
        await seedSession(SESSION_A);
        const transientError = new TypeError('Failed to fetch');
        jest.mocked(oauthClient.refreshTokens).mockRejectedValue(transientError);

        await expect(SessionActions.refreshCfSession()).rejects.toBe(transientError);
        expect(SessionActions.getCfSession()).toEqual(SESSION_A);
    });

    it('resolves reauth-required without a network call when there is no session', async () => {
        await seedSession(null);
        await expect(SessionActions.refreshCfSession()).resolves.toBe('reauth-required');
        expect(oauthClient.refreshTokens).not.toHaveBeenCalled();
    });
});

describe('markCfSessionRejected', () => {
    it('drops the session when the rejected token matches', async () => {
        await seedSession(SESSION_A);
        await SessionActions.markCfSessionRejected(SESSION_A.accessToken);
        expect(SessionActions.getCfSession()).toBeNull();
    });

    it('leaves a newer session untouched', async () => {
        await seedSession(SESSION_B);
        await SessionActions.markCfSessionRejected(SESSION_A.accessToken);
        expect(SessionActions.getCfSession()).toEqual(SESSION_B);
    });
});

describe('beginQAAuthRedirect', () => {
    it('stores the flow record before navigating — module memory does not survive the unload', async () => {
        jest.mocked(pkce.generatePKCEPair).mockResolvedValue(PAIR_1);
        const savedBeforeAssign: Array<string | null> = [];
        assignSpy.mockImplementation(() => {
            savedBeforeAssign.push(window.sessionStorage.getItem('QA_AUTH_REDIRECT_FLOW'));
        });

        SessionActions.beginQAAuthRedirect('http://localhost/settings/troubleshoot');
        await waitForBatchedUpdates();

        expect(assignSpy).toHaveBeenCalledWith(AUTHORIZE_URL);
        // The record must already be readable at the moment the navigation is requested
        expect(savedBeforeAssign.at(0)).not.toBeNull();
        expect(redirectFlowStorage.consumePendingRedirectFlow()).toMatchObject({
            state: 'test-state',
            codeVerifier: PAIR_1.codeVerifier,
            returnURL: 'http://localhost/settings/troubleshoot',
        });
        expect(jest.mocked(oauthClient.buildAuthorizeURL)).toHaveBeenCalledWith({state: 'test-state', codeChallenge: PAIR_1.codeChallenge});
    });

    it('never settles once the navigation is requested, so callers run nothing after it', async () => {
        jest.mocked(pkce.generatePKCEPair).mockResolvedValue(PAIR_1);

        let isSettled = false;
        SessionActions.beginQAAuthRedirect().then(
            () => {
                isSettled = true;
            },
            () => {
                isSettled = true;
            },
        );
        await waitForBatchedUpdates();

        expect(assignSpy).toHaveBeenCalledTimes(1);
        expect(isSettled).toBe(false);
    });

    it('refuses to navigate when the flow record cannot be stored', async () => {
        jest.mocked(pkce.generatePKCEPair).mockResolvedValue(PAIR_1);
        // jsdom's Storage methods are not spy-able, so the whole object is swapped out
        const realSessionStorage = window.sessionStorage;
        Object.defineProperty(window, 'sessionStorage', {
            value: {
                getItem: () => null,
                removeItem: () => {},
                setItem: () => {
                    throw new Error('QuotaExceededError');
                },
            },
            writable: true,
            configurable: true,
        });

        // Navigating away without a stored verifier would strand the flow with no way to exchange
        await expect(SessionActions.beginQAAuthRedirect()).rejects.toThrow('QuotaExceededError');
        expect(assignSpy).not.toHaveBeenCalled();

        Object.defineProperty(window, 'sessionStorage', {value: realSessionStorage, writable: true, configurable: true});
    });

    it('a second press while the first navigation settles does not overwrite the stored flow', async () => {
        jest.mocked(pkce.generatePKCEPair).mockResolvedValue(PAIR_1);

        SessionActions.beginQAAuthRedirect();
        SessionActions.beginQAAuthRedirect();
        await waitForBatchedUpdates();

        expect(assignSpy).toHaveBeenCalledTimes(1);
        expect(pkce.generatePKCEPair).toHaveBeenCalledTimes(1);
    });
});

describe('completeQAAuthRedirect', () => {
    it('caches the session before persistence but resolves only after Onyx.set completed', async () => {
        jest.mocked(oauthClient.exchangeCode).mockResolvedValue(SESSION_A);
        const persistDeferred = createDeferred<void>();
        const setSpy = jest.spyOn(Onyx, 'set').mockReturnValue(persistDeferred.promise);

        const completion = SessionActions.completeQAAuthRedirect({code: 'auth-code-1', codeVerifier: PAIR_1.codeVerifier});
        let isSettled = false;
        completion.then(() => {
            isSettled = true;
            return undefined;
        });
        await waitForBatchedUpdates();

        expect(oauthClient.exchangeCode).toHaveBeenCalledWith({code: 'auth-code-1', codeVerifier: PAIR_1.codeVerifier});
        expect(SessionActions.getCfSession()).toEqual(SESSION_A); // cache first, requests during this boot must see it
        expect(isSettled).toBe(false); // but it waits for the disk write

        persistDeferred.resolve();
        await completion;
        expect(setSpy).toHaveBeenCalledWith(ONYXKEYS.CF_SESSION, SESSION_A);
        setSpy.mockRestore();
    });

    it('is single-flight: a joiner shares the exchange instead of burning the single-use code twice', async () => {
        const exchangeDeferred = createDeferred<CloudflareSession>();
        jest.mocked(oauthClient.exchangeCode).mockReturnValue(exchangeDeferred.promise);

        const first = SessionActions.completeQAAuthRedirect({code: 'auth-code-1', codeVerifier: PAIR_1.codeVerifier});
        expect(SessionActions.getPendingQAAuthCompletion()).toBe(first);
        expect(SessionActions.completeQAAuthRedirect({code: 'auth-code-1', codeVerifier: PAIR_1.codeVerifier})).toBe(first);
        expect(oauthClient.exchangeCode).toHaveBeenCalledTimes(1);

        exchangeDeferred.resolve(SESSION_A);
        await first;
        expect(SessionActions.getPendingQAAuthCompletion()).toBeNull();
    });

    it('exposes no pending completion before an exchange starts', () => {
        expect(SessionActions.getPendingQAAuthCompletion()).toBeNull();
    });

    it('propagates an exchange failure and leaves the session empty', async () => {
        // Onyx storage outlives jest.resetModules, so an earlier test's persisted session would hydrate here
        await seedSession(null);
        jest.mocked(oauthClient.exchangeCode).mockRejectedValue(new oauthClient.OAuthError('invalid_grant'));

        await expect(SessionActions.completeQAAuthRedirect({code: 'bad-code', codeVerifier: PAIR_1.codeVerifier})).rejects.toMatchObject({code: 'invalid_grant'});
        expect(SessionActions.getCfSession()).toBeNull();
        expect(SessionActions.getPendingQAAuthCompletion()).toBeNull();
    });
});

describe('native platform safety', () => {
    it('the real getWebCrypto resolves to the native stub here: import-safe, loud when called', () => {
        // jest-expo's haste config resolves index.native.ts — the same file native builds get.
        // requireActual evaluating without throwing IS the import-safety claim.
        const actualProvider = jest.requireActual<{default: WebCryptoProvider}>('@libs/CloudflareOAuth/getWebCrypto').default;
        expect(() => actualProvider.getRandomValues(new Uint8Array(1))).toThrow('not implemented on native');
    });
});
