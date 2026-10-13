import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';

import type {OnyxCollection} from 'react-native-onyx';

import {shallowEqual} from 'fast-equals';

import useOnyx from './useOnyx';

/** Mapping from reportID to report name. */
type ReportIDToNameMap = Record<string, string>;

/** Builds a map of reportID to report name from COLLECTION.REPORT. */
function buildReportIDToNameMap(reports: OnyxCollection<Report> | undefined): ReportIDToNameMap {
    const map: ReportIDToNameMap = {};
    for (const report of Object.values(reports ?? {})) {
        if (!report) {
            continue;
        }
        map[report.reportID] = report.reportName ?? report.reportID;
    }
    return map;
}

const EMPTY_REPORT_ID_TO_NAME_MAP: ReportIDToNameMap = {};

let lastReports: OnyxCollection<Report> | undefined;
let lastReportIDToNameMap = EMPTY_REPORT_ID_TO_NAME_MAP;

/**
 * Selects the reportID to name map. Every subscriber shares one build per reports value, and the map keeps its
 * identity while no name changes, so a report update that renames nothing re-renders none of them.
 */
function reportIDToNameMapSelector(reports: OnyxCollection<Report>): ReportIDToNameMap {
    if (reports !== lastReports) {
        lastReports = reports;
        const reportIDToNameMap = buildReportIDToNameMap(reports);
        if (!shallowEqual(reportIDToNameMap, lastReportIDToNameMap)) {
            lastReportIDToNameMap = reportIDToNameMap;
        }
    }
    return lastReportIDToNameMap;
}

/** Returns a map of reportID to report name built from COLLECTION.REPORT. */
function useReportIDToNameMap(): ReportIDToNameMap {
    const [reportIDToNameMap = EMPTY_REPORT_ID_TO_NAME_MAP] = useOnyx(ONYXKEYS.COLLECTION.REPORT, {selector: reportIDToNameMapSelector});
    return reportIDToNameMap;
}

export default useReportIDToNameMap;
export {buildReportIDToNameMap};
