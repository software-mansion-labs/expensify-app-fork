import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import getRequestKey from '@pages/SimplifiedBankOnboarding/core/requests/requestKey';
import runRequest from '@pages/SimplifiedBankOnboarding/core/requests/runRequest';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/core/requests/types';
import {READ_COMMANDS, WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {read, write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

import answerBankOnboardingRequests from '../../utils/answerBankOnboardingRequests';
import getOnyxValue from '../../utils/getOnyxValue';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

jest.mock('@pages/SimplifiedBankOnboarding/mockBackend/mockApi', () => ({read: jest.fn(), write: jest.fn()}));

function sendValidateUser(): Promise<RequestOutcome> {
    return runRequest({name: REQUEST_NAMES.VALIDATE_USER, type: 'write', command: WRITE_COMMANDS.VALIDATE_USER, params: {validateCode: '123456'}});
}

async function getRequestState() {
    const requests = await getOnyxValue(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS);
    return requests?.[getRequestKey(REQUEST_NAMES.VALIDATE_USER)];
}

describe('runRequest', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    // The last request never gets its answer, and clearing its status entry lets it stop listening
    afterAll(() => Onyx.clear());

    it('settles as succeeded when the answer applies the success data', async () => {
        // Given a server that accepts the request
        answerBankOnboardingRequests('write', 'success');

        // When the request is sent
        const outcome = await sendValidateUser();

        // Then the handler that awaits it goes on, and the page shows no pending state
        expect(outcome).toEqual({status: 'succeeded'});
        expect((await getRequestState())?.status).toBe('succeeded');
    });

    it('settles as failed when the answer applies the failure data', async () => {
        // Given a server that rejects the request
        answerBankOnboardingRequests('write', 'failure');

        // When the request is sent
        const outcome = await sendValidateUser();

        // Then the handler stays on the page, which shows the error of the request
        expect(outcome).toEqual({status: 'failed'});
        expect((await getRequestState())?.errors).toBeTruthy();
    });

    it('settles as failed when the answer applies neither the success nor the failure data', async () => {
        // Given an answer that needs an admin, for which the real API applies only the finally data
        answerBankOnboardingRequests('write', 'adminRequired');

        // When the request is sent
        const outcome = await sendValidateUser();
        await waitForBatchedUpdates();

        // Then the request does not stay pending forever: the handler returns and the page shows an error instead of a loader
        expect(outcome).toEqual({status: 'failed'});
        const requestState = await getRequestState();
        expect(requestState?.status).toBe('failed');
        expect(requestState?.errors).toBeTruthy();
    });

    it('keeps a new attempt pending after an earlier attempt with the same key was answered', async () => {
        // Given an answered request, whose status entry keeps the mark of its answer
        answerBankOnboardingRequests('write', 'success');
        await sendValidateUser();
        await waitForBatchedUpdates();

        // When the same request is sent again and the server has not answered yet
        answerBankOnboardingRequests('write', 'none');
        let hasSettled = false;
        sendValidateUser().then(() => {
            hasSettled = true;
        });
        await waitForBatchedUpdates();

        // Then the old mark does not fail the new attempt, which still waits for its own answer
        expect(hasSettled).toBe(false);
        expect((await getRequestState())?.status).toBe('pending');
    });

    it('sends a write once when it is sent again before the first send settled', async () => {
        // Given a server that has not answered yet, like a slow connection during a double press
        jest.mocked(write).mockClear();
        answerBankOnboardingRequests('write', 'none');
        sendValidateUser();

        // When the same write is sent again while the first one is in flight
        const secondOutcome = await sendValidateUser();

        // Then only one call reaches the server, because a second one could apply the same change twice
        expect(secondOutcome).toEqual({status: 'skipped'});
        expect(write).toHaveBeenCalledTimes(1);
    });

    it('sends a write again once the earlier send settled', async () => {
        // Given a write that the server rejected
        jest.mocked(write).mockClear();
        answerBankOnboardingRequests('write', 'failure');
        await sendValidateUser();
        await waitForBatchedUpdates();

        // When the user tries again
        answerBankOnboardingRequests('write', 'success');
        const outcome = await sendValidateUser();

        // Then the retry reaches the server, because the guard only holds while a write is in flight
        expect(outcome).toEqual({status: 'succeeded'});
        expect(write).toHaveBeenCalledTimes(2);
    });

    it('sends a read again while an earlier read with the same key is in flight', async () => {
        // Given a read that the server has not answered yet
        jest.mocked(read).mockClear();
        answerBankOnboardingRequests('read', 'none');
        const sendLinkTokenRead = () => runRequest({name: REQUEST_NAMES.OPEN_PLAID_BANK_LOGIN, type: 'read', command: READ_COMMANDS.OPEN_PLAID_BANK_LOGIN, params: {}});
        sendLinkTokenRead();

        // When the same read is sent again
        sendLinkTokenRead();

        // Then both reach the server, because reads with one key may ask for different data and change nothing there
        expect(read).toHaveBeenCalledTimes(2);
    });
});
