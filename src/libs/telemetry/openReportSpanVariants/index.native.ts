import type {AttachOpenReportList, MarkOpenReport, StartOpenReportSpanVariants} from './types';

/** The variants compare web-only signals (DOM, Performance APIs), so native records none of them. */
const startOpenReportSpanVariants: StartOpenReportSpanVariants = () => {};
const attachOpenReportList: AttachOpenReportList = () => {};
const markOpenReportListCommitted: MarkOpenReport = () => {};
const markOpenReportListEffect: MarkOpenReport = () => {};
const markOpenReportListLaidOut: MarkOpenReport = () => {};
const markOpenReportHighlightLaidOut: MarkOpenReport = () => {};
const cancelOpenReportSpanVariants: MarkOpenReport = () => {};

export {
    attachOpenReportList,
    cancelOpenReportSpanVariants,
    markOpenReportHighlightLaidOut,
    markOpenReportListCommitted,
    markOpenReportListEffect,
    markOpenReportListLaidOut,
    startOpenReportSpanVariants,
};
