/**
 * The one way a page sends its own request. A custom page takes the request from its page of the plan, so the plan still
 * names every request of the flow, and the page only adds the input that it alone has, such as the amounts of the test
 * deposits. A page outside the flow, such as the verify account page, plans its request itself. A write sent again
 * while it is in flight is skipped by `runRequest`, also when the controller sent it.
 */
import {getLatestErrorMessage} from '@libs/ErrorUtils';

import type {PlannedRequest, RequestOutcome} from './types';

import useRequestState from './useRequestState';

type RequestHandle<TInput> = {
    send: (input: TInput) => Promise<RequestOutcome>;
    isPending: boolean;

    /** The error of the last attempt, until the next attempt starts or the controller ends the visit of the page */
    errorMessage: string | undefined;
};

function useRequest<TInput>(request: PlannedRequest<TInput>): RequestHandle<TInput> {
    const {isPending, errors} = useRequestState(request.key);

    return {
        send: request.send,
        isPending,
        errorMessage: getLatestErrorMessage({errors}) || undefined,
    };
}

export default useRequest;
