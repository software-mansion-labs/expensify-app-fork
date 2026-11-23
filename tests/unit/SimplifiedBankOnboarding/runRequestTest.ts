import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import getRequestKey from '@pages/SimplifiedBankOnboarding/core/requests/requestKey';
import runRequest from '@pages/SimplifiedBankOnboarding/core/requests/runRequest';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/core/requests/types';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';

import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

import type {OnyxKey} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

import getOnyxValue from '../../utils/getOnyxValue';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

jest.mock('@pages/SimplifiedBankOnboarding/mockBackend/mockApi', () => ({read: jest.fn(), write: jest.fn()}));

type Answer = 'success' | 'failure' | 'adminRequired' | 'none';

/** Applies the data of a request the way the real API does for each kind of answer. An answer that needs an admin applies neither the success nor the failure data. */
function answerWrites(answer: Answer) {
    jest.mocked(write).mockImplementation((_command, _params, onyxData: OnyxData<OnyxKey> = {}) => {
        Onyx.update(onyxData.optimisticData ?? [])
            .then(() => {
                if (answer === 'success') {
                    return Onyx.update(onyxData.successData ?? []);
                }
                return answer === 'failure' ? Onyx.update(onyxData.failureData ?? []) : undefined;
            })
            .then(() => (answer === 'none' ? undefined : Onyx.update(onyxData.finallyData ?? [])));
    });
}

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
        answerWrites('success');

        // When the request is sent
        const outcome = await sendValidateUser();

        // Then the handler that awaits it goes on, and the page shows no pending state
        expect(outcome).toEqual({status: 'succeeded'});
        expect((await getRequestState())?.status).toBe('succeeded');
    });

    it('settles as failed when the answer applies the failure data', async () => {
        // Given a server that rejects the request
        answerWrites('failure');

        // When the request is sent
        const outcome = await sendValidateUser();

        // Then the handler stays on the page, which shows the error of the request
        expect(outcome).toEqual({status: 'failed'});
        expect((await getRequestState())?.errors).toBeTruthy();
    });

    it('settles as failed when the answer applies neither the success nor the failure data', async () => {
        // Given an answer that needs an admin, for which the real API applies only the finally data
        answerWrites('adminRequired');

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
        answerWrites('success');
        await sendValidateUser();
        await waitForBatchedUpdates();

        // When the same request is sent again and the server has not answered yet
        answerWrites('none');
        let hasSettled = false;
        sendValidateUser().then(() => {
            hasSettled = true;
        });
        await waitForBatchedUpdates();

        // Then the old mark does not fail the new attempt, which still waits for its own answer
        expect(hasSettled).toBe(false);
        expect((await getRequestState())?.status).toBe('pending');
    });
});
