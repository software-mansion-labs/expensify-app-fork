/**
 * Runtime flag of the SearchRouter option-index POC.
 * off: today's JS path. js-index: a prebuilt text index scanned on the main thread (the fair JS counterfactual).
 * sql: the same index inside the SQLite worker, matched with FTS5 trigrams.
 */
type SearchRouterEngineMode = 'off' | 'js-index' | 'sql';

const MODES: SearchRouterEngineMode[] = ['off', 'js-index', 'sql'];

let currentMode: SearchRouterEngineMode = 'sql';

/** When on, every result is compared with today's path and disagreements are counted. Costs a full JS build per keystroke. */
let isGuardEnabled = false;

function isSearchRouterEngineMode(value: unknown): value is SearchRouterEngineMode {
    return typeof value === 'string' && MODES.some((mode) => mode === value);
}

function getSearchRouterEngineMode(): SearchRouterEngineMode {
    return currentMode;
}

function setSearchRouterEngineMode(mode: SearchRouterEngineMode) {
    currentMode = mode;
}

function isSearchRouterGuardEnabled(): boolean {
    return isGuardEnabled;
}

function setSearchRouterGuardEnabled(value: boolean) {
    isGuardEnabled = value;
}

export {getSearchRouterEngineMode, setSearchRouterEngineMode, isSearchRouterEngineMode, isSearchRouterGuardEnabled, setSearchRouterGuardEnabled};
export type {SearchRouterEngineMode};
