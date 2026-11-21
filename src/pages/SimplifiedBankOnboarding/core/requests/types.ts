import type {BankAccountParams, ReadCommand, ReadCommandParams, WriteCommand, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import type {RequestKey} from './requestKey';

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

export type {BankAccountParams, MockRequest, PlannedRequest, ReadRequest, RequestOutcome, WriteRequest};
