import {getCfSession, markCfSessionRejected, refreshCfSession} from '@libs/actions/CloudflareSession';
import {alertUser} from '@libs/actions/UpdateRequired';
import {WRITE_COMMANDS} from '@libs/API/types';
import {isQAServerRequest} from '@libs/CloudflareOAuth/config';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

import HttpUtils from '../../src/libs/HttpUtils';

// The QA auth boundary is tested against mocks of the session action — the single-flight/persistence
// invariants live in CloudflareSessionTest; duplicating them here would only test the mock
jest.mock('@libs/actions/CloudflareSession', () => ({
    __esModule: true,
    getCfSession: jest.fn(),
    markCfSessionRejected: jest.fn(),
    refreshCfSession: jest.fn(),
}));

jest.mock('@libs/CloudflareOAuth/config', () => ({
    __esModule: true,
    isQAServerRequest: jest.fn(() => false),
}));

jest.mock('@libs/actions/UpdateRequired', () => ({
    __esModule: true,
    alertUser: jest.fn(),
}));

function mockFetchResponse(message: string) {
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {get: () => null},
        json: () => Promise.resolve({jsonCode: CONST.JSON_CODE.EXP_ERROR, message}),
    });
}

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
        mockFetchResponse(message);

        await expect(HttpUtils.xhr(command, {})).rejects.toMatchObject({
            message: CONST.ERROR.ALREADY_CREATED,
            title: message,
        });
    });

    it('leaves a jsonCode-666 response with an unrecognized message untouched', async () => {
        mockFetchResponse('Some other error');

        await expect(HttpUtils.xhr(WRITE_COMMANDS.PAY_MONEY_REQUEST, {})).resolves.toMatchObject({jsonCode: CONST.JSON_CODE.EXP_ERROR, message: 'Some other error'});
    });
});

describe('HttpUtils QA server auth (Cloudflare POC)', () => {
    const QA_API_ROOT = 'https://qa.example.com/';
    const QA_URL = `${QA_API_ROOT}api/CloudflareAuthProbe`;
    const SESSION_A = {accessToken: 'oauth:access-a', refreshToken: 'oauth:refresh-a', expiresAt: 1900000000000};
    const SESSION_B = {accessToken: 'oauth:access-b', refreshToken: 'oauth:refresh-b', expiresAt: 1900000900000};

    function jsonResponse(status: number, body: Record<string, unknown>, statusText = '') {
        return {
            ok: status >= 200 && status < 300,
            status,
            statusText,
            headers: {get: () => null},
            json: () => Promise.resolve(body),
        };
    }

    type CapturedRequest = {url: string; init: RequestInit};

    /** Scripted responses with typed argument capture, so assertions never touch `mock.calls` (any-typed) */
    function mockFetchSequence(...responses: Array<ReturnType<typeof jsonResponse>>) {
        const captured: CapturedRequest[] = [];
        const fetchMock = jest.fn().mockImplementation((url: string, init: RequestInit) => {
            captured.push({url, init});
            return Promise.resolve(responses.at(Math.min(captured.length, responses.length) - 1));
        });
        global.fetch = fetchMock;
        return {fetchMock, captured};
    }

    beforeEach(() => {
        // The factory mocks live for the whole file — drop call history accumulated by earlier tests
        jest.clearAllMocks();
        jest.mocked(isQAServerRequest).mockImplementation((url: string) => url.startsWith(QA_API_ROOT));
        jest.mocked(getCfSession).mockReturnValue(SESSION_A);
        jest.mocked(refreshCfSession).mockResolvedValue('refreshed');
        jest.mocked(markCfSessionRejected).mockResolvedValue(undefined);
    });

    it('attaches the bearer header on QA requests, keeps credentials omitted', async () => {
        const {captured} = mockFetchSequence(jsonResponse(200, {jsonCode: 200}));

        await HttpUtils.processHTTPRequest(QA_URL, 'post');

        expect(captured.at(0)?.init.headers).toEqual({Authorization: `Bearer ${SESSION_A.accessToken}`});
        expect(captured.at(0)?.init.credentials).toBe('omit');
    });

    it('sends no auth header on non-QA requests, keeps credentials omitted', async () => {
        const {captured} = mockFetchSequence(jsonResponse(200, {jsonCode: 200}));

        await HttpUtils.processHTTPRequest('https://www.expensify.com/api/OpenApp', 'post');

        expect(captured.at(0)?.init.headers).toBeUndefined();
        expect(captured.at(0)?.init.credentials).toBe('omit');
    });

    it('on a QA 401: refreshes once with the used token and retries once with the rotated token', async () => {
        jest.mocked(getCfSession).mockReturnValueOnce(SESSION_A).mockReturnValue(SESSION_B);
        const {fetchMock, captured} = mockFetchSequence(jsonResponse(401, {}), jsonResponse(200, {jsonCode: 200}));

        await expect(HttpUtils.processHTTPRequest(QA_URL, 'post')).resolves.toMatchObject({jsonCode: 200});

        expect(refreshCfSession).toHaveBeenCalledTimes(1);
        expect(refreshCfSession).toHaveBeenCalledWith(SESSION_A.accessToken);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(captured.at(1)?.init.headers).toEqual({Authorization: `Bearer ${SESSION_B.accessToken}`});
    });

    it('surfaces the re-auth error without retrying when the refresh outcome is terminal', async () => {
        jest.mocked(refreshCfSession).mockResolvedValue('reauth-required');
        const {fetchMock} = mockFetchSequence(jsonResponse(401, {}));

        await expect(HttpUtils.processHTTPRequest(QA_URL, 'post')).rejects.toMatchObject({message: CONST.ERROR.CF_REAUTH_REQUIRED});

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(markCfSessionRejected).not.toHaveBeenCalled();
    });

    it('propagates a transient refresh failure as-is — the session is still alive', async () => {
        const transientError = new TypeError('Failed to fetch');
        jest.mocked(refreshCfSession).mockRejectedValue(transientError);
        const {fetchMock} = mockFetchSequence(jsonResponse(401, {}));

        await expect(HttpUtils.processHTTPRequest(QA_URL, 'post')).rejects.toBe(transientError);

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('on a second 401: drops the rejected session and surfaces the re-auth error', async () => {
        jest.mocked(getCfSession).mockReturnValueOnce(SESSION_A).mockReturnValue(SESSION_B);
        const {fetchMock} = mockFetchSequence(jsonResponse(401, {}), jsonResponse(401, {}));

        await expect(HttpUtils.processHTTPRequest(QA_URL, 'post')).rejects.toMatchObject({message: CONST.ERROR.CF_REAUTH_REQUIRED});

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(refreshCfSession).toHaveBeenCalledTimes(1);
        expect(markCfSessionRejected).toHaveBeenCalledTimes(1);
        expect(markCfSessionRejected).toHaveBeenCalledWith(SESSION_B.accessToken);
    });

    it('runs response side effects exactly once when a retried request lands', async () => {
        // The retried response flows through processJSONResponse inside the recursion only —
        // a double alertUser() here would mean the hoisted helper leaked back into the outer chain
        mockFetchSequence(jsonResponse(401, {}), jsonResponse(200, {jsonCode: CONST.JSON_CODE.UPDATE_REQUIRED}));

        await expect(HttpUtils.processHTTPRequest(QA_URL, 'post')).resolves.toMatchObject({jsonCode: CONST.JSON_CODE.UPDATE_REQUIRED});

        expect(alertUser).toHaveBeenCalledTimes(1);
    });

    it('leaves non-QA 401s on the generic error path without touching the session', async () => {
        mockFetchSequence(jsonResponse(401, {}, 'Unauthorized'));

        await expect(HttpUtils.processHTTPRequest('https://www.expensify.com/api/OpenApp', 'post')).rejects.toMatchObject({status: '401', message: 'Unauthorized'});

        expect(refreshCfSession).not.toHaveBeenCalled();
    });
});
