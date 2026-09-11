/**
 * Runtime flag of the LHN order POC.
 * off: today's JS path (categorize, five sorts, tab filter and tab counts over the whole displayed set on every write).
 * sql: the same order served by the SQLite worker from an incrementally fed row table.
 * js: the same rows and the same order, kept in JS as sorted lists and answered in the render that wrote them.
 */
type LhnEngineMode = 'off' | 'sql' | 'js';

const MODES: LhnEngineMode[] = ['off', 'sql', 'js'];

let currentMode: LhnEngineMode = 'sql';

/** When on, every engine order is compared with today's order and disagreements are counted. Costs a full JS sort per write. */
let isGuardEnabled = false;

function isLhnEngineMode(value: unknown): value is LhnEngineMode {
    return typeof value === 'string' && MODES.some((mode) => mode === value);
}

function getLhnEngineMode(): LhnEngineMode {
    return currentMode;
}

function setLhnEngineMode(mode: LhnEngineMode) {
    currentMode = mode;
}

function isLhnGuardEnabled(): boolean {
    return isGuardEnabled;
}

function setLhnGuardEnabled(value: boolean) {
    isGuardEnabled = value;
}

export {getLhnEngineMode, setLhnEngineMode, isLhnEngineMode, isLhnGuardEnabled, setLhnGuardEnabled};
export type {LhnEngineMode};
