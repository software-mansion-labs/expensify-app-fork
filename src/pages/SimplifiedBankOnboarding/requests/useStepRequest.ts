/**
 * Sends a request of a step and follows only that request. The step gets a new request ID on every send and selects the
 * entry under that ID, so the result of another step's request, or of an earlier request of this step, never moves it.
 *
 * A `confirmed` request blocks a second send while it is pending, and moves the step on with `onSuccess` once it
 * succeeds. A `background` request is not waited for, because a later `confirmed` request of the same step sends the
 * same values again.
 */
import useOnyx from '@hooks/useOnyx';

import {getLatestErrorMessage} from '@libs/ErrorUtils';
import {rand64} from '@libs/NumberUtils';

import removeStepRequest from '@pages/SimplifiedBankOnboarding/actions/removeStepRequest';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {StepRequests} from '@pages/SimplifiedBankOnboarding/types/onyx';

import ONYXKEYS from '@src/ONYXKEYS';

import type {OnyxEntry} from 'react-native-onyx';

import {useIsFocused} from '@react-navigation/native';
import {useEffect, useEffectEvent, useState} from 'react';

type StepRequestMode = 'confirmed' | 'background';

type UseStepRequestParams = {
    mode?: StepRequestMode;

    /** Called once when a `confirmed` request succeeds while the screen of the step is focused */
    onSuccess?: () => void;
};

const {PENDING, SUCCEEDED, FAILED} = SBO_CONST.REQUEST_STATUS;

function useStepRequest({mode = 'confirmed', onSuccess}: UseStepRequestParams = {}) {
    const isFocused = useIsFocused();
    const [requestID, setRequestID] = useState<string>();

    const selectOwnRequest = (requests: OnyxEntry<StepRequests>) => (requestID ? (requests?.[requestID] ?? undefined) : undefined);
    const [request] = useOnyx(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, {selector: selectOwnRequest});

    const status = request?.status;
    const isPending = status === PENDING;

    // A covered instance of the flow screen stays mounted, so only the focused one may move the user.
    const callOnSuccessIfFocused = useEffectEvent(() => {
        if (mode !== 'confirmed' || !isFocused) {
            return;
        }
        onSuccess?.();
    });

    useEffect(() => {
        if (!requestID || status !== SUCCEEDED) {
            return;
        }
        removeStepRequest(requestID);
        callOnSuccessIfFocused();
    }, [requestID, status]);

    /** Creates the ID of a new request and passes it to the action that sends the request */
    const send = (sendRequest: (newRequestID: string) => void) => {
        if (mode === 'confirmed' && isPending) {
            return;
        }

        // A failed request keeps its entry for the error, until the step sends the next one.
        if (requestID && status === FAILED) {
            removeStepRequest(requestID);
        }

        const newRequestID = rand64();
        setRequestID(newRequestID);
        sendRequest(newRequestID);
    };

    return {
        send,
        isPending,
        hasFailed: status === FAILED,

        /** True once this screen sent a request, also after its entry was removed on success */
        wasSent: requestID !== undefined,
        errorMessage: status === FAILED ? getLatestErrorMessage(request) : '',
    };
}

export default useStepRequest;
export type {StepRequestMode};
