import type {SortRow} from '@libs/SqlEngine/wasm/protocol';

import type {ReportAction} from '@src/types/onyx';

/** Onyx types every member as present, but a member merged away is nullish at runtime until the key is rewritten. */
type ReportActionsInput = Record<string, ReportAction | null | undefined>;

/** The row id is the Onyx member key, which is the `reportActionID` the JS comparator falls back on. */
function toSortRow(id: string, reportAction: ReportAction): SortRow {
    return {
        id,
        created: reportAction.created,
        actionName: reportAction.actionName,
    };
}

function toSortRows(reportActions: ReportActionsInput): SortRow[] {
    const rows: SortRow[] = [];
    for (const [id, reportAction] of Object.entries(reportActions)) {
        if (reportAction) {
            rows.push(toSortRow(id, reportAction));
        }
    }
    return rows;
}

export default toSortRows;
export {toSortRow};
export type {ReportActionsInput};
