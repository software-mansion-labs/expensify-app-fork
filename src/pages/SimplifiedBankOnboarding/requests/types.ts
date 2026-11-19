import type {ReadCommand, ReadCommandParams, WriteCommand, WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

/** `skipped`: the request was not sent (a read made offline), or a newer request or a reset replaced its status entry */
type RequestOutcome = {status: 'succeeded'} | {status: 'failed'} | {status: 'skipped'};

/** One member per command, so the command and its params stay matched at the call site */
type ReadRequest = {
    [TCommand in ReadCommand]: {type: 'read'; command: TCommand; params: ReadCommandParams[TCommand]};
}[ReadCommand];

type WriteRequest = {
    [TCommand in WriteCommand]: {type: 'write'; command: TCommand; params: WriteCommandParams[TCommand]};
}[WriteCommand];

type MockRequest = ReadRequest | WriteRequest;

export type {MockRequest, ReadRequest, RequestOutcome, WriteRequest};
