import {act, renderHook} from '@testing-library/react-native';

import useStepRequest from '@pages/SimplifiedBankOnboarding/requests/useStepRequest';
import type {StepRequestMode} from '@pages/SimplifiedBankOnboarding/requests/useStepRequest';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {RequestStatus} from '@pages/SimplifiedBankOnboarding/types/onyx';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

import getOnyxValue from '../../utils/getOnyxValue';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

let mockIsFocused = true;

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<Record<string, unknown>>('@react-navigation/native'),
    useIsFocused: () => mockIsFocused,
}));

const {PENDING, SUCCEEDED, FAILED} = SBO_CONST.REQUEST_STATUS;
const COMMAND = 'SaveCorpayOnboardingCompanyDetails';
const ERROR_MESSAGE = 'The request failed';
const ERROR_TIME = 1;

function setRequest(requestID: string, value: Partial<RequestStatus>) {
    return act(async () => {
        await Onyx.merge(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, {[requestID]: value});
        await waitForBatchedUpdates();
    });
}

/** Sends a request the way an action does: it writes the pending entry under the ID that the hook created */
function sendRequest(send: ReturnType<typeof useStepRequest>['send']): string {
    let sentRequestID: string | undefined;
    act(() => {
        send((requestID) => {
            sentRequestID = requestID;
            Onyx.merge(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, {[requestID]: {command: COMMAND, status: PENDING}});
        });
    });
    if (!sentRequestID) {
        throw new Error('The hook did not send the request');
    }
    return sentRequestID;
}

async function renderStepRequest(mode: StepRequestMode = 'confirmed') {
    const onSuccess = jest.fn();
    const hook = renderHook(() => useStepRequest({mode, onSuccess}));
    await act(async () => {
        await waitForBatchedUpdates();
    });
    return {...hook, onSuccess};
}

describe('useStepRequest', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        mockIsFocused = true;
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    it('calls onSuccess once and removes the entry when the own request succeeds', async () => {
        // Given a step that sent a request
        const {result, onSuccess} = await renderStepRequest();
        const requestID = sendRequest(result.current.send);
        await act(async () => {
            await waitForBatchedUpdates();
        });
        expect(result.current.isPending).toBe(true);

        // When the success data of that request lands, and an unrelated write follows it
        await setRequest(requestID, {status: SUCCEEDED});
        await setRequest('unrelated', {command: COMMAND, status: PENDING});

        // Then the step moves on exactly once, and the entry is gone so a later render cannot move it again
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(result.current.isPending).toBe(false);
        const requests = await getOnyxValue(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS);
        expect(requests?.[requestID]).toBeUndefined();
    });

    it('keeps the error of a failed request until the next send', async () => {
        // Given a step whose request failed
        const {result, onSuccess} = await renderStepRequest();
        const failedRequestID = sendRequest(result.current.send);
        await setRequest(failedRequestID, {status: FAILED, errors: {[ERROR_TIME]: ERROR_MESSAGE}});

        // Then the step shows the error, stays where it is, and accepts a new send
        expect(result.current.errorMessage).toBe(ERROR_MESSAGE);
        expect(result.current.isPending).toBe(false);
        expect(onSuccess).not.toHaveBeenCalled();

        // When the user submits again
        const retryRequestID = sendRequest(result.current.send);
        await act(async () => {
            await waitForBatchedUpdates();
        });

        // Then the old error is gone and the new request is pending
        expect(retryRequestID).not.toBe(failedRequestID);
        expect(result.current.errorMessage).toBe('');
        expect(result.current.isPending).toBe(true);
    });

    it('ignores a second send while the own request is pending', async () => {
        // Given a step whose request is still pending
        const {result} = await renderStepRequest();
        sendRequest(result.current.send);
        await act(async () => {
            await waitForBatchedUpdates();
        });

        // When the user presses the button again
        const secondAction = jest.fn();
        act(() => {
            result.current.send(secondAction);
        });

        // Then no second request is sent, which is the double-submit rule
        expect(secondAction).not.toHaveBeenCalled();
    });

    it('ignores the result of a request that another step sent', async () => {
        // Given a step that waits for its own request
        const {result, onSuccess} = await renderStepRequest();
        sendRequest(result.current.send);

        // When a request of another step succeeds, which is what the shared isSuccess used to leak
        await setRequest('another-step', {command: COMMAND, status: SUCCEEDED});

        // Then the step does not move on
        expect(onSuccess).not.toHaveBeenCalled();
        expect(result.current.isPending).toBe(true);
    });

    it('does not move a screen that is not focused', async () => {
        // Given a step instance that the user left while its request was pending
        const {result, onSuccess} = await renderStepRequest();
        const requestID = sendRequest(result.current.send);
        mockIsFocused = false;

        // When the request succeeds
        await setRequest(requestID, {status: SUCCEEDED});

        // Then the covered instance does not navigate, but it still drops the entry
        expect(onSuccess).not.toHaveBeenCalled();
        const requests = await getOnyxValue(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS);
        expect(requests?.[requestID]).toBeUndefined();
    });

    it('neither blocks nor moves the step in background mode', async () => {
        // Given a background save that is still pending
        const {result, onSuccess} = await renderStepRequest('background');
        const firstRequestID = sendRequest(result.current.send);
        await act(async () => {
            await waitForBatchedUpdates();
        });

        // When the step saves again and the latest save succeeds
        const secondRequestID = sendRequest(result.current.send);
        await setRequest(secondRequestID, {status: SUCCEEDED});

        // Then both saves went out, and only a confirmed request may move the step
        expect(secondRequestID).not.toBe(firstRequestID);
        expect(onSuccess).not.toHaveBeenCalled();
    });
});
