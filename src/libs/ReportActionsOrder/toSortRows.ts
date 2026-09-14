import {getDEWRoutedActionFor} from '@libs/ReportActionsUtils';
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

/**
 * Every row one Onyx member contributes to the order. A Dynamic External Workflow submit or forward contributes
 * a second row for the routed action the display list expands it into, so SQL orders that action too instead of
 * leaving a JS re-sort behind.
 */
function toActionSortRows(id: string, reportAction: ReportAction): SortRow[] {
    const routedAction = getDEWRoutedActionFor(reportAction);
    if (!routedAction) {
        return [toSortRow(id, reportAction)];
    }
    return [toSortRow(id, reportAction), {...toSortRow(routedAction.reportActionID, routedAction), parentID: id}];
}

function toSortRows(reportActions: ReportActionsInput): SortRow[] {
    const rows: SortRow[] = [];
    for (const [id, reportAction] of Object.entries(reportActions)) {
        if (reportAction) {
            rows.push(...toActionSortRows(id, reportAction));
        }
    }
    return rows;
}

export default toSortRows;
export {toSortRow, toActionSortRows};
export type {ReportActionsInput};
