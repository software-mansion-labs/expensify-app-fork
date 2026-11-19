/**
 * The API layer of the mock backend. It stands in for `API.write` and `API.read`: it applies the optimistic data at once,
 * runs the command on the mock server after the configured latency, then applies the server response and the success or
 * failure data. Writes made offline wait in a queue, reads made offline are dropped.
 */
/* eslint-disable no-param-reassign -- The mock server keeps its database in memory and the handlers change it in place */
import Log from '@libs/Log';
import {getIsOffline, subscribe} from '@libs/NetworkState';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import type {OnyxData} from '@src/types/onyx/Request';

import type {OnyxKey} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

import type {ReadCommand, ReadCommandParams, WriteCommand, WriteCommandParams} from './commands';
import type {MockServerDatabase, MockServerResponse, RequestLogEntry} from './types';

import {readHandlers, writeHandlers} from './handlers';
import {changeDatabase, getDatabase, logRequest, waitForDatabase} from './serverDatabase';

type RequestType = RequestLogEntry['type'];

type PendingRequest<TKey extends OnyxKey> = {
    command: string;
    type: RequestType;
    onyxData: OnyxData<TKey>;
    runHandler: (database: MockServerDatabase) => MockServerResponse;
};

const {FAILURE_MODE, JSON_CODE} = SBO_CONST.MOCK;

let requestChain: Promise<void> = Promise.resolve();
let offlineWrites: Array<() => void> = [];

function waitForLatency(): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, getDatabase().settings.latencyMs);
    });
}

/** Runs the handler on the server, unless the control panel asked the server to fail this request */
function getServerResponse<TKey extends OnyxKey>({type, runHandler}: PendingRequest<TKey>): MockServerResponse {
    return changeDatabase((database) => {
        const {failureMode} = database.settings;
        const shouldFail = failureMode === FAILURE_MODE.ALL_REQUESTS || (failureMode === FAILURE_MODE.NEXT_WRITE && type === 'write');
        if (!shouldFail) {
            return runHandler(database);
        }
        if (failureMode === FAILURE_MODE.NEXT_WRITE) {
            database.settings.failureMode = FAILURE_MODE.NONE;
        }
        return {jsonCode: JSON_CODE.SERVER_ERROR, message: 'Failure injected from the control panel'};
    });
}

function processRequest<TKey extends OnyxKey>(request: PendingRequest<TKey>): Promise<void> {
    return waitForDatabase()
        .then(waitForLatency)
        .then(() => {
            const response = getServerResponse(request);
            const isSuccess = response.jsonCode === JSON_CODE.SUCCESS;
            logRequest({command: request.command, type: request.type, status: isSuccess ? 'success' : 'failure', message: response.message});
            const {successData = [], failureData = [], finallyData = []} = request.onyxData;
            return Onyx.update(response.onyxData ?? [])
                .then(() => Onyx.update(isSuccess ? successData : failureData))
                .then(() => Onyx.update(finallyData));
        });
}

/** Requests reach the server one at a time and in the order they were made */
function enqueueRequest<TKey extends OnyxKey>(request: PendingRequest<TKey>) {
    requestChain = requestChain
        .then(() => processRequest(request))
        .catch((error: unknown) => {
            // A request that throws must not block the requests behind it, and its loading state has to end.
            Log.warn('[SimplifiedBankOnboarding] The mock server could not process a request', {command: request.command, error});
            const {failureData = [], finallyData = []} = request.onyxData;
            return Onyx.update([...failureData, ...finallyData]);
        });
}

subscribe(() => {
    if (getIsOffline() || offlineWrites.length === 0) {
        return;
    }
    const writesToSend = offlineWrites;
    offlineWrites = [];
    for (const sendWrite of writesToSend) {
        sendWrite();
    }
});

function write<TCommand extends WriteCommand, TKey extends OnyxKey>(command: TCommand, params: WriteCommandParams[TCommand], onyxData: OnyxData<TKey> = {}) {
    Onyx.update(onyxData.optimisticData ?? []);
    const request: PendingRequest<TKey> = {command, type: 'write', onyxData, runHandler: (database) => writeHandlers[command](params, database)};
    if (!getIsOffline()) {
        enqueueRequest(request);
        return;
    }
    logRequest({command, type: 'write', status: 'queued', message: 'Offline, waits for the connection'});
    offlineWrites.push(() => enqueueRequest(request));
}

function read<TCommand extends ReadCommand, TKey extends OnyxKey>(command: TCommand, params: ReadCommandParams[TCommand], onyxData: OnyxData<TKey> = {}) {
    Onyx.update(onyxData.optimisticData ?? []);
    if (getIsOffline()) {
        logRequest({command, type: 'read', status: 'dropped', message: 'Offline, reads are not retried'});
        return;
    }
    enqueueRequest({command, type: 'read', onyxData, runHandler: (database) => readHandlers[command](params, database)});
}

export {read, write};
