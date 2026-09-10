import type {IngestAndOrderParams, IngestOptionsParams, SearchOptionsParams} from './EngineClient';
import type {EngineStats, OptionsFoundReply, OptionsIngestedReply, OptionsMatcher, OrderReply, VfsMode} from './wasm/protocol';

/** Native has no worker-backed SQLite engine in this POC. The hook falls back to the JS order. */
function isEngineAvailable(): boolean {
    return false;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- the parameter keeps parity with the web client
function setEngineVfs(vfs: VfsMode) {
    // No engine on native; the VFS choice is web-only.
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- the parameter keeps parity with the web client
function setEngineOptionsMatcher(matcher: OptionsMatcher) {
    // No engine on native; the matcher choice is web-only.
}

function getEngineOptionsMatcher(): OptionsMatcher {
    return 'like';
}

function ingestOptions(params: IngestOptionsParams): Promise<OptionsIngestedReply> {
    return Promise.reject(new Error(`SQL engine unavailable on native (options version ${params.version})`));
}

function searchOptions(params: SearchOptionsParams): Promise<OptionsFoundReply> {
    return Promise.reject(new Error(`SQL engine unavailable on native (options version ${params.version})`));
}

function ingestAndOrder(params: IngestAndOrderParams): Promise<OrderReply> {
    return Promise.reject(new Error(`SQL engine unavailable on native (report ${params.reportID})`));
}

function dropReport(reportID: string): Promise<void> {
    return Promise.reject(new Error(`SQL engine unavailable on native (report ${reportID})`));
}

function getEngineStats(): Promise<EngineStats> {
    return Promise.reject(new Error('SQL engine unavailable on native'));
}

export {isEngineAvailable, setEngineVfs, setEngineOptionsMatcher, getEngineOptionsMatcher, ingestAndOrder, dropReport, ingestOptions, searchOptions, getEngineStats};
