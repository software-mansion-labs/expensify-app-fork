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

/**
 * The reports whose derived attributes changed, plus the one-transaction threads those attributes named before or
 * name now, because a thread's row reads whether its parent's attributes name it.
 */
function collectReportIDsOfChangedAttributes(previous: SearchOptionsIndexInputs, next: SearchOptionsIndexInputs): string[] {
    const reportIDs: string[] = [];
    for (const reportID of collectChangedKeys(previous.reportAttributes, next.reportAttributes)) {
        reportIDs.push(reportID);
        for (const threadReportID of [previous.reportAttributes?.[reportID]?.oneTransactionThreadReportID, next.reportAttributes?.[reportID]?.oneTransactionThreadReportID]) {
            if (threadReportID) {
                reportIDs.push(threadReportID);
            }
        }
    }
    return reportIDs;
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
 * changed, when its parent's derived attributes start or stop naming it as their one-transaction thread, and when
 * it is one of the 1:1 DMs of a contact whose details changed. A contact is rebuilt when its details changed. A
 * login changing under a group chat does not rebuild that chat's row, because the index has no participant to
 * report mapping to find it by.
 */
function collectIndexChanges(previous: SearchOptionsIndexInputs, next: SearchOptionsIndexInputs, dmReportIDsByAccountID: ReadonlyMap<number, ReadonlySet<string>>): IndexChanges {
    if (hasSharedInputChanged(previous, next)) {
        return REBUILD_EVERYTHING;
    }

    const reportIDs = new Set<string>([
        ...collectChangedKeys(previous.reports, next.reports).map((key) => stripPrefix(key, ONYXKEYS.COLLECTION.REPORT)),
        ...collectReportIDsOfChangedAttributes(previous, next),
        ...collectChangedKeys(previous.privateIsArchivedMap, next.privateIsArchivedMap).map((key) => stripPrefix(key, ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS)),
        ...collectReportIDsOfChangedPolicies(previous, next),
    ]);
    const accountIDs = new Set<number>();

    for (const key of collectChangedKeys(previous.personalDetails, next.personalDetails)) {
        const accountID = Number(key);
        accountIDs.add(accountID);
        // Every DM of the account, not only the one its contact shows: any of them can become the shown one.
        for (const dmReportID of dmReportIDsByAccountID.get(accountID) ?? []) {
            reportIDs.add(dmReportID);
        }
    }

    return {shouldRebuildEverything: false, reportIDs, accountIDs};
}

export default collectIndexChanges;
export {hasSharedInputChanged};
