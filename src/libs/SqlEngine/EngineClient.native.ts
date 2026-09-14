import type {IngestOptionsParams, SearchOptionsParams} from './EngineClient';
import type {EngineStats, OptionsFoundReply, OptionsIngestedReply, VfsMode} from './wasm/protocol';

/** Native has no worker-backed SQLite engine in this POC. The SearchRouter falls back to its JS path. */
function isEngineAvailable(): boolean {
    return false;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- the parameter keeps parity with the web client
function setEngineVfs(vfs: VfsMode) {
    // No engine on native; the VFS choice is web-only.
}

function ingestOptions(params: IngestOptionsParams): Promise<OptionsIngestedReply> {
    return Promise.reject(new Error(`SQL engine unavailable on native (options version ${params.version})`));
}

function searchOptions(params: SearchOptionsParams): Promise<OptionsFoundReply> {
    return Promise.reject(new Error(`SQL engine unavailable on native (options version ${params.version})`));
}

function getEngineStats(): Promise<EngineStats> {
    return Promise.reject(new Error('SQL engine unavailable on native'));
}

export {isEngineAvailable, setEngineVfs, ingestOptions, searchOptions, getEngineStats};
