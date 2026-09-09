import Log from '@libs/Log';

import CONFIG from '@src/CONFIG';
import CONST from '@src/CONST';

import type {EngineStats, OrderReply, SortRow, VfsMode, WorkerReply, WorkerRequest} from './wasm/protocol';

import {isWorkerReply} from './wasm/protocol';

type IngestAndOrderParams = {
    reportID: string;
    version: number;
    upserts: SortRow[];
    deletes: string[];
    full: boolean;
};

type PendingRequest = {
    resolve: (reply: WorkerReply) => void;
    reject: (error: Error) => void;
};

const INIT_REQUEST_ID = 0;

const pendingRequests = new Map<number, PendingRequest>();

let worker: Worker | undefined;
let hasFailed = false;
let requestedVfs: VfsMode = 'memory';
let nextRequestID = INIT_REQUEST_ID + 1;

/** True when a worker-backed SQLite engine can be started on this platform. */
function isEngineAvailable(): boolean {
    return typeof Worker !== 'undefined' && !CONFIG.IS_TEST_ENV && !hasFailed;
}

/** Selects the VFS of the worker database. It only takes effect before the worker starts. */
function setEngineVfs(vfs: VfsMode) {
    if (worker) {
        Log.warn('[SqlEngine] the VFS cannot be changed once the worker has started');
        return;
    }
    requestedVfs = vfs;
}

function failEngine(message: string) {
    hasFailed = true;
    Log.warn(`[SqlEngine] engine disabled: ${message}`);
    worker?.terminate();
    worker = undefined;
    for (const pending of pendingRequests.values()) {
        pending.reject(new Error(message));
    }
    pendingRequests.clear();
}

function settle(requestID: number, reply: WorkerReply | undefined, error: Error | undefined) {
    const pending = pendingRequests.get(requestID);
    if (!pending) {
        return;
    }
    pendingRequests.delete(requestID);
    if (reply) {
        pending.resolve(reply);
        return;
    }
    pending.reject(error ?? new Error('SQL engine request failed'));
}

function handleMessage(event: MessageEvent<unknown>) {
    const reply = event.data;
    if (!isWorkerReply(reply)) {
        return;
    }
    if (reply.type === 'ready') {
        return;
    }
    if (reply.type === 'error') {
        if (reply.requestID === undefined) {
            failEngine(reply.message);
            return;
        }
        settle(reply.requestID, undefined, new Error(reply.message));
        return;
    }
    settle(reply.requestID, reply, undefined);
}

function startWorker(): Worker {
    const started = new Worker(new URL('./wasm/worker.ts', import.meta.url), {type: 'module'});
    started.onmessage = handleMessage;
    started.onerror = () => failEngine('the worker failed to start');
    started.postMessage({
        type: 'init',
        requestID: INIT_REQUEST_ID,
        vfs: requestedVfs,
        createdActionName: CONST.REPORT.ACTIONS.TYPE.CREATED,
        reportPreviewActionName: CONST.REPORT.ACTIONS.TYPE.REPORT_PREVIEW,
    });
    return started;
}

function sendRequest(buildRequest: (requestID: number) => WorkerRequest): Promise<WorkerReply> {
    if (!isEngineAvailable()) {
        return Promise.reject(new Error('SQL engine unavailable'));
    }
    const activeWorker = worker ?? startWorker();
    worker = activeWorker;
    const requestID = nextRequestID;
    nextRequestID += 1;
    return new Promise<WorkerReply>((resolve, reject) => {
        pendingRequests.set(requestID, {resolve, reject});
        activeWorker.postMessage(buildRequest(requestID));
    });
}

async function ingestAndOrder(params: IngestAndOrderParams): Promise<OrderReply> {
    const reply = await sendRequest((requestID) => ({type: 'ingest-and-order', requestID, ...params}));
    if (reply.type !== 'order') {
        throw new Error(`SQL engine returned "${reply.type}" instead of an order (report ${params.reportID})`);
    }
    return reply;
}

async function dropReport(reportID: string): Promise<void> {
    const reply = await sendRequest((requestID) => ({type: 'drop', requestID, reportID}));
    if (reply.type !== 'dropped') {
        throw new Error(`SQL engine returned "${reply.type}" instead of a drop confirmation (report ${reportID})`);
    }
}

async function getEngineStats(): Promise<EngineStats> {
    const reply = await sendRequest((requestID) => ({type: 'stats', requestID}));
    if (reply.type !== 'stats') {
        throw new Error(`SQL engine returned "${reply.type}" instead of stats`);
    }
    return reply.stats;
}

export {isEngineAvailable, setEngineVfs, ingestAndOrder, dropReport, getEngineStats};
export type {IngestAndOrderParams};
