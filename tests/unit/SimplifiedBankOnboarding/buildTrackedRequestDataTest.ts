import buildTrackedRequestData from '@pages/SimplifiedBankOnboarding/requests/buildTrackedRequestData';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import ONYXKEYS from '@src/ONYXKEYS';

const {PENDING, SUCCEEDED, FAILED} = SBO_CONST.REQUEST_STATUS;
const REQUEST_ID = '42';
const COMMAND = 'FinishCorpayBankAccountOnboarding';
const ERROR_TIME = 1;
const ERRORS = {[ERROR_TIME]: 'The request failed'};

describe('buildTrackedRequestData', () => {
    it('writes the state of the request under its ID in every phase', () => {
        // Given a request that a step sent with its own ID
        // When the action builds its Onyx data
        const {optimisticData, successData, failureData} = buildTrackedRequestData({requestID: REQUEST_ID, command: COMMAND, errors: ERRORS});

        // Then the request moves from pending to succeeded or failed under that ID only
        expect(optimisticData).toContainEqual(
            expect.objectContaining({key: ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, value: {[REQUEST_ID]: {command: COMMAND, status: PENDING}}}),
        );
        expect(successData).toContainEqual(expect.objectContaining({key: ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, value: {[REQUEST_ID]: {status: SUCCEEDED}}}));
        expect(failureData).toContainEqual(expect.objectContaining({key: ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, value: {[REQUEST_ID]: {status: FAILED, errors: ERRORS}}}));
    });

    it('keeps the errors on the account for the screens outside the flow', () => {
        // Given the landing page and the entry point, which still read the errors of the account
        // When a request is sent and then fails
        const {optimisticData, failureData} = buildTrackedRequestData({requestID: REQUEST_ID, command: COMMAND, errors: ERRORS});

        // Then the account loses the old error when the request starts and gets the new one when it fails
        expect(optimisticData).toContainEqual(expect.objectContaining({key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {errors: null}}));
        expect(failureData).toContainEqual(expect.objectContaining({key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {errors: ERRORS}}));
    });
});
