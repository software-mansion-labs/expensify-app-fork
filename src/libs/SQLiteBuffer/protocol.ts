// cspell:ignore OPFS
/**
 * Message protocol between the main thread (mirror) and the SQLite buffer worker.
 * MVP stage 1: shadow ingestion in echo mode — post-merge Onyx values are mirrored
 * into a SQLite (WASM + OPFS) database living entirely off the main thread.
 */

/** Entities mirrored into dedicated tables. */
type BufferEntity = 'report' | 'reportActions' | 'transaction' | 'reportAttributes' | 'draft' | 'rnvp' | 'policy' | 'transactionViolations' | 'personalDetails';

/** One upsert/delete of a full Onyx collection member (echo mode: value is the post-merge object). */
type BufferOp = {
    entity: BufferEntity;
    /** Collection member id (the Onyx key with its collection prefix stripped). */
    id: string;
    /** Post-merge value; null means the key was removed from Onyx. */
    value: unknown | null;
};

type MainToWorkerMessage =
    | {type: 'batch'; ops: BufferOp[]; enqueuedAt: number}
    | {type: 'stats'; requestID: number}
    | {type: 'compare'; requestID: number; entity: BufferEntity; ids: string[]}
    | {type: 'query'; requestID: number; sql: string; bind?: unknown[]}
    | {type: 'lhn'; requestID: number; ids: string[] | null; focusMode: boolean}
    | {type: 'lhnFull'; requestID: number; focusMode: boolean; currentReportID: string | null; conciergeReportID: string | null; currentUserAccountID: number}
    | {type: 'lhnData'; requestID: number; windowSize: number; focusMode: boolean; currentReportID: string | null; conciergeReportID: string | null; currentUserAccountID: number}
    | {type: 'search'; requestID: number; query: string; limit?: number};

type BufferStats = {
    initMs: number;
    rows: Record<string, number>;
    dbBytes: number;
    batches: number;
    ops: number;
    writeMs: number;
    maxBatchMs: number;
    /** Total ms between batch enqueue on main and completion in worker (queue + clone + write). */
    endToEndMs: number;
    errors: string[];
};

type WorkerToMainMessage =
    | {type: 'ready'; initMs: number}
    | {type: 'initError'; message: string}
    | {type: 'stats'; requestID: number; stats: BufferStats}
    | {type: 'compare'; requestID: number; rows: Record<string, string | null>}
    | {type: 'query'; requestID: number; rows: unknown[]; error?: string}
    | {type: 'lhn'; requestID: number; orderedIds: string[]; tookMs: number; missingIds: string[]; error?: string}
    | {type: 'lhnFull'; requestID: number; orderedIds: string[]; tookMs: number; error?: string}
    | {type: 'lhnData'; requestID: number; orderedIds: string[]; reportRows: Array<[string, string]>; tookMs: number; error?: string}
    | {type: 'search'; requestID: number; results: Array<{kind: string; reportID: string; actionID: string | null; snippet: string; rank: number}>; tookMs: number; error?: string};

export type {BufferEntity, BufferOp, MainToWorkerMessage, WorkerToMainMessage, BufferStats};
