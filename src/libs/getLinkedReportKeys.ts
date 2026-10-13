import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';

import type {OnyxCollection} from 'react-native-onyx';

type LinkedReport = Pick<Report, 'parentReportID' | 'chatReportID'>;

/**
 * Returns the keys of the displayed reports whose LHN state can change when the given reports change, without the given keys.
 *
 * A report's LHN state reads its parent report, its chat report and its parent report action, so a change to a report
 * reaches its threads and expense reports, and the other way around. A moved report also links to the parent and chat it had.
 */
function getLinkedReportKeys(updatedReportKeys: string[], reports: OnyxCollection<LinkedReport>, displayedReports: Record<string, LinkedReport | undefined>): string[] {
    const updatedKeys = new Set(updatedReportKeys);
    const updatedReportIDs = new Set(updatedReportKeys.map((key) => key.slice(ONYXKEYS.COLLECTION.REPORT.length)));
    const linkedKeys = new Set<string>();

    const addIfDisplayed = (reportID: string | undefined) => {
        const key = `${ONYXKEYS.COLLECTION.REPORT}${reportID}`;
        if (reportID && !updatedKeys.has(key) && displayedReports[key]) {
            linkedKeys.add(key);
        }
    };
    for (const key of updatedReportKeys) {
        for (const report of [reports?.[key], displayedReports[key]]) {
            addIfDisplayed(report?.parentReportID);
            addIfDisplayed(report?.chatReportID);
        }
    }

    const isUpdated = (reportID: string | undefined) => !!reportID && updatedReportIDs.has(reportID);
    for (const [key, report] of Object.entries(displayedReports)) {
        if (!updatedKeys.has(key) && (isUpdated(report?.parentReportID) || isUpdated(report?.chatReportID))) {
            linkedKeys.add(key);
        }
    }

    return [...linkedKeys];
}

export default getLinkedReportKeys;
