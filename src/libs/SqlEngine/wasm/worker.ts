import type {InitRequest, WorkerReply, WorkerRequest} from './protocol';
import type {OrderActionNames} from './reportActionsTable';
import type {WasmSqlEngine} from './WasmSqlDriver';

import {isWorkerRequest} from './protocol';
import {createReportActionsSchema, dropReportRows, ingestAndOrderReport, readTableCounts} from './reportActionsTable';
import createWasmSqlEngine from './WasmSqlDriver';

/** The worker global, typed to the two members this entry point uses. */
type WorkerScope = {
    postMessage(message: WorkerReply): void;
    onmessage: ((event: MessageEvent<unknown>) => void) | null;
};

declare const self: WorkerScope;

type WorkerState = {
    engine: WasmSqlEngine;
    names: OrderActionNames;
};

let statePromise: Promise<WorkerState> | undefined;
let requestCount = 0;
let totalIngestMs = 0;
let totalOrderMs = 0;

/** Requests run one at a time so two transactions can never interleave at an await point. */
let queue: Promise<void> = Promise.resolve();

function post(reply: WorkerReply) {
    self.postMessage(reply);
}

function toMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown SQL engine worker error';
}

async function startEngine(request: InitRequest): Promise<WorkerState> {
    const engine = await createWasmSqlEngine(request.vfs);
    await createReportActionsSchema(engine.driver);
    return {engine, names: {createdActionName: request.createdActionName, reportPreviewActionName: request.reportPreviewActionName}};
}

async function handleInit(request: InitRequest): Promise<void> {
    statePromise = startEngine(request);
    try {
        const state = await statePromise;
        post({type: 'ready', sqliteVersion: state.engine.sqliteVersion, vfs: state.engine.vfs});
    } catch (error) {
        statePromise = undefined;
        post({type: 'error', requestID: undefined, message: toMessage(error)});
    }
}

function getState(): Promise<WorkerState> {
    if (!statePromise) {
        return Promise.reject(new Error('SQL engine worker is not initialized'));
    }
    return statePromise;
}

async function handleRequest(request: WorkerRequest): Promise<void> {
    if (request.type === 'init') {
        await handleInit(request);
        return;
    }

    const state = await getState();

    if (request.type === 'ingest-and-order') {
        const {ids, timings} = await ingestAndOrderReport(state.engine.driver, request, state.names);
        requestCount += 1;
        totalIngestMs += timings.ingestMs;
        totalOrderMs += timings.orderMs;
        post({type: 'order', requestID: request.requestID, reportID: request.reportID, version: request.version, ids, timings});
        return;
    }

    if (request.type === 'drop') {
        await dropReportRows(state.engine.driver, request.reportID);
        post({type: 'dropped', requestID: request.requestID, reportID: request.reportID});
        return;
    }

    const counts = await readTableCounts(state.engine.driver);
    post({
        type: 'stats',
        requestID: request.requestID,
        stats: {
            sqliteVersion: state.engine.sqliteVersion,
            vfs: state.engine.vfs,
            reportCount: counts.reportCount,
            rowCount: counts.rowCount,
            requestCount,
            totalIngestMs,
            totalOrderMs,
        },
    });
}

self.onmessage = (event: MessageEvent<unknown>) => {
    const request = event.data;
    if (!isWorkerRequest(request)) {
        post({type: 'error', requestID: undefined, message: 'Unknown SQL engine worker request'});
        return;
    }
    queue = queue.then(() => handleRequest(request)).catch((error: unknown) => post({type: 'error', requestID: request.requestID, message: toMessage(error)}));
};
