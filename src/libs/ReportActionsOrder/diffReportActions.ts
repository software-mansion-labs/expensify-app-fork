import type {SortRow} from '@libs/SqlEngine/wasm/protocol';

import type {ReportActionsInput} from './toSortRows';

import toSortRows, {toSortRow} from './toSortRows';

type ReportActionsDiff = {
    upserts: SortRow[];
    deletes: string[];
    /** When true the worker must replace every row of the report before applying the upserts. */
    full: boolean;
};

const EMPTY_DIFF: ReportActionsDiff = {upserts: [], deletes: [], full: false};

function isDiffEmpty(diff: ReportActionsDiff): boolean {
    return !diff.full && diff.upserts.length === 0 && diff.deletes.length === 0;
}

/**
 * Diffs two consecutive `reportActions_<id>` values by member reference. Onyx keeps untouched members
 * referentially equal across a merge (see `repo/wasm-onyx/poc-report-actions/SPIKE-identity.md`), so a
 * one-action change on a long report costs one pointer comparison per member and produces one row.
 * Members whose sort keys did not move produce no row at all, because rows carry only the sort keys.
 */
function diffReportActions(previous: ReportActionsInput | undefined, next: ReportActionsInput): ReportActionsDiff {
    if (!previous) {
        return {upserts: toSortRows(next), deletes: [], full: true};
    }

    if (previous === next) {
        return EMPTY_DIFF;
    }

    const upserts: SortRow[] = [];
    const deletes: string[] = [];

    for (const [id, nextAction] of Object.entries(next)) {
        const previousAction = previous[id];

        if (!nextAction) {
            if (previousAction) {
                deletes.push(id);
            }
            continue;
        }

        if (previousAction === nextAction) {
            continue;
        }

        if (previousAction && previousAction.created === nextAction.created && previousAction.actionName === nextAction.actionName) {
            continue;
        }

        upserts.push(toSortRow(id, nextAction));
    }

    for (const [id, previousAction] of Object.entries(previous)) {
        if (previousAction && !(id in next)) {
            deletes.push(id);
        }
    }

    return {upserts, deletes, full: false};
}

export default diffReportActions;
export {isDiffEmpty};
export type {ReportActionsDiff};
