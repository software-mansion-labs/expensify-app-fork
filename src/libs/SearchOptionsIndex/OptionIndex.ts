import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';

import type {OptionIndexRow, SearchOptionsIndexInputs} from './types';

import buildContactIndexRow from './buildContactIndexRow';
import buildReportIndexRow from './buildReportIndexRow';
import collectIndexChanges from './collectIndexChanges';

type UpdateResult = {
    /** Whether any row was rebuilt, added or removed, so a result computed before the update may be stale. */
    hasChanged: boolean;
};

/**
 * The rows of one account, kept up to date from Onyx snapshots. Reports and contacts are held apart because a
 * query scans one of them at a time, and every account is mapped to the 1:1 DM report its contact option shows.
 */
type OptionIndex = {
    reportRows: ReadonlyMap<string, OptionIndexRow>;
    contactRows: ReadonlyMap<string, OptionIndexRow>;
    dmReportIDByAccountID: ReadonlyMap<number, string>;

    /** Brings the rows up to date with the snapshots, rebuilding only what they invalidate. */
    update: (inputs: SearchOptionsIndexInputs) => UpdateResult;

    /** The snapshots the rows currently reflect, which is what a result has to be built from to match them. */
    getInputs: () => SearchOptionsIndexInputs;
};

const UNCHANGED: UpdateResult = {hasChanged: false};
const CHANGED: UpdateResult = {hasChanged: true};

function isReport(report: Report | null | undefined): report is Report {
    return !!report;
}

/** Builds the whole index from one snapshot. Later snapshots go through `update`, which rebuilds far less. */
function createOptionIndex(initialInputs: SearchOptionsIndexInputs): OptionIndex {
    const reportRows = new Map<string, OptionIndexRow>();
    const contactRows = new Map<string, OptionIndexRow>();
    const dmReportIDByAccountID = new Map<number, string>();
    const dmAccountIDByReportID = new Map<string, number>();
    let inputs = initialInputs;

    /**
     * Keeps the two directions of the DM mapping in step. An account keeps the DM it already has until that
     * report stops being one, so an edit never flips the mapping; where an account has several live 1:1 DMs the
     * first one the index sees wins, while today's path keeps the last one of the snapshot.
     */
    function setDMMapping(reportID: string, dmAccountID: number | undefined, remappedAccountIDs: Set<number>) {
        const mappedAccountID = dmAccountIDByReportID.get(reportID);
        if (mappedAccountID !== undefined && mappedAccountID !== dmAccountID) {
            dmAccountIDByReportID.delete(reportID);
            dmReportIDByAccountID.delete(mappedAccountID);
            remappedAccountIDs.add(mappedAccountID);
        }
        if (dmAccountID === undefined || dmReportIDByAccountID.has(dmAccountID)) {
            return;
        }
        dmReportIDByAccountID.set(dmAccountID, reportID);
        dmAccountIDByReportID.set(reportID, dmAccountID);
        remappedAccountIDs.add(dmAccountID);
    }

    function rebuildContactRow(accountID: number) {
        const detail = inputs.personalDetails?.[accountID];
        if (!detail) {
            contactRows.delete(String(accountID));
            return;
        }
        contactRows.set(String(accountID), buildContactIndexRow(detail, dmReportIDByAccountID.has(accountID), inputs));
    }

    function rebuildReportRow(reportID: string, remappedAccountIDs: Set<number>) {
        const report = inputs.reports?.[`${ONYXKEYS.COLLECTION.REPORT}${reportID}`];
        const entry = report ? buildReportIndexRow(report, inputs) : undefined;
        setDMMapping(reportID, entry?.dmAccountID, remappedAccountIDs);
        if (!entry) {
            reportRows.delete(reportID);
            return;
        }
        reportRows.set(reportID, entry.row);
    }

    function rebuildEverything() {
        reportRows.clear();
        contactRows.clear();
        dmReportIDByAccountID.clear();
        dmAccountIDByReportID.clear();

        for (const report of Object.values(inputs.reports ?? {}).filter(isReport)) {
            const entry = buildReportIndexRow(report, inputs);
            if (!entry) {
                continue;
            }
            reportRows.set(entry.row.id, entry.row);
            setDMMapping(report.reportID, entry.dmAccountID, new Set());
        }
        for (const detail of Object.values(inputs.personalDetails ?? {})) {
            if (detail) {
                rebuildContactRow(detail.accountID ?? CONST.DEFAULT_NUMBER_ID);
            }
        }
    }

    function update(next: SearchOptionsIndexInputs): UpdateResult {
        const changes = collectIndexChanges(inputs, next, dmReportIDByAccountID);
        inputs = next;

        if (changes.shouldRebuildEverything) {
            rebuildEverything();
            return CHANGED;
        }
        if (changes.reportIDs.size === 0 && changes.accountIDs.size === 0) {
            return UNCHANGED;
        }

        // Rebuilding a report can hand an account a DM report or take it away, and a contact's own text says
        // whether it has one, so the accounts that were remapped are rebuilt together with the changed ones.
        const remappedAccountIDs = new Set<number>();
        for (const reportID of changes.reportIDs) {
            rebuildReportRow(reportID, remappedAccountIDs);
        }
        for (const accountID of new Set([...changes.accountIDs, ...remappedAccountIDs])) {
            rebuildContactRow(accountID);
        }
        return CHANGED;
    }

    rebuildEverything();

    return {reportRows, contactRows, dmReportIDByAccountID, update, getInputs: () => inputs};
}

export default createOptionIndex;
export type {OptionIndex};
