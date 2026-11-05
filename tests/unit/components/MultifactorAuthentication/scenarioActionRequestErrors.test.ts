import {makeRequestWithSideEffects} from '@libs/API';
import HttpsError from '@libs/Errors/HttpsError';

import {authorizeTransaction, changePINForCard, troubleshootMultifactorAuthentication} from '@userActions/MultifactorAuthentication';

import CONST from '@src/CONST';

import {MFA_TEST_AUTH_METHOD, MFA_TEST_SIGNED_CHALLENGE} from 'tests/utils/mfa/flowFixtures';

jest.mock('@libs/API');

const REASON = CONST.MULTIFACTOR_AUTHENTICATION.REASON;
const SIGNED = {signedChallenge: MFA_TEST_SIGNED_CHALLENGE, authenticationMethod: MFA_TEST_AUTH_METHOD.marqetaValue};

// One scenario action per kind of response map, since they all share the same request error handling.
const SCENARIO_ACTIONS = [
    {name: 'authorizeTransaction', run: () => authorizeTransaction({...SIGNED, transactionID: 'txn-1'})},
    {name: 'troubleshootMultifactorAuthentication', run: () => troubleshootMultifactorAuthentication(SIGNED)},
    {name: 'changePINForCard', run: () => changePINForCard({...SIGNED, cardID: '1', pin: '1234'})},
];

describe('MFA scenario action request errors', () => {
    it.each(SCENARIO_ACTIONS)('$name reports a lost answer when the connection drops', async ({run}) => {
        // Given the request gets no answer
        jest.mocked(makeRequestWithSideEffects).mockRejectedValueOnce(new TypeError(CONST.ERROR.FAILED_TO_FETCH));

        // When the scenario action runs
        const result = await run();

        // Then the machine can tell the answer was lost and re-send it
        expect(result.reason).toBe(REASON.LOCAL_ERRORS.NO_RESPONSE);
    });

    it.each(SCENARIO_ACTIONS)('$name keeps the status of an HTTP error, which is an answer', async ({run}) => {
        // Given the server answers with a 500
        jest.mocked(makeRequestWithSideEffects).mockRejectedValueOnce(
            new HttpsError({message: CONST.ERROR.EXPENSIFY_SERVICE_INTERRUPTED, status: String(CONST.HTTP_STATUS.INTERNAL_SERVER_ERROR), title: 'Issue connecting to Expensify site'}),
        );

        // When the scenario action runs
        const result = await run();

        // Then it isn't re-sent, because the signature already used the challenge, and it stays a server error
        expect(result.httpStatusCode).toBe(CONST.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(result.reason).toBe(REASON.SERVER_ERRORS.UNRECOGNIZED);
    });

    it.each(SCENARIO_ACTIONS)('$name reports a used challenge when the server refuses it', async ({run}) => {
        // Given the server no longer knows the signed challenge, e.g. because an earlier copy of the request used it
        jest.mocked(makeRequestWithSideEffects).mockResolvedValueOnce({jsonCode: 401, message: '401 Authentication required'});

        // When the scenario action runs
        const result = await run();

        // Then the machine can tell a re-sent request was refused because the first copy reached the server
        expect(result.reason).toBe(REASON.CLIENT_ERRORS.AUTHENTICATION_REQUIRED);
    });
});
