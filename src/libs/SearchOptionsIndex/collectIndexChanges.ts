import ONYXKEYS from '@src/ONYXKEYS';

import type {SearchOptionsIndexInputs} from './types';

const REBUILD_ALL = 'all';

type IndexChanges = {
    reportIDs: Set<string>;
    accountIDs: Set<number>;
};

/** Which reports and contacts must be rebuilt for the next inputs, or everything when no cheap diff exists. */
type IndexChangeSet = IndexChanges | typeof REBUILD_ALL;

function isInputScalarChanged(previous: SearchOptionsIndexInputs, next: SearchOptionsIndexInputs): boolean {
    return (
        previous.conciergeReportID !== next.conciergeReportID ||
        previous.currentUserAccountID !== next.currentUserAccountID ||
        previous.locale !== next.locale ||
        previous.translate !== next.translate
    );
}

/** Keys whose member reference differs, plus keys present on only one side. Onyx keeps untouched members' identity. */
function collectChangedKeys<TValue>(previous: Record<string, TValue> | undefined, next: Record<string, TValue> | undefined): string[] {
    if (previous === next) {
        return [];
    }
    const changed: string[] = [];
    for (const key of Object.keys(next ?? {})) {
        if (next?.[key] !== previous?.[key]) {
            changed.push(key);
        }
    }
    for (const key of Object.keys(previous ?? {})) {
        if (!next || !(key in next)) {
            changed.push(key);
        }
    }
    return changed;
}

function stripPrefix(key: string, prefix: string): string {
    return key.startsWith(prefix) ? key.slice(prefix.length) : key;
}

/**
 * Diffs two input snapshots by reference. A report is rebuilt when the report itself, its derived attributes,
 * its archived flag or its policy changed, and when it is the 1:1 DM of a contact whose details changed. A contact
 * is rebuilt when its details changed. Participant logins changing under a group chat are not tracked, which the
 * runtime guard is there to count.
 */
function collectIndexChanges(previous: SearchOptionsIndexInputs | undefined, next: SearchOptionsIndexInputs, dmReportIDByAccountID: ReadonlyMap<number, string>): IndexChangeSet {
    if (!previous || isInputScalarChanged(previous, next)) {
        return REBUILD_ALL;
    }

    const reportIDs = new Set<string>();
    const accountIDs = new Set<number>();

    for (const key of collectChangedKeys(previous.reports, next.reports)) {
        reportIDs.add(stripPrefix(key, ONYXKEYS.COLLECTION.REPORT));
    }
    for (const reportID of collectChangedKeys(previous.reportAttributes, next.reportAttributes)) {
        reportIDs.add(reportID);
    }
    for (const key of collectChangedKeys(previous.privateIsArchivedMap, next.privateIsArchivedMap)) {
        reportIDs.add(stripPrefix(key, ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS));
    }

    const changedPolicyIDs = new Set(collectChangedKeys(previous.policies, next.policies).map((key) => stripPrefix(key, ONYXKEYS.COLLECTION.POLICY)));
    if (changedPolicyIDs.size > 0) {
        for (const report of Object.values(next.reports ?? {})) {
            if (report?.policyID && changedPolicyIDs.has(report.policyID)) {
                reportIDs.add(report.reportID);
            }
        }
    }

    for (const key of collectChangedKeys(previous.personalDetails, next.personalDetails)) {
        const accountID = Number(key);
        accountIDs.add(accountID);
        const dmReportID = dmReportIDByAccountID.get(accountID);
        if (dmReportID) {
            reportIDs.add(dmReportID);
        }
    }

    return {reportIDs, accountIDs};
}

export default collectIndexChanges;
export {REBUILD_ALL};
export type {IndexChangeSet, IndexChanges};
