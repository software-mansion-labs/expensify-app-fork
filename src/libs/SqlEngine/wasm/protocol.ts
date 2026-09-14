type VfsMode = 'memory' | 'opfs';

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
    /**
     * Whether the row survives every validity predicate that holds whatever the app's navigation state is.
     * False rows can never be shown, so the worker filters them out instead of handing them to the formatter.
     */
    isValid: boolean;
};

type OptionIndexRef = Pick<OptionIndexRow, 'kind' | 'id'>;

/** Sent once, right after the worker starts. It carries the VFS choice the database is opened with. */
type InitRequest = {
    type: 'init';
    requestID: number;
    vfs: VfsMode;
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

type WorkerRequest = InitRequest | IngestOptionsRequest | SearchOptionsRequest | StatsRequest;

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
    /** Rows the report window matched, counted no further than `reportLimit + 1`. */
    matchedReports: number;
    /** Rows the contact window matched, counted no further than `contactLimit + 1`. */
    matchedContacts: number;
    queryMs: number;
};

type EngineStats = {
    sqliteVersion: string;
    vfs: VfsMode;
    optionRowCount: number;
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

type WorkerReply = OptionsIngestedReply | OptionsFoundReply | StatsReply | ReadyReply | ErrorReply;

const REPLY_TYPES = new Set<string>(['options-ingested', 'options-found', 'stats', 'ready', 'error']);
const REQUEST_TYPES = new Set<string>(['init', 'ingest-options', 'search-options', 'stats']);

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
    OptionIndexKind,
    OptionIndexRow,
    OptionIndexRef,
    InitRequest,
    IngestOptionsRequest,
    SearchOptionsRequest,
    StatsRequest,
    WorkerRequest,
    OptionsIngestedReply,
    OptionsFoundReply,
    EngineStats,
    StatsReply,
    ReadyReply,
    ErrorReply,
    WorkerReply,
};
