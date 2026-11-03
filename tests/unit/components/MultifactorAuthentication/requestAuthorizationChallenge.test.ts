import {makeRequestWithSideEffects} from '@libs/API';
import HttpsError from '@libs/Errors/HttpsError';

import {requestAuthorizationChallenge} from '@userActions/MultifactorAuthentication';

import CONST from '@src/CONST';

jest.mock('@libs/API');

const REASON = CONST.MULTIFACTOR_AUTHENTICATION.REASON;

describe('requestAuthorizationChallenge', () => {
    it.each([
        {description: 'fetch fails on web', error: new TypeError(CONST.ERROR.FAILED_TO_FETCH)},
        {description: 'fetch fails on Safari', error: new TypeError(CONST.ERROR.IOS_LOAD_FAILED)},
        {description: 'fetch fails on native', error: new TypeError(CONST.ERROR.NETWORK_REQUEST_FAILED)},
        {description: 'the iOS connection drops', error: new Error(CONST.ERROR.IOS_NETWORK_CONNECTION_LOST)},
        {
            description: 'Web-Expensify gives up waiting for Auth',
            error: new HttpsError({message: CONST.ERROR.EXPENSIFY_SERVICE_INTERRUPTED, status: String(CONST.JSON_CODE.EXP_ERROR), title: CONST.ERROR_TITLE.SOCKET}),
        },
    ])('reports a lost answer when $description', async ({error}) => {
        // Given the request gets no answer
        jest.mocked(makeRequestWithSideEffects).mockRejectedValueOnce(error);

        // When the challenge is requested
        const result = await requestAuthorizationChallenge();

        // Then the machine can tell the answer was lost and ask again
        expect(result.reason).toBe(REASON.LOCAL_ERRORS.NO_RESPONSE);
        expect(result.challenge).toBeUndefined();
    });

    it('keeps the status of an HTTP error, which is an answer', async () => {
        // Given the server answers with a 500
        jest.mocked(makeRequestWithSideEffects).mockRejectedValueOnce(
            new HttpsError({message: CONST.ERROR.EXPENSIFY_SERVICE_INTERRUPTED, status: String(CONST.HTTP_STATUS.INTERNAL_SERVER_ERROR), title: 'Issue connecting to Expensify site'}),
        );

        // When the challenge is requested
        const result = await requestAuthorizationChallenge();

        // Then it isn't treated as lost, so the machine doesn't ask again, and the failure stays a server error
        expect(result.httpStatusCode).toBe(CONST.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(result.reason).toBe(REASON.SERVER_ERRORS.UNRECOGNIZED);
    });

    it('reports an unhandled response for an unexpected exception', async () => {
        // Given the request throws something other than a dropped connection or an HTTP error
        jest.mocked(makeRequestWithSideEffects).mockRejectedValueOnce(new Error('Unexpected'));

        // When the challenge is requested
        const result = await requestAuthorizationChallenge();

        // Then it isn't treated as lost either
        expect(result.reason).toBe(REASON.LOCAL_ERRORS.UNHANDLED_API_RESPONSE);
    });
});
