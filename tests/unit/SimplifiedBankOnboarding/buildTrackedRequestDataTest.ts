import buildTrackedRequestData, {buildTrackedReadData} from '@pages/SimplifiedBankOnboarding/requests/buildTrackedRequestData';
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

    it('removes the saved fields of the step from the draft only when the request succeeds', () => {
        // Given a confirmed request of the personal info step
        // When the action builds its Onyx data with the fields of the step
        const {optimisticData, successData, failureData} = buildTrackedRequestData({requestID: REQUEST_ID, command: COMMAND, errors: ERRORS, draftFieldsToClear: ['firstName', 'lastName']});

        // Then the server becomes the only source after a success, and a failure keeps the edits of the user
        expect(successData).toContainEqual(expect.objectContaining({key: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, value: {firstName: null, lastName: null}}));
        expect([...optimisticData, ...failureData]).not.toContainEqual(expect.objectContaining({key: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT}));
    });

    it('leaves the draft alone when the request saves no fields', () => {
        // Given a background save or a request that sends no input of the draft
        // When the action builds its Onyx data without fields
        const {successData} = buildTrackedRequestData({requestID: REQUEST_ID, command: COMMAND, errors: ERRORS});

        // Then the success data does not touch the draft
        expect(successData).not.toContainEqual(expect.objectContaining({key: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT}));
    });
});

describe('buildTrackedReadData', () => {
    it('writes only the status entry of the read', () => {
        // Given the read of an entry or flow page, whose response replaces the account data
        // When the action builds its Onyx data
        const {optimisticData, successData, failureData} = buildTrackedReadData(REQUEST_ID, COMMAND, ERRORS);

        // Then the page can follow its own read, and nothing else is written, so the read keeps the account and the draft
        expect(optimisticData).toEqual([expect.objectContaining({key: ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, value: {[REQUEST_ID]: {command: COMMAND, status: PENDING}}})]);
        expect(successData).toEqual([expect.objectContaining({key: ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, value: {[REQUEST_ID]: {status: SUCCEEDED}}})]);
        expect(failureData).toEqual([expect.objectContaining({key: ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, value: {[REQUEST_ID]: {status: FAILED, errors: ERRORS}}})]);
    });
});
