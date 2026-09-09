import type {Report} from '@src/types/onyx';

/** SQLite buffer is a web-only experiment for now; native is a no-op (native already stores Onyx in SQLite via NitroSQLite). */
export default function initSQLiteBuffer() {}

function isSQLiteBufferFlipEnabled(): boolean {
    return false;
}

type BufferedLHNState = {
    isReady: boolean;
    orderedReportIDs: string[];
    reportsByID: Record<string, Report>;
};

const emptyState: BufferedLHNState = {isReady: false, orderedReportIDs: [], reportsByID: {}};

function getBufferedLHN(): BufferedLHNState {
    return emptyState;
}

function subscribeBufferedLHN(): () => void {
    return () => undefined;
}

function refreshBufferedLHN(): Promise<void> {
    return Promise.resolve();
}

export {isSQLiteBufferFlipEnabled, getBufferedLHN, subscribeBufferedLHN, refreshBufferedLHN};
