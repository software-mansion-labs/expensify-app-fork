/* eslint-disable no-console */
/**
 * TEMPORARY debug instrumentation for the QA Cloudflare Access boot flow. Not part of the shipped feature —
 * delete this directory and its call sites before the PR is reviewed.
 *
 * The flow spans three separate page loads (app -> Cloudflare authorize -> app callback), so `console.log`
 * is wiped twice before anyone can read it. Records go to localStorage instead, which is per-origin and
 * survives navigation, and are tagged with a per-load id so the boundary between loads stays visible.
 *
 * Nothing secret is recorded: authorization codes, PKCE verifiers and tokens are reduced to a length and a
 * short prefix, which is enough to correlate two records without being enough to replay anything.
 */
const STORAGE_KEY = 'qaAuthTrace';
const MAX_RECORDS = 300;

type TraceRecord = {
    /** Monotonic across the whole trace, so ordering survives clock skew between loads */
    seq: number;
    at: string;
    /** Distinguishes records written by different page loads of the same flow */
    load: string;
    /** Page location when the record was written, with sensitive query values redacted */
    url: string;
    ev: string;
    data?: Record<string, unknown>;
};

/** Random per page load. Not crypto — it only has to differ between two loads a few seconds apart. */
const loadID = Math.random().toString(36).slice(2, 8);

/**
 * Resolved once: whether storage is usable cannot change during a page load. Reading the property is what
 * throws in hardened browser configurations, not just the write, so the access itself sits inside the try —
 * the same hazard `PendingAuthFlowStorage` guards against.
 */
const storage: Storage | undefined = (() => {
    if (typeof window === 'undefined') {
        return undefined;
    }
    try {
        return window.localStorage;
    } catch {
        return undefined;
    }
})();

/** Enough to prove two records refer to the same value, far too little to use the value */
function fingerprint(value: string | undefined | null): string {
    if (!value) {
        return String(value);
    }
    return `len:${value.length} head:${value.slice(0, 6)}`;
}

/** Every call site traces the same shape of caught value, so the narrowing lives here rather than at each one */
function describeError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/** Query values are redacted by name, so a callback URL can be recorded without recording the code itself */
function redactSearch(search: string): string {
    if (!search) {
        return '';
    }
    const parts: string[] = [];
    for (const [key, value] of new URLSearchParams(search)) {
        if (key === 'code' || key === 'state' || key === 'code_challenge' || key === 'oauth_session_nonce') {
            parts.push(`${key}=<${fingerprint(value)}>`);
        } else {
            parts.push(`${key}=${value.slice(0, 200)}`);
        }
    }
    return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * The redacted location is recomputed only when the real one changes, which a string compare answers. It does
 * change within a load: the callback handler rewrites the URL through `history.replaceState`.
 */
let cachedHref = '';
let cachedURL = '';
function currentURL(): string {
    if (window.location.href !== cachedHref) {
        cachedHref = window.location.href;
        cachedURL = `${window.location.pathname}${redactSearch(window.location.search)}`;
    }
    return cachedURL;
}

/** The trace only ever reads back what it wrote, so this checks the shape rather than validating every field */
function isTraceRecordArray(value: unknown): value is TraceRecord[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null && 'seq' in item && 'ev' in item);
}

/**
 * Loaded once at import, then kept in memory. Reading and reparsing the whole buffer per record would put a
 * parse of every prior record on a path that fires per API request.
 */
const records: TraceRecord[] = (() => {
    if (!storage) {
        return [];
    }
    try {
        const raw = storage.getItem(STORAGE_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        return isTraceRecordArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
})();

let seq = records.at(-1)?.seq ?? 0;

function traceQAAuth(ev: string, data?: Record<string, unknown>): void {
    if (!storage) {
        return;
    }
    seq += 1;
    records.push({
        seq,
        at: new Date().toISOString(),
        load: loadID,
        url: currentURL(),
        ev,
        ...(data ? {data} : {}),
    });
    if (records.length > MAX_RECORDS) {
        records.splice(0, records.length - MAX_RECORDS);
    }
    try {
        // Written synchronously on purpose: the next thing the flow does is navigate away, and a deferred
        // write would not survive it.
        storage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
        // A full or blocked localStorage must not break the flow being traced
    }
    console.debug('[QAAuthTrace]', loadID, ev, data ?? '');
}

/** One line per record, ready to paste back into a chat */
function formatQAAuthTrace(): string {
    if (!records.length) {
        return 'QAAuthTrace is empty.';
    }
    return records
        .map((record) => {
            const time = record.at.slice(11, 23);
            const data = record.data ? ` ${JSON.stringify(record.data)}` : '';
            return `#${record.seq} ${time} [${record.load}] ${record.url} ${record.ev}${data}`;
        })
        .join('\n');
}

function clearQAAuthTrace(): void {
    records.length = 0;
    storage?.removeItem(STORAGE_KEY);
}

/** Attached to window so the trace can be read from the DevTools console with no imports */
if (storage) {
    Object.assign(window, {
        qaAuthTrace: () => {
            const text = formatQAAuthTrace();
            console.log(text);
            return text;
        },
        qaAuthTraceRecords: () => records,
        qaAuthTraceClear: clearQAAuthTrace,
    });
}

export type {TraceRecord};
export {clearQAAuthTrace, describeError, fingerprint, formatQAAuthTrace, traceQAAuth};
