/**
 * Runtime flag of the report-actions SQL engine POC.
 * off: today's JS path only. preview: JS order until the worker confirms, then SQL order.
 * strict: SQL order only, plus an equality guard against the JS order.
 */
type ReportActionsEngineMode = 'off' | 'preview' | 'strict';

const MODES: ReportActionsEngineMode[] = ['off', 'preview', 'strict'];

let currentMode: ReportActionsEngineMode = 'preview';

function isReportActionsEngineMode(value: unknown): value is ReportActionsEngineMode {
    return typeof value === 'string' && MODES.some((mode) => mode === value);
}

function getReportActionsEngineMode(): ReportActionsEngineMode {
    return currentMode;
}

function setReportActionsEngineMode(mode: ReportActionsEngineMode) {
    currentMode = mode;
}

export {getReportActionsEngineMode, setReportActionsEngineMode, isReportActionsEngineMode};
export type {ReportActionsEngineMode};
