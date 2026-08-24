/**
 * TEMPORARY debug instrumentation, web only. QA auth is structurally off on native (`isQAAuthConfigured()`
 * returns false there), and the trace persists through localStorage, so every export here is a no-op that
 * exists to keep the web-only module out of the native bundles.
 */
type TraceRecord = {
    seq: number;
    at: string;
    load: string;
    url: string;
    ev: string;
    data?: Record<string, unknown>;
};

function fingerprint(value: string | undefined | null): string {
    if (!value) {
        return String(value);
    }
    return `len:${value.length} head:${value.slice(0, 6)}`;
}

function describeError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function traceQAAuth(): void {}

function formatQAAuthTrace(): string {
    return 'QAAuthTrace is web only.';
}

function clearQAAuthTrace(): void {}

export type {TraceRecord};
export {clearQAAuthTrace, describeError, fingerprint, formatQAAuthTrace, traceQAAuth};
