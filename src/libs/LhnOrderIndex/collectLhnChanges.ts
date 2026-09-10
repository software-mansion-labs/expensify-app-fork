import ONYXKEYS from '@src/ONYXKEYS';

import type {LhnIndexChanges, LhnIndexInputs} from './types';

const REPORT_KEY_PREFIX_LENGTH = ONYXKEYS.COLLECTION.REPORT.length;

function toReportID(reportKey: string): string {
    return reportKey.slice(REPORT_KEY_PREFIX_LENGTH);
}

function everyReportID(inputs: LhnIndexInputs): string[] {
    return Object.keys(inputs.reportsToDisplay).map(toReportID);
}

/**
 * Whether the row of one report would come out different, decided by reference on the four containers it is built
 * from. The `hasChanged` flags are checked first so an unchanged container costs no lookup at all: on a normal
 * write only the reports collection and the derived attributes change, and the other two are skipped entirely.
 */
function hasRowChanged(reportKey: string, reportID: string, previous: LhnIndexInputs, next: LhnIndexInputs, changed: ContainerChanges): boolean {
    if (previous.reportsToDisplay[reportKey] !== next.reportsToDisplay[reportKey]) {
        return true;
    }
    if (changed.attributes && previous.reportAttributes?.[reportID] !== next.reportAttributes?.[reportID]) {
        return true;
    }
    if (changed.reportNameValuePairs) {
        const nameValuePairsKey: `${typeof ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${string}` = `${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${reportID}`;
        if (previous.reportNameValuePairs?.[nameValuePairsKey] !== next.reportNameValuePairs?.[nameValuePairsKey]) {
            return true;
        }
    }
    if (!changed.drafts) {
        return false;
    }
    const draftKey: `${typeof ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}${string}` = `${ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}${reportID}`;
    return !previous.draftComments?.[draftKey] !== !next.draftComments?.[draftKey];
}

type ContainerChanges = {
    displayed: boolean;
    attributes: boolean;
    reportNameValuePairs: boolean;
    drafts: boolean;
};

function collectContainerChanges(previous: LhnIndexInputs, next: LhnIndexInputs): ContainerChanges {
    return {
        displayed: previous.reportsToDisplay !== next.reportsToDisplay,
        attributes: previous.reportAttributes !== next.reportAttributes,
        reportNameValuePairs: previous.reportNameValuePairs !== next.reportNameValuePairs,
        drafts: previous.draftComments !== next.draftComments,
    };
}

/**
 * The rows one user action changed. Without a previous version every row is sent, which is the once-per-session
 * ingest; afterwards this is a pass over the displayed report keys with a handful of reference comparisons each,
 * and it is the only work the main thread still does for the LHN order. Onyx deltas would remove even that pass,
 * which `../../PLAN.md` lists as the next step.
 */
function collectLhnChanges(previous: LhnIndexInputs | undefined, next: LhnIndexInputs): LhnIndexChanges {
    if (!previous) {
        return {upsertIDs: everyReportID(next), deleteIDs: [], full: true};
    }

    const changed = collectContainerChanges(previous, next);
    if (!changed.displayed && !changed.attributes && !changed.reportNameValuePairs && !changed.drafts) {
        return {upsertIDs: [], deleteIDs: [], full: false};
    }

    const upsertIDs: string[] = [];
    for (const reportKey of Object.keys(next.reportsToDisplay)) {
        const reportID = toReportID(reportKey);
        if (hasRowChanged(reportKey, reportID, previous, next, changed)) {
            upsertIDs.push(reportID);
        }
    }

    const deleteIDs: string[] = [];
    if (changed.displayed) {
        for (const reportKey of Object.keys(previous.reportsToDisplay)) {
            if (!(reportKey in next.reportsToDisplay)) {
                deleteIDs.push(toReportID(reportKey));
            }
        }
    }

    return {upsertIDs, deleteIDs, full: false};
}

export default collectLhnChanges;
