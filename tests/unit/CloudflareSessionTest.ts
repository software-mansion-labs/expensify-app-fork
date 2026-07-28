/**
 * Tests for the Cloudflare QA session action (Web_POC.md): single-flight refresh with rotated-token
 * persistence, the terminal/transient failure split, the pre-warmed popup auth flow, and callback
 * validation. Modules are re-required per test because the module-level caches (session, PKCE pair,
 * in-flight promises) are exactly what's under test.
 */
import type WebCryptoProvider from '@libs/CloudflareOAuth/getWebCrypto/types';
import type * as OauthClientModule from '@libs/CloudflareOAuth/oauthClient';
import type * as PkceModule from '@libs/CloudflareOAuth/pkce';

import type * as SessionActionsModule from '@userActions/CloudflareSession';

import type * as OnyxKeysModule from '@src/ONYXKEYS';
import type CloudflareSession from '@src/types/onyx/CloudflareSession';

import type * as ExpoWebBrowser from 'expo-web-browser';
// Default type import only: a namespace import would pull in the restricted `useOnyx` name
import type OnyxDefault from 'react-native-onyx';

import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

type PKCEPair = PkceModule.PKCEPair;

jest.mock('@libs/CloudflareOAuth/oauthClient', () => ({
    __esModule: true,
    // Keep the real OAuthError class — the terminal/transient split hangs on instanceof
    ...jest.requireActual<typeof OauthClientModule>('@libs/CloudflareOAuth/oauthClient'),
    buildAuthorizeURL: jest.fn(() => 'https://team.cloudflareaccess.com/cdn-cgi/access/oauth/authorization?mock=1'),
    exchangeCode: jest.fn(),
    refreshTokens: jest.fn(),
}));

jest.mock('@libs/CloudflareOAuth/pkce', () => ({
    __esModule: true,
    generatePKCEPair: jest.fn(),
    generateState: jest.fn(() => 'test-state'),
}));

jest.mock('expo-web-browser', () => ({
    __esModule: true,
    openAuthSessionAsync: jest.fn(),
    dismissAuthSession: jest.fn(),
}));

const SESSION_A: CloudflareSession = {accessToken: 'oauth:access-a', refreshToken: 'oauth:refresh-a', expiresAt: 1900000000000};
const SESSION_B: CloudflareSession = {accessToken: 'oauth:access-b', refreshToken: 'oauth:refresh-b', expiresAt: 1900000900000};

const PAIR_1: PKCEPair = {codeVerifier: 'verifier-1', codeChallenge: 'challenge-1'};
const PAIR_2: PKCEPair = {codeVerifier: 'verifier-2', codeChallenge: 'challenge-2'};

// The cancel result needs the real WebBrowserResultType enum value; requireActual targets the pure
// types module (no native deps) and bypasses the expo-web-browser mock factory above
const {WebBrowserResultType} = jest.requireActual<Pick<typeof ExpoWebBrowser, 'WebBrowserResultType'>>('expo-web-browser/build/WebBrowser.types');
const CANCEL_RESULT: ExpoWebBrowser.WebBrowserAuthSessionResult = {type: WebBrowserResultType.CANCEL};

function callbackURL(params: string): string {
    return `http://localhost/oauth/callback?${params}`;
}

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
let webBrowser: typeof ExpoWebBrowser;

beforeEach(() => {
    jest.resetModules();
    // The severed-opener watcher reads jsdom's real localStorage — drop breadcrumbs left by earlier tests
    window.localStorage.clear();
    Onyx = require<{default: typeof OnyxDefault}>('react-native-onyx').default;
    ONYXKEYS = require<typeof OnyxKeysModule>('@src/ONYXKEYS').default;
    Onyx.init({keys: ONYXKEYS});
    oauthClient = require<typeof OauthClientModule>('@libs/CloudflareOAuth/oauthClient');
    pkce = require<typeof PkceModule>('@libs/CloudflareOAuth/pkce');
    webBrowser = require<typeof ExpoWebBrowser>('expo-web-browser');
    SessionActions = require<typeof SessionActionsModule>('@userActions/CloudflareSession');
});

async function seedSession(session: CloudflareSession | null) {
    await Onyx.set(ONYXKEYS.CF_SESSION, session);
    await waitForBatchedUpdates();
}

/** Pre-warms the PKCE pair and waits for Onyx hydration, like the TestToolMenu mount effect does */
async function prepareWithPair(pair: PKCEPair) {
    jest.mocked(pkce.generatePKCEPair).mockResolvedValueOnce(pair);
    const prepared = SessionActions.prepareQAAuthFlow();
    await waitForBatchedUpdates();
    await prepared;
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

describe('startQAAuthFlow', () => {
    it('fails fast without opening a popup when the PKCE pair is not pre-warmed', async () => {
        jest.mocked(pkce.generatePKCEPair).mockRejectedValue(new Error('generation blocked'));

        await expect(SessionActions.startQAAuthFlow()).rejects.toThrow('PKCE pair is not pre-warmed');
        expect(webBrowser.openAuthSessionAsync).not.toHaveBeenCalled();
    });

    it('prepareQAAuthFlow is single-flight', async () => {
        const generationDeferred = createDeferred<PKCEPair>();
        jest.mocked(pkce.generatePKCEPair).mockReturnValue(generationDeferred.promise);

        const first = SessionActions.prepareQAAuthFlow();
        const second = SessionActions.prepareQAAuthFlow();
        await waitForBatchedUpdates();
        generationDeferred.resolve(PAIR_1);
        await Promise.all([first, second]);

        expect(pkce.generatePKCEPair).toHaveBeenCalledTimes(1);
    });

    it('resolves false on cancel without exchanging', async () => {
        await prepareWithPair(PAIR_1);
        jest.mocked(pkce.generatePKCEPair).mockResolvedValue(PAIR_2);
        jest.mocked(webBrowser.openAuthSessionAsync).mockResolvedValue(CANCEL_RESULT);

        await expect(SessionActions.startQAAuthFlow()).resolves.toBe(false);
        expect(oauthClient.exchangeCode).not.toHaveBeenCalled();
    });

    it('re-warms before settling, so an immediate retry is pre-warmed and generates nothing inline', async () => {
        // The default value only feeds the second flow's own settlement re-warm — the mock must keep
        // returning promises or the finally-path would reject on a mock artifact
        jest.mocked(pkce.generatePKCEPair).mockResolvedValueOnce(PAIR_1).mockResolvedValueOnce(PAIR_2).mockResolvedValue(PAIR_2);
        const prepared = SessionActions.prepareQAAuthFlow();
        await waitForBatchedUpdates();
        await prepared;
        jest.mocked(webBrowser.openAuthSessionAsync).mockResolvedValue(CANCEL_RESULT);

        await expect(SessionActions.startQAAuthFlow()).resolves.toBe(false);
        // The re-warm already ran as part of the flow's settlement
        expect(pkce.generatePKCEPair).toHaveBeenCalledTimes(2);

        const secondFlow = SessionActions.startQAAuthFlow();
        // The press itself consumed the re-warmed pair — no generation inside the click path
        expect(pkce.generatePKCEPair).toHaveBeenCalledTimes(2);
        expect(jest.mocked(oauthClient.buildAuthorizeURL)).toHaveBeenLastCalledWith({state: 'test-state', codeChallenge: PAIR_2.codeChallenge});
        await expect(secondFlow).resolves.toBe(false);
    });

    it('validates state first: a foreign callback is discarded wholesale, even with error and code present', async () => {
        await prepareWithPair(PAIR_1);
        jest.mocked(pkce.generatePKCEPair).mockResolvedValue(PAIR_2);
        jest.mocked(webBrowser.openAuthSessionAsync).mockResolvedValue({type: 'success', url: callbackURL('state=WRONG&error=access_denied&code=evil-code')});

        await expect(SessionActions.startQAAuthFlow()).rejects.toThrow('OAuth callback state mismatch');
        expect(oauthClient.exchangeCode).not.toHaveBeenCalled();
    });

    it('rejects with the OAuth error code when the provider refused, without exchanging', async () => {
        await prepareWithPair(PAIR_1);
        jest.mocked(pkce.generatePKCEPair).mockResolvedValue(PAIR_2);
        jest.mocked(webBrowser.openAuthSessionAsync).mockResolvedValue({type: 'success', url: callbackURL('state=test-state&error=access_denied')});

        await expect(SessionActions.startQAAuthFlow()).rejects.toMatchObject({code: 'access_denied'});
        expect(oauthClient.exchangeCode).not.toHaveBeenCalled();
    });

    it('rejects when the callback carries no code', async () => {
        await prepareWithPair(PAIR_1);
        jest.mocked(pkce.generatePKCEPair).mockResolvedValue(PAIR_2);
        jest.mocked(webBrowser.openAuthSessionAsync).mockResolvedValue({type: 'success', url: callbackURL('state=test-state')});

        await expect(SessionActions.startQAAuthFlow()).rejects.toThrow('missing the authorization code');
    });

    it('is single-flight: two presses share one popup and one result', async () => {
        await prepareWithPair(PAIR_1);
        jest.mocked(pkce.generatePKCEPair).mockResolvedValue(PAIR_2);
        const popupDeferred = createDeferred<ExpoWebBrowser.WebBrowserAuthSessionResult>();
        jest.mocked(webBrowser.openAuthSessionAsync).mockReturnValue(popupDeferred.promise);
        jest.mocked(oauthClient.exchangeCode).mockResolvedValue(SESSION_A);

        const first = SessionActions.startQAAuthFlow();
        const second = SessionActions.startQAAuthFlow();
        expect(second).toBe(first);
        expect(webBrowser.openAuthSessionAsync).toHaveBeenCalledTimes(1);

        popupDeferred.resolve({type: 'success', url: callbackURL('code=auth-code-1&state=test-state')});
        await expect(first).resolves.toBe(true);
        await expect(second).resolves.toBe(true);
        expect(oauthClient.exchangeCode).toHaveBeenCalledWith({code: 'auth-code-1', codeVerifier: PAIR_1.codeVerifier});
    });

    it('recovers via the localStorage breadcrumb when the popup completion message never arrives (severed opener)', async () => {
        await prepareWithPair(PAIR_1);
        jest.mocked(pkce.generatePKCEPair).mockResolvedValue(PAIR_2);
        // A severed window.opener leaves openAuthSessionAsync pending forever — the reproduced hang
        jest.mocked(webBrowser.openAuthSessionAsync).mockReturnValue(new Promise(() => {}));
        jest.mocked(oauthClient.exchangeCode).mockResolvedValue(SESSION_A);

        const flow = SessionActions.startQAAuthFlow();
        await waitForBatchedUpdates();
        // maybeCompleteAuthSession publishes the callback URL to localStorage before it touches the
        // opener; cross-window writes surface as storage events
        window.dispatchEvent(new StorageEvent('storage', {key: 'ExpoWebBrowser_OriginUrl_test-state', newValue: callbackURL('code=auth-code-1&state=test-state')}));

        await expect(flow).resolves.toBe(true);
        expect(oauthClient.exchangeCode).toHaveBeenCalledWith({code: 'auth-code-1', codeVerifier: PAIR_1.codeVerifier});
        // The dangling expo session must be dismissed: it closes the popup where the handle still
        // works and clears the localStorage handles either way
        expect(webBrowser.dismissAuthSession).toHaveBeenCalledTimes(1);
    });

    it('recovers via the poll when the breadcrumb was written before the watcher attached', async () => {
        // The storage event only fires for writes that happen after the listener exists — the poll is
        // the only channel for a breadcrumb that landed first. Real timers: this test costs one tick.
        window.localStorage.setItem('ExpoWebBrowser_OriginUrl_test-state', callbackURL('code=auth-code-1&state=test-state'));
        await prepareWithPair(PAIR_1);
        jest.mocked(pkce.generatePKCEPair).mockResolvedValue(PAIR_2);
        jest.mocked(webBrowser.openAuthSessionAsync).mockReturnValue(new Promise(() => {}));
        jest.mocked(oauthClient.exchangeCode).mockResolvedValue(SESSION_A);

        await expect(SessionActions.startQAAuthFlow()).resolves.toBe(true);
        expect(oauthClient.exchangeCode).toHaveBeenCalledWith({code: 'auth-code-1', codeVerifier: PAIR_1.codeVerifier});
    });

    it('caches the session before persistence but resolves only after Onyx.set completed', async () => {
        await prepareWithPair(PAIR_1);
        jest.mocked(pkce.generatePKCEPair).mockResolvedValue(PAIR_2);
        jest.mocked(webBrowser.openAuthSessionAsync).mockResolvedValue({type: 'success', url: callbackURL('code=auth-code-1&state=test-state')});
        jest.mocked(oauthClient.exchangeCode).mockResolvedValue(SESSION_A);
        const persistDeferred = createDeferred<void>();
        const setSpy = jest.spyOn(Onyx, 'set').mockReturnValue(persistDeferred.promise);

        const flow = SessionActions.startQAAuthFlow();
        let isSettled = false;
        flow.then(() => {
            isSettled = true;
            return undefined;
        });
        await waitForBatchedUpdates();

        expect(SessionActions.getCfSession()).toEqual(SESSION_A); // cache first, retries must see it
        expect(isSettled).toBe(false); // but the flow waits for the disk write

        persistDeferred.resolve();
        await expect(flow).resolves.toBe(true);
        expect(setSpy).toHaveBeenCalledWith(ONYXKEYS.CF_SESSION, SESSION_A);
        setSpy.mockRestore();
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
