import {authorizeTransaction, changePINForCard, troubleshootMultifactorAuthentication} from '@userActions/MultifactorAuthentication';

import CONST from '@src/CONST';

import {MFA_TEST_AUTH_METHOD, MFA_TEST_SIGNED_CHALLENGE} from 'tests/utils/mfa/flowFixtures';
import * as TestHelper from 'tests/utils/TestHelper';
import waitForBatchedUpdates from 'tests/utils/waitForBatchedUpdates';

const REASON = CONST.MULTIFACTOR_AUTHENTICATION.REASON;
const SIGNED = {signedChallenge: MFA_TEST_SIGNED_CHALLENGE, authenticationMethod: MFA_TEST_AUTH_METHOD.marqetaValue};

// One scenario action per kind of response map, since they all share the same response handling.
const SCENARIO_ACTIONS = [
    {name: 'authorizeTransaction', run: () => authorizeTransaction({...SIGNED, transactionID: 'txn-1'})},
    {name: 'troubleshootMultifactorAuthentication', run: () => troubleshootMultifactorAuthentication(SIGNED)},
    {name: 'changePINForCard', run: () => changePINForCard({...SIGNED, cardID: '1', pin: '1234'})},
];

// `@libs/API` isn't mocked here: a failed request never rejects out of the real API middlewares, so a mock that
// rejects would test a path the app can't take.
describe('MFA scenario action request errors', () => {
    beforeAll(async () => {
        global.fetch = TestHelper.getGlobalFetchMock();
        await TestHelper.signInWithTestUser();
        await waitForBatchedUpdates();
    });

    afterEach(() => {
        global.fetch = TestHelper.getGlobalFetchMock();
    });

    describe.each(SCENARIO_ACTIONS)('$name', ({run}) => {
        it.each([
            {description: 'the connection drops', mockFetch: () => jest.fn().mockRejectedValue(new TypeError(CONST.ERROR.FAILED_TO_FETCH))},
            {description: 'the server answers with an HTTP 500', mockFetch: () => jest.fn().mockResolvedValue({ok: false, status: CONST.HTTP_STATUS.INTERNAL_SERVER_ERROR})},
        ])('reports a lost answer when $description', async ({mockFetch}) => {
            // Given the request gets no answer the app can read
            global.fetch = mockFetch();

            // When the scenario action runs
            const result = await run();

            // Then the machine can tell the answer was lost and re-send it
            expect(result.reason).toBe(REASON.LOCAL_ERRORS.NO_RESPONSE);
            expect(result.httpStatusCode).toBe(0);
        });

        it('reports a used challenge when the server refuses it', async () => {
            // Given the server no longer knows the signed challenge, e.g. because an earlier copy of the request used it
            global.fetch = jest.fn().mockResolvedValue({ok: true, json: () => Promise.resolve({jsonCode: 401, message: '401 Authentication required'})});

            // When the scenario action runs
            const result = await run();

            // Then the machine can tell a re-sent request was refused because the first copy reached the server
            expect(result.httpStatusCode).toBe(401);
            expect(result.reason).toBe(REASON.CLIENT_ERRORS.AUTHENTICATION_REQUIRED);
        });
    });
});
