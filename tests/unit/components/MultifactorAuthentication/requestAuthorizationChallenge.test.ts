import {requestAuthorizationChallenge} from '@userActions/MultifactorAuthentication';

import CONST from '@src/CONST';

import {MFA_TEST_AUTHENTICATION_CHALLENGE} from 'tests/utils/mfa/flowFixtures';
import * as TestHelper from 'tests/utils/TestHelper';
import waitForBatchedUpdates from 'tests/utils/waitForBatchedUpdates';

const REASON = CONST.MULTIFACTOR_AUTHENTICATION.REASON;

function mockFetchAnswer(json: Record<string, unknown>) {
    global.fetch = jest.fn().mockResolvedValue({ok: true, json: () => Promise.resolve(json)});
}

// `@libs/API` isn't mocked here: a failed request never rejects out of the real API middlewares, so a mock that
// rejects would test a path the app can't take.
describe('requestAuthorizationChallenge', () => {
    beforeAll(async () => {
        global.fetch = TestHelper.getGlobalFetchMock();
        await TestHelper.signInWithTestUser();
        await waitForBatchedUpdates();
    });

    afterEach(() => {
        global.fetch = TestHelper.getGlobalFetchMock();
    });

    it.each([
        {description: 'fetch fails', mockFetch: () => jest.fn().mockRejectedValue(new TypeError(CONST.ERROR.FAILED_TO_FETCH))},
        {description: 'fetch fails with a message the app does not know', mockFetch: () => jest.fn().mockRejectedValue(new Error('Cronet failed: net::ERR_INTERNET_DISCONNECTED'))},
        {description: 'the server answers with an HTTP 500', mockFetch: () => jest.fn().mockResolvedValue({ok: false, status: CONST.HTTP_STATUS.INTERNAL_SERVER_ERROR})},
        {description: 'the server throttles the request', mockFetch: () => jest.fn().mockResolvedValue({ok: false, status: CONST.HTTP_STATUS.TOO_MANY_REQUESTS})},
        {description: 'the server answers with another HTTP error', mockFetch: () => jest.fn().mockResolvedValue({ok: false, status: 404, statusText: 'Not Found'})},
        {description: 'the answer cannot be parsed', mockFetch: () => jest.fn().mockResolvedValue({ok: true, json: () => Promise.reject(new SyntaxError('Unexpected token'))})},
        {
            description: 'Web-Expensify gives up waiting for Auth',
            mockFetch: () =>
                jest.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve({jsonCode: CONST.JSON_CODE.EXP_ERROR, title: CONST.ERROR_TITLE.SOCKET, type: CONST.ERROR_TYPE.SOCKET}),
                }),
        },
    ])('reports a lost answer when $description', async ({mockFetch}) => {
        // Given the request gets no answer the app can read
        global.fetch = mockFetch();

        // When the challenge is requested
        const result = await requestAuthorizationChallenge();

        // Then the machine can tell the answer was lost and ask again
        expect(result.reason).toBe(REASON.LOCAL_ERRORS.NO_RESPONSE);
        expect(result.httpStatusCode).toBe(0);
        expect(result.challenge).toBeUndefined();
    });

    it('keeps the reason of an error the server answered with', async () => {
        // Given the server answers the request with an error
        mockFetchAnswer({jsonCode: 401, message: CONST.MULTIFACTOR_AUTHENTICATION.BACKEND_MESSAGE.REGISTRATION_REQUIRED});

        // When the challenge is requested
        const result = await requestAuthorizationChallenge();

        // Then it isn't treated as lost, so the machine doesn't ask again
        expect(result.httpStatusCode).toBe(401);
        expect(result.reason).toBe(REASON.CLIENT_ERRORS.REGISTRATION_REQUIRED);
        expect(result.challenge).toBeUndefined();
    });

    it('returns the challenge the server answered with', async () => {
        // Given the server answers with a challenge
        mockFetchAnswer({jsonCode: 200, challenge: MFA_TEST_AUTHENTICATION_CHALLENGE, publicKeys: []});

        // When the challenge is requested
        const result = await requestAuthorizationChallenge();

        // Then the action passes it on
        expect(result.httpStatusCode).toBe(200);
        expect(result.challenge).toEqual(MFA_TEST_AUTHENTICATION_CHALLENGE);
    });
});
