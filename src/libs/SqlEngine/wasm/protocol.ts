type VfsMode = 'memory' | 'opfs';

/** How the worker matches option rows against search terms. Chosen once, when the worker starts. */
type OptionsMatcher = 'like' | 'fts';

/** Sort keys of one report action. Full actions never cross the worker boundary. */
type SortRow = {
    id: string;
    created: string | undefined;
    actionName: string | undefined;
};

type OptionIndexKind = 'report' | 'contact';

/**
 * One searchable option of the SearchRouter: a report or a contact. Only the fields the router's
 * filter and its recency/alphabetical window read; the display option is built in JS for the survivors.
 */
type OptionIndexRow = {
    kind: OptionIndexKind;
    /** reportID for a report row, accountID for a contact row. */
    id: string;
    /** Deburred and lowercased text the router's substring match runs against. */
    searchText: string;
    /** `recentReportComparator` key for a report row, `personalDetailsComparator` key for a contact row. */
    orderKey: string;
    /** Whether the router's `excludeHidden` filter drops the row before matching. */
    isHidden: boolean;
};

type OptionIndexRef = Pick<OptionIndexRow, 'kind' | 'id'>;

/**
 * Sent once, right after the worker starts. It carries the VFS choice and the two action names the
 * order query binds as parameters, so the worker never has to import `CONST` (and the app with it).
 */
type InitRequest = {
    type: 'init';
    requestID: number;
    vfs: VfsMode;
    optionsMatcher: OptionsMatcher;
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

type IngestOptionsRequest = {
    type: 'ingest-options';
    requestID: number;
    version: number;
    upserts: OptionIndexRow[];
    deletes: OptionIndexRef[];
    /** When true the worker empties the option table before applying upserts. */
    full: boolean;
};

type SearchOptionsRequest = {
    type: 'search-options';
    requestID: number;
    version: number;
    /** Deburred, lowercased terms; every term must occur in a row's search text. */
    terms: string[];
    reportLimit: number;
    contactLimit: number;
};

type StatsRequest = {
    type: 'stats';
    requestID: number;
};

type WorkerRequest = InitRequest | IngestAndOrderRequest | DropRequest | IngestOptionsRequest | SearchOptionsRequest | StatsRequest;

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

type OptionsIngestedReply = {
    type: 'options-ingested';
    requestID: number;
    version: number;
    ingestMs: number;
};

type OptionsFoundReply = {
    type: 'options-found';
    requestID: number;
    version: number;
    /** Most recent first, at most `reportLimit` ids. */
    reportIDs: string[];
    /** Alphabetical, at most `contactLimit` ids. */
    contactIDs: string[];
    hasMoreReports: boolean;
    hasMoreContacts: boolean;
    queryMs: number;
};

type EngineStats = {
    sqliteVersion: string;
    vfs: VfsMode;
    optionsMatcher: OptionsMatcher;
    reportCount: number;
    rowCount: number;
    optionRowCount: number;
    requestCount: number;
    totalIngestMs: number;
    totalOrderMs: number;
    optionIngestCount: number;
    totalOptionIngestMs: number;
    searchCount: number;
    totalSearchMs: number;
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

type WorkerReply = OrderReply | DroppedReply | OptionsIngestedReply | OptionsFoundReply | StatsReply | ReadyReply | ErrorReply;

const REPLY_TYPES = new Set<string>(['order', 'dropped', 'options-ingested', 'options-found', 'stats', 'ready', 'error']);
const REQUEST_TYPES = new Set<string>(['init', 'ingest-and-order', 'drop', 'ingest-options', 'search-options', 'stats']);

function isWorkerReply(value: unknown): value is WorkerReply {
    if (typeof value !== 'object' || value === null || !('type' in value)) {
        return false;
    }
    return typeof value.type === 'string' && REPLY_TYPES.has(value.type);
}

function isWorkerRequest(value: unknown): value is WorkerRequest {
    if (typeof value !== 'object' || value === null || !('type' in value)) {
        return false;
    }
    return typeof value.type === 'string' && REQUEST_TYPES.has(value.type);
}

export {isWorkerReply, isWorkerRequest};
export type {
    VfsMode,
    OptionsMatcher,
    SortRow,
    OptionIndexKind,
    OptionIndexRow,
    OptionIndexRef,
    InitRequest,
    IngestAndOrderRequest,
    DropRequest,
    IngestOptionsRequest,
    SearchOptionsRequest,
    StatsRequest,
    WorkerRequest,
    OrderTimings,
    OrderReply,
    DroppedReply,
    OptionsIngestedReply,
    OptionsFoundReply,
    EngineStats,
    StatsReply,
    ReadyReply,
    ErrorReply,
    WorkerReply,
};
