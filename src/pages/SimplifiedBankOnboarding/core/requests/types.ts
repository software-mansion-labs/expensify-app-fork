import type {BankAccountParams, ReadCommand, ReadCommandParams, WriteCommand, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import type * as OnyxCommon from '@src/types/onyx/OnyxCommon';

import type {RequestKey} from './requestKey';

/** Where one request of the flow is. `requestID` tells a new attempt apart from the result of an older one. */
type RequestState = {
    requestID: string;
    status: 'pending' | 'succeeded' | 'failed';
    errors?: OnyxCommon.Errors | null;

    /**
     * The server answered. The real API applies neither the success nor the failure data of an answer that needs an
     * admin, so only this tells a request that got such an answer from one that still waits.
     */
    hasResponse?: boolean;
};

/** One entry per request key, so a page reads the state of its own request and nothing else */
type OnboardingRequests = Record<RequestKey, RequestState>;

/** `skipped`: the request was not sent (a read made offline), or a newer request or a reset replaced its status entry */
type RequestOutcome = {status: 'succeeded'} | {status: 'failed'} | {status: 'skipped'};

/**
 * A request that a plan names before the user submits. The page reads its status by the key, and the controller sends
 * it once the answers are saved.
 */
type PlannedRequest = {
    key: RequestKey;

    /** Missing for a request that the page sends on its own, such as the test deposits of the validation step */
    send?: () => Promise<RequestOutcome>;
};

/** One member per command, so the command and its params stay matched at the call site */
type ReadRequest = {
    [TCommand in ReadCommand]: {type: 'read'; command: TCommand; params: ReadCommandParams[TCommand]};
}[ReadCommand];

type WriteRequest = {
    [TCommand in WriteCommand]: {type: 'write'; command: TCommand; params: WriteCommandParams[TCommand]};
}[WriteCommand];

type MockRequest = ReadRequest | WriteRequest;

export type {BankAccountParams, MockRequest, OnboardingRequests, PlannedRequest, ReadRequest, RequestOutcome, RequestState, WriteRequest};
