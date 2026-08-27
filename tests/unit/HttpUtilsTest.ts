import {WRITE_COMMANDS} from '@libs/API/types';
import {handleQAUnauthorized, prepareQARequestAuth} from '@libs/CloudflareAccess/QARequestAuth';
import {isRecord} from '@libs/ObjectUtils';
import registerPrefetchOnAppStart from '@libs/Prefetch/registerPrefetchOnAppStart';
import markAppStartupNetworkRequestEnd from '@libs/telemetry/markAppStartupNetworkRequestEnd';

import type * as NetworkActions from '@userActions/Network';
import {setTimeSkew} from '@userActions/Network';
import type * as UpdateRequiredActions from '@userActions/UpdateRequired';
import {alertUser} from '@userActions/UpdateRequired';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

import HttpUtils from '../../src/libs/HttpUtils';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

// The QA token policy itself is QARequestAuthTest's subject.
jest.mock('@libs/CloudflareAccess/QARequestAuth', () => ({
    prepareQARequestAuth: jest.fn(() => Promise.resolve(undefined)),
    handleQAUnauthorized: jest.fn(),
}));
// Only the QA origin classification matters here; the real module reads CONFIG, which this test does not mock
jest.mock('@libs/CloudflareAccess/Config', () => ({isQAServerRequest: (url: string) => url.startsWith('https://qa.exops.io')}));
jest.mock('@userActions/Network', () => ({...jest.requireActual<typeof NetworkActions>('@userActions/Network'), setTimeSkew: jest.fn()}));
jest.mock('@userActions/UpdateRequired', () => ({
    ...jest.requireActual<typeof UpdateRequiredActions>('@userActions/UpdateRequired'),
    alertUser: jest.fn(),
}));
jest.mock('@libs/telemetry/markAppStartupNetworkRequestEnd', () => ({__esModule: true, default: jest.fn()}));
jest.mock('@libs/Prefetch/registerPrefetchOnAppStart', () => ({__esModule: true, default: jest.fn()}));

/** The init argument of the nth fetch call. Read through a guard: the mock's recorded args are loosely typed */
function fetchInit(callIndex: number): Record<string, unknown> {
    const init: unknown = jest.mocked(global.fetch).mock.calls.at(callIndex)?.[1];
    return isRecord(init) ? init : {};
}

/** Headers of the nth fetch call — always the plain object HttpUtils builds, never a Headers instance */
function fetchHeaders(callIndex: number): Record<string, unknown> {
    const {headers} = fetchInit(callIndex);
    return isRecord(headers) ? headers : {};
}

/** One queued mock response per fetch call, in order. */
function mockFetchSequence(responses: Array<{status: number; body?: unknown; dateHeader?: string}>) {
    const fetchMock = jest.fn();
    for (const {status, body, dateHeader} of responses) {
        fetchMock.mockResolvedValueOnce({
            ok: status >= 200 && status < 300,
            status,
            statusText: `HTTP ${status}`,
            headers: {get: (name: string) => (name === 'Date' ? (dateHeader ?? null) : null)},
            json: () => Promise.resolve(body ?? {}),
        });
    }
    global.fetch = fetchMock;
}

const OK = {status: 200, body: {jsonCode: CONST.JSON_CODE.SUCCESS}};
const UNAUTHORIZED = {status: CONST.HTTP_STATUS.UNAUTHORIZED};

beforeAll(() => {
    Onyx.init({
        keys: ONYXKEYS,
    });
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('HttpUtils', () => {
    // The mapping is keyed on the server message alone, not the command. The messages are
    // pinned as literals so a change to the CONST values can't silently drift from what the
    // server really sends.
    it.each([
        ['Transaction already created.', WRITE_COMMANDS.REQUEST_MONEY],
        ['The request has already been paid', WRITE_COMMANDS.PAY_MONEY_REQUEST],
    ])('maps the jsonCode-666 rejection "%s" to ALREADY_CREATED', async (message, command) => {
        mockFetchSequence([{status: 200, body: {jsonCode: CONST.JSON_CODE.EXP_ERROR, message}}]);

        await expect(HttpUtils.xhr(command, {})).rejects.toMatchObject({
            message: CONST.ERROR.ALREADY_CREATED,
            title: message,
        });
    });

    it('leaves a jsonCode-666 response with an unrecognized message untouched', async () => {
        mockFetchSequence([{status: 200, body: {jsonCode: CONST.JSON_CODE.EXP_ERROR, message: 'Some other error'}}]);

        await expect(HttpUtils.xhr(WRITE_COMMANDS.PAY_MONEY_REQUEST, {})).resolves.toMatchObject({jsonCode: CONST.JSON_CODE.EXP_ERROR, message: 'Some other error'});
    });
});

describe('HttpUtils QA bearer', () => {
    const COMMAND = WRITE_COMMANDS.OPEN_APP;
    const QA_URL = `https://qa.exops.io/api/${COMMAND}`;
    const PROD_URL = `https://www.expensify.com/api/${COMMAND}`;
    const AUTH = {accessToken: 'oauth:abc', headers: {Authorization: 'Bearer oauth:abc'}};
    const ROTATED_AUTH = {accessToken: 'oauth:new', headers: {Authorization: 'Bearer oauth:new'}};

    beforeEach(() => {
        jest.clearAllMocks();
        // Re-stated per test rather than left to the module factory: clearAllMocks keeps implementations, so
        // the ordering test below would otherwise leave its never-settling promise in place for the rest
        jest.mocked(prepareQARequestAuth).mockResolvedValue(AUTH);
    });

    it('attaches the prepared bearer on the QA origin', async () => {
        mockFetchSequence([OK]);
        await HttpUtils.processHTTPRequest(QA_URL, 'post');

        expect(fetchHeaders(0).Authorization).toBe(AUTH.headers.Authorization);
        expect(fetchInit(0).credentials).toBe('omit');
    });

    it('never prepares a credential, nor attaches one, for a non-QA origin', async () => {
        mockFetchSequence([OK]);
        await HttpUtils.processHTTPRequest(PROD_URL, 'post');

        expect(prepareQARequestAuth).not.toHaveBeenCalled();
        expect(fetchHeaders(0).Authorization).toBeUndefined();
        expect(fetchInit(0).credentials).toBe('omit');
    });

    it('sends a bearer-less QA request when there is no session to prepare one from', async () => {
        jest.mocked(prepareQARequestAuth).mockResolvedValue(undefined);
        mockFetchSequence([OK]);

        await HttpUtils.processHTTPRequest(QA_URL, 'post');
        expect(fetchHeaders(0).Authorization).toBeUndefined();
    });

    it('sends nothing until the prepared credential resolves', async () => {
        let releaseGate!: (auth: typeof AUTH) => void;
        jest.mocked(prepareQARequestAuth).mockReturnValue(
            new Promise((resolve) => {
                releaseGate = resolve;
            }),
        );
        mockFetchSequence([OK]);

        const request = HttpUtils.processHTTPRequest(QA_URL, 'post');
        await waitForBatchedUpdates();
        expect(global.fetch).not.toHaveBeenCalled();

        releaseGate(AUTH);
        await request;
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('never sends the request when preparing the credential is terminal', async () => {
        jest.mocked(prepareQARequestAuth).mockRejectedValue(new Error(CONST.ERROR.CF_REAUTH_REQUIRED));
        mockFetchSequence([]);

        await expect(HttpUtils.processHTTPRequest(QA_URL, 'post')).rejects.toThrow(CONST.ERROR.CF_REAUTH_REQUIRED);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('hands a QA 401 to the seam and retries once with the credential it returns', async () => {
        jest.mocked(handleQAUnauthorized).mockResolvedValue(ROTATED_AUTH);
        mockFetchSequence([UNAUTHORIZED, OK]);

        await HttpUtils.processHTTPRequest(QA_URL, 'post');

        expect(handleQAUnauthorized).toHaveBeenCalledTimes(1);
        expect(handleQAUnauthorized).toHaveBeenCalledWith(AUTH, {isRetry: false, command: COMMAND});
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(fetchHeaders(1).Authorization).toBe(ROTATED_AUTH.headers.Authorization);
    });

    it('tells the seam the second 401 came from the retry, and does not prepare a third attempt', async () => {
        jest.mocked(handleQAUnauthorized).mockResolvedValueOnce(ROTATED_AUTH).mockRejectedValueOnce(new Error(CONST.ERROR.CF_REAUTH_REQUIRED));
        mockFetchSequence([UNAUTHORIZED, UNAUTHORIZED]);

        await expect(HttpUtils.processHTTPRequest(QA_URL, 'post')).rejects.toThrow(CONST.ERROR.CF_REAUTH_REQUIRED);

        expect(handleQAUnauthorized).toHaveBeenNthCalledWith(2, ROTATED_AUTH, {isRetry: true, command: COMMAND});
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(prepareQARequestAuth).toHaveBeenCalledTimes(1);
    });

    it('leaves a non-QA 401 on the existing error path', async () => {
        mockFetchSequence([UNAUTHORIZED]);

        await expect(HttpUtils.processHTTPRequest(PROD_URL, 'post')).rejects.toThrow();
        expect(handleQAUnauthorized).not.toHaveBeenCalled();
    });

    it('leaves a QA 401 alone when the request carried no bearer', async () => {
        jest.mocked(prepareQARequestAuth).mockResolvedValue(undefined);
        mockFetchSequence([UNAUTHORIZED]);

        await expect(HttpUtils.processHTTPRequest(QA_URL, 'post')).rejects.toThrow();
        expect(handleQAUnauthorized).not.toHaveBeenCalled();
    });

    // The prefetch template is replayed verbatim on a later app start, so capturing one that carries a
    // short-lived bearer would replay a dead credential
    it('never registers a bearer-carrying request as a startup prefetch template', async () => {
        mockFetchSequence([OK]);
        await HttpUtils.processHTTPRequest(QA_URL, 'post');
        expect(registerPrefetchOnAppStart).not.toHaveBeenCalled();

        jest.mocked(prepareQARequestAuth).mockResolvedValue(undefined);
        mockFetchSequence([OK]);
        await HttpUtils.processHTTPRequest(PROD_URL, 'post');
        expect(registerPrefetchOnAppStart).toHaveBeenCalledTimes(1);
    });

    // Pins the `startTime` placement. `OPEN_APP` is in addSkewList, so the skew maths runs; the Date header is
    // the post-preparation clock, so a correct implementation reports ~0. Capturing startTime at the top of
    // attemptRequest() instead would report ~5000ms and silently shift the app-wide clock offset.
    it('does not count the credential round trip as request latency', async () => {
        jest.useFakeTimers();
        const t0 = new Date('2026-01-01T00:00:00.000Z').valueOf();
        jest.setSystemTime(t0);

        jest.mocked(prepareQARequestAuth).mockImplementation(() => {
            jest.advanceTimersByTime(5_000);
            return Promise.resolve(AUTH);
        });
        mockFetchSequence([{...OK, dateHeader: new Date(t0 + 5_000).toUTCString()}]);

        await HttpUtils.processHTTPRequest(QA_URL, 'post');

        expect(setTimeSkew).toHaveBeenCalledTimes(1);
        const [skew] = jest.mocked(setTimeSkew).mock.calls.at(0) ?? [Number.NaN];
        expect(Math.abs(skew)).toBeLessThan(1_000);

        jest.useRealTimers();
    });

    // The reason attemptRequest()/processJSONResponse are separated: the parsed-response stage fires
    // alerts, so a retried response passing through it twice would double every one of them
    it('fires alertUser exactly once across a refresh and retry', async () => {
        jest.mocked(handleQAUnauthorized).mockResolvedValue(ROTATED_AUTH);
        mockFetchSequence([UNAUTHORIZED, {status: 200, body: {jsonCode: CONST.JSON_CODE.UPDATE_REQUIRED}}]);

        await HttpUtils.processHTTPRequest(QA_URL, 'post').catch(() => undefined);
        expect(alertUser).toHaveBeenCalledTimes(1);
    });

    // The sibling once-per-request stage. It lives in a .finally rather than the third .then, so a retry
    // attached to attemptRequest() fires it twice.
    it('ends the startup-network-request span exactly once across a refresh and retry', async () => {
        jest.mocked(handleQAUnauthorized).mockResolvedValue(ROTATED_AUTH);
        mockFetchSequence([UNAUTHORIZED, OK]);

        await HttpUtils.processHTTPRequest(QA_URL, 'post');

        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(markAppStartupNetworkRequestEnd).toHaveBeenCalledTimes(1);
    });
});
