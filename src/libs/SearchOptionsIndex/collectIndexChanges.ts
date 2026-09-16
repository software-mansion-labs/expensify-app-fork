import ONYXKEYS from '@src/ONYXKEYS';

import type {SearchOptionsIndexInputs} from './types';

/** Which rows the next snapshots invalidate, or that no cheap answer exists and every row has to be rebuilt. */
type IndexChanges = {shouldRebuildEverything: true} | {shouldRebuildEverything: false; reportIDs: Set<string>; accountIDs: Set<number>};

const REBUILD_EVERYTHING: IndexChanges = {shouldRebuildEverything: true};

/**
 * Inputs that are read while building any row, so a change to one of them invalidates all of them. `rules` is
 * here because a rule decides who an expense chat submits to, which is part of that chat's subtitle.
 */
function hasSharedInputChanged(previous: SearchOptionsIndexInputs, next: SearchOptionsIndexInputs): boolean {
    return (
        previous.conciergeReportID !== next.conciergeReportID ||
        previous.currentUserAccountID !== next.currentUserAccountID ||
        previous.locale !== next.locale ||
        previous.translate !== next.translate ||
        previous.rules !== next.rules
    );
}

/** Keys whose member is a different object than before, plus the keys present on only one of the two sides. */
function collectChangedKeys<TValue>(previous: Record<string, TValue> | undefined, next: Record<string, TValue> | undefined): string[] {
    if (previous === next) {
        return [];
    }
    const changedKeys: string[] = [];
    for (const key of Object.keys(next ?? {})) {
        if (next?.[key] !== previous?.[key]) {
            changedKeys.push(key);
        }
    }
    for (const key of Object.keys(previous ?? {})) {
        if (!next || !(key in next)) {
            changedKeys.push(key);
        }
    }
    return changedKeys;
}

function stripPrefix(key: string, prefix: string): string {
    return key.startsWith(prefix) ? key.slice(prefix.length) : key;
}

/** Reports of the policies whose own snapshot changed, because a policy feeds the subtitle of its chats. */
function collectReportIDsOfChangedPolicies(previous: SearchOptionsIndexInputs, next: SearchOptionsIndexInputs): string[] {
    const changedPolicyIDs = new Set(collectChangedKeys(previous.policies, next.policies).map((key) => stripPrefix(key, ONYXKEYS.COLLECTION.POLICY)));
    if (changedPolicyIDs.size === 0) {
        return [];
    }

    const reportIDs: string[] = [];
    for (const report of Object.values(next.reports ?? {})) {
        if (report?.policyID && changedPolicyIDs.has(report.policyID)) {
            reportIDs.push(report.reportID);
        }
    }
    return reportIDs;
}

/**
 * Diffs two input snapshots by reference, which Onyx makes possible by keeping the identity of the members it did
 * not write. A report is rebuilt when the report itself, its derived attributes, its archived flag or its policy
 * changed, and when it is the 1:1 DM of a contact whose details changed. A contact is rebuilt when its details
 * changed. A login changing under a group chat does not rebuild that chat's row, because the index has no
 * participant to report mapping to find it by.
 */
function collectIndexChanges(previous: SearchOptionsIndexInputs, next: SearchOptionsIndexInputs, dmReportIDByAccountID: ReadonlyMap<number, string>): IndexChanges {
    if (hasSharedInputChanged(previous, next)) {
        return REBUILD_EVERYTHING;
    }

    const reportIDs = new Set<string>([
        ...collectChangedKeys(previous.reports, next.reports).map((key) => stripPrefix(key, ONYXKEYS.COLLECTION.REPORT)),
        ...collectChangedKeys(previous.reportAttributes, next.reportAttributes),
        ...collectChangedKeys(previous.privateIsArchivedMap, next.privateIsArchivedMap).map((key) => stripPrefix(key, ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS)),
        ...collectReportIDsOfChangedPolicies(previous, next),
    ]);
    const accountIDs = new Set<number>();

    for (const key of collectChangedKeys(previous.personalDetails, next.personalDetails)) {
        const accountID = Number(key);
        accountIDs.add(accountID);
        const dmReportID = dmReportIDByAccountID.get(accountID);
        if (dmReportID) {
            reportIDs.add(dmReportID);
        }
    }

    return {shouldRebuildEverything: false, reportIDs, accountIDs};
}

export default collectIndexChanges;
export type {IndexChanges};
