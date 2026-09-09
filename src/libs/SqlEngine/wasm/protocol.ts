type VfsMode = 'memory' | 'opfs';

/** Sort keys of one report action. Full actions never cross the worker boundary. */
type SortRow = {
    id: string;
    created: string | undefined;
    actionName: string | undefined;
};

/**
 * Sent once, right after the worker starts. It carries the VFS choice and the two action names the
 * order query binds as parameters, so the worker never has to import `CONST` (and the app with it).
 */
type InitRequest = {
    type: 'init';
    requestID: number;
    vfs: VfsMode;
    createdActionName: string;
    reportPreviewActionName: string;
};

type IngestAndOrderRequest = {
    type: 'ingest-and-order';
    requestID: number;
    reportID: string;
    version: number;
    upserts: SortRow[];
    deletes: string[];
    /** When true the worker replaces every row of the report before applying upserts. */
    full: boolean;
};

type DropRequest = {
    type: 'drop';
    requestID: number;
    reportID: string;
};

type StatsRequest = {
    type: 'stats';
    requestID: number;
};

type WorkerRequest = InitRequest | IngestAndOrderRequest | DropRequest | StatsRequest;

type OrderTimings = {
    ingestMs: number;
    orderMs: number;
};

type OrderReply = {
    type: 'order';
    requestID: number;
    reportID: string;
    version: number;
    ids: string[];
    timings: OrderTimings;
};

type DroppedReply = {
    type: 'dropped';
    requestID: number;
    reportID: string;
};

type EngineStats = {
    sqliteVersion: string;
    vfs: VfsMode;
    reportCount: number;
    rowCount: number;
    requestCount: number;
    totalIngestMs: number;
    totalOrderMs: number;
};

type StatsReply = {
    type: 'stats';
    requestID: number;
    stats: EngineStats;
};

type ReadyReply = {
    type: 'ready';
    sqliteVersion: string;
    vfs: VfsMode;
};

type ErrorReply = {
    type: 'error';
    requestID: number | undefined;
    message: string;
};

type WorkerReply = OrderReply | DroppedReply | StatsReply | ReadyReply | ErrorReply;

function isWorkerReply(value: unknown): value is WorkerReply {
    if (typeof value !== 'object' || value === null || !('type' in value)) {
        return false;
    }
    const {type} = value;
    return type === 'order' || type === 'dropped' || type === 'stats' || type === 'ready' || type === 'error';
}

function isWorkerRequest(value: unknown): value is WorkerRequest {
    if (typeof value !== 'object' || value === null || !('type' in value)) {
        return false;
    }
    const {type} = value;
    return type === 'init' || type === 'ingest-and-order' || type === 'drop' || type === 'stats';
}

export {isWorkerReply, isWorkerRequest};
export type {
    VfsMode,
    SortRow,
    InitRequest,
    IngestAndOrderRequest,
    DropRequest,
    StatsRequest,
    WorkerRequest,
    OrderTimings,
    OrderReply,
    DroppedReply,
    EngineStats,
    StatsReply,
    ReadyReply,
    ErrorReply,
    WorkerReply,
};
