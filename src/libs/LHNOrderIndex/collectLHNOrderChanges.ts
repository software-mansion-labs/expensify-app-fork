import type {LHNOrderInputs, LHNOrderReport, LHNOrderRow} from './types';

import buildLHNOrderRow, {hasArchiveFlag, hasDraftComment} from './buildLHNOrderRow';
import isSameLHNOrderRow from './isSameLHNOrderRow';

type LHNOrderChanges = {
    /** The rows that are new or differ from the indexed row, keyed by report key. */
    changedRows: Map<string, LHNOrderRow>;

    /** The keys of indexed reports the LHN no longer displays. */
    removedKeys: string[];
};

type ChangedInputs = Record<'reports' | 'names' | 'archives' | 'drafts', boolean>;

/** Whether anything a report's row is built from changed. Onyx keeps the identity of the reports a write did not touch. */
function hasRowInputChanged(key: string, report: LHNOrderReport, previous: LHNOrderInputs, next: LHNOrderInputs, changed: ChangedInputs): boolean {
    const {reportID} = report;
    if (changed.reports && previous.reportsToDisplay[key] !== report) {
        return true;
    }
    // The derived attributes are rewritten on every recompute, so only the name the row reads is compared.
    if (changed.names && previous.reportAttributes?.[reportID]?.reportName !== next.reportAttributes?.[reportID]?.reportName) {
        return true;
    }
    if (changed.archives && hasArchiveFlag(reportID, previous.reportNameValuePairs) !== hasArchiveFlag(reportID, next.reportNameValuePairs)) {
        return true;
    }
    return changed.drafts && hasDraftComment(reportID, previous.draftComments) !== hasDraftComment(reportID, next.draftComments);
}

/**
 * The rows that changed between two versions of the inputs, given the rows built from the previous version.
 * Without a previous version every displayed report is new.
 */
function collectLHNOrderChanges(previous: LHNOrderInputs | undefined, next: LHNOrderInputs, rows: ReadonlyMap<string, LHNOrderRow>): LHNOrderChanges {
    const changedRows = new Map<string, LHNOrderRow>();
    const changed: ChangedInputs = {
        reports: previous?.reportsToDisplay !== next.reportsToDisplay,
        names: previous?.reportAttributes !== next.reportAttributes,
        archives: previous?.reportNameValuePairs !== next.reportNameValuePairs,
        drafts: previous?.draftComments !== next.draftComments,
    };
    if (!changed.reports && !changed.names && !changed.archives && !changed.drafts) {
        return {changedRows, removedKeys: []};
    }

    let keptRowCount = 0;
    for (const key of Object.keys(next.reportsToDisplay)) {
        const report = next.reportsToDisplay[key];
        if (!report?.reportID) {
            continue;
        }
        const row = rows.get(key);
        if (row) {
            keptRowCount++;
        }
        if (row && previous && !hasRowInputChanged(key, report, previous, next, changed)) {
            continue;
        }
        const nextRow = buildLHNOrderRow(report, next);
        if (!row || !isSameLHNOrderRow(row, nextRow)) {
            changedRows.set(key, nextRow);
        }
    }

    const removedKeys = keptRowCount < rows.size ? [...rows.keys()].filter((key) => !next.reportsToDisplay[key]?.reportID) : [];
    return {changedRows, removedKeys};
}

export default collectLHNOrderChanges;
