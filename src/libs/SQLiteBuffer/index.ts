import type {Report} from '@src/types/onyx';

import type {BufferEntity, BufferOp, MainToWorkerMessage, WorkerToMainMessage} from './protocol';

/**
 * SQLite buffer (MVP, web): shadow SQLite store fed by an echo-mode Onyx mirror.
 * Two localStorage flags gate it — production behavior is untouched without them:
 *   - `sqliteBufferEnabled === 'true'`: worker + echo mirror + parity/debug surface.
 *   - `sqliteBufferFlip === 'true'` (measurement mode): the LHN is served from the buffer and the
 *     patched Onyx provider hides the buffered collection prefixes from boot hydration; the echo
 *     mirror is disabled so the (persisted) buffer stays static for the measurement.
 * Debug/harness surface lives on `window.__sqliteBuffer`.
 */
import {getMirrorStats, startMirror} from './mirror';

function isEnabled(): boolean {
    try {
        return localStorage.getItem('sqliteBufferEnabled') === 'true';
    } catch {
        return false;
    }
}

function isSQLiteBufferFlipEnabled(): boolean {
    try {
        return localStorage.getItem('sqliteBufferFlip') === 'true';
    } catch {
        return false;
    }
}

type BufferedLHNState = {
    isReady: boolean;
    orderedReportIDs: string[];
    /** Row payloads for the top of the ordered list, keyed by bare reportID. */
    reportsByID: Record<string, Report>;
};

// Swapped wholesale on every refresh (never mutated) so useSyncExternalStore consumers see a new
// reference and re-render.
let bufferedLHNState: BufferedLHNState = {isReady: false, orderedReportIDs: [], reportsByID: {}};
const bufferedLHNListeners = new Set<() => void>();

function getBufferedLHN(): BufferedLHNState {
    return bufferedLHNState;
}

function subscribeBufferedLHN(listener: () => void): () => void {
    bufferedLHNListeners.add(listener);
    return () => bufferedLHNListeners.delete(listener);
}

type LhnRefreshParams = {focusMode: boolean; currentReportID: string | null; conciergeReportID: string | null; currentUserAccountID: number};

// Assigned by initSQLiteBuffer once the worker exists; a no-op before that.
let refreshBufferedLHNImpl: (params: LhnRefreshParams) => Promise<void> = async () => undefined;

function refreshBufferedLHN(params: LhnRefreshParams): Promise<void> {
    return refreshBufferedLHNImpl(params);
}

export default function initSQLiteBuffer() {
    if (!isEnabled() && !isSQLiteBufferFlipEnabled()) {
        return;
    }

    const worker = new Worker(new URL('./buffer.worker.ts', import.meta.url), {type: 'module', name: 'sqlite-buffer'});

    let requestCounter = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pendingRequests = new Map<number, (payload: any) => void>();
    let readyAt: number | null = null;
    let initError: string | null = null;

    worker.onmessage = (event: MessageEvent<WorkerToMainMessage>) => {
        const message = event.data;
        switch (message.type) {
            case 'ready':
                readyAt = performance.now();
                performance.measure('sqliteBuffer:workerInit', {start: readyAt - message.initMs, end: readyAt});
                break;
            case 'initError':
                initError = message.message;
                // eslint-disable-next-line no-console
                console.error('[SQLiteBuffer] worker init failed:', message.message);
                break;
            case 'stats':
            case 'compare':
            case 'query':
            case 'lhn':
            case 'lhnFull':
            case 'lhnData':
            case 'search': {
                const resolve = pendingRequests.get(message.requestID);
                pendingRequests.delete(message.requestID);
                resolve?.(message);
                break;
            }
            default:
                break;
        }
    };

    function send(message: MainToWorkerMessage) {
        worker.postMessage(message);
    }

    // Request/response messages carry a requestID (the fire-and-forget 'batch' does not). The
    // generic keys the response type to the request's `type`, so callers get typed results.
    type WorkerRequest = Extract<MainToWorkerMessage, {requestID: number}>;
    type OmitRequestID<T> = T extends unknown ? Omit<T, 'requestID'> : never;

    function request<TMessage extends OmitRequestID<WorkerRequest>>(message: TMessage): Promise<Extract<WorkerToMainMessage, {type: TMessage['type']}>> {
        requestCounter += 1;
        const requestID = requestCounter;
        return new Promise((resolve) => {
            pendingRequests.set(requestID, resolve);
            // TS can't prove a spread of the generic message plus requestID re-forms a protocol union member.
            send({...message, requestID} as MainToWorkerMessage);
        });
    }

    refreshBufferedLHNImpl = async (params: LhnRefreshParams) => {
        const start = performance.now();
        const response = await request({type: 'lhnData', windowSize: 200, ...params});
        const reportsByID: Record<string, Report> = {};
        for (const [id, json] of response.reportRows) {
            try {
                reportsByID[id] = JSON.parse(json) as Report;
            } catch {
                // skip unparseable rows
            }
        }
        bufferedLHNState = {isReady: true, orderedReportIDs: response.orderedIds, reportsByID};
        try {
            performance.measure('sqliteBuffer:lhnData', {start, end: performance.now()});
        } catch {
            // best-effort
        }
        for (const listener of bufferedLHNListeners) {
            listener();
        }
    };

    // In flip (measurement) mode the buffered collections are hidden from Onyx, so the echo mirror
    // would only observe empty collections — keep the persisted buffer static instead.
    if (!isSQLiteBufferFlipEnabled()) {
        startMirror((ops: BufferOp[]) => send({type: 'batch', ops, enqueuedAt: Date.now()}));
    }

    // Harness/debug surface — the buffer is an experiment behind a local flag, so exposing
    // introspection on window is deliberate and web-only.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__sqliteBuffer = {
        stats: async () => ({
            worker: (await request({type: 'stats'})).stats,
            mirror: getMirrorStats(),
            readyAt,
            initError,
        }),
        compare: async (entity: BufferEntity, ids: string[]) => (await request({type: 'compare', entity, ids})).rows,
        query: async (sql: string, bind?: unknown[]) => request({type: 'query', sql, bind}),
        lhn: async (ids: string[] | null, focusMode: boolean) => request({type: 'lhn', ids, focusMode}),
        lhnFull: async (params: {focusMode: boolean; currentReportID: string | null; conciergeReportID: string | null; currentUserAccountID: number}) =>
            request({type: 'lhnFull', ...params}),
        lhnData: async (params: LhnRefreshParams & {windowSize?: number}) => request({type: 'lhnData', windowSize: 200, ...params}),
        state: () => bufferedLHNState,
        search: async (query: string, limit?: number) => request({type: 'search', query, limit}),
    };
}

export {isSQLiteBufferFlipEnabled, getBufferedLHN, subscribeBufferedLHN, refreshBufferedLHN};
