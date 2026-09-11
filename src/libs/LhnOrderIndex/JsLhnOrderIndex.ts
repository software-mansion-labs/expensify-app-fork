import type {LhnIndexRow, LhnPriorityMode} from '@libs/SqlEngine/wasm/protocol';

import compareLhnRows from './compareLhnRows';

type LhnOrderLists = {
    reportIDs: string[];
    unreadReportIDs: string[];
    todoReportIDs: string[];
};

/**
 * The LHN order kept in JS, as three sorted lists of report ids: the sidebar's own order and the two Inbox tabs.
 * A write takes the one row it changed out of every list it is in and puts it back where it now belongs, both
 * found by binary search, so an incoming message costs `log2(n)` comparisons and one block
 * move of the tail instead of categorizing and sorting the whole displayed set.
 *
 * The order is the one `./compareLhnRows.ts` defines, which is the engine's `ORDER BY`, so this arm of the POC and
 * the SQL arm are comparable row for row.
 */
class JsLhnOrderIndex {
    private readonly rows = new Map<string, LhnIndexRow>();

    private order: string[] = [];

    private unread: string[] = [];

    private todo: string[] = [];

    private priorityMode: LhnPriorityMode = 'default';

    /** Removals that did not find their row where the order said it was. Stays at zero while the lists are sound. */
    private repairCount = 0;

    getRow(reportID: string): LhnIndexRow | undefined {
        return this.rows.get(reportID);
    }

    getRowCount(): number {
        return this.rows.size;
    }

    getRepairCount(): number {
        return this.repairCount;
    }

    /** Replaces every row and sorts once: the first feed, and the only way back from a corrupted list. */
    reset(rows: readonly LhnIndexRow[], priorityMode: LhnPriorityMode) {
        this.rows.clear();
        for (const row of rows) {
            this.rows.set(row.reportID, row);
        }
        this.priorityMode = priorityMode;
        this.sortEveryList();
    }

    /** Switching between the default and focus mode reorders everything, so it is the one action that sorts again. */
    setPriorityMode(priorityMode: LhnPriorityMode) {
        if (this.priorityMode === priorityMode) {
            return;
        }
        this.priorityMode = priorityMode;
        this.sortEveryList();
    }

    upsert(row: LhnIndexRow) {
        const previous = this.rows.get(row.reportID);
        if (previous) {
            this.removeRow(previous);
        }
        this.rows.set(row.reportID, row);
        this.insertInto(this.order, row);
        if (row.isUnread) {
            this.insertInto(this.unread, row);
        }
        if (row.isTodo) {
            this.insertInto(this.todo, row);
        }
    }

    remove(reportID: string): boolean {
        const previous = this.rows.get(reportID);
        if (!previous) {
            return false;
        }
        this.removeRow(previous);
        this.rows.delete(reportID);
        return true;
    }

    /** The three lists as the sidebar renders them. Copies, because the caller keeps the previous order rendered. */
    getLists(): LhnOrderLists {
        return {reportIDs: [...this.order], unreadReportIDs: [...this.unread], todoReportIDs: [...this.todo]};
    }

    private sortEveryList() {
        const sorted = Array.from(this.rows.values()).sort((first, second) => compareLhnRows(first, second, this.priorityMode));
        this.order = sorted.map((row) => row.reportID);
        this.unread = sorted.filter((row) => row.isUnread).map((row) => row.reportID);
        this.todo = sorted.filter((row) => row.isTodo).map((row) => row.reportID);
    }

    /**
     * The position `row` belongs at in `ids`: the first one whose row does not come before it. Because the
     * comparator ends on the report id, a row that is already in the list is found at exactly its own position.
     */
    private locate(ids: readonly string[], row: LhnIndexRow): number {
        let low = 0;
        let high = ids.length;
        while (low < high) {
            const middle = Math.floor((low + high) / 2);
            const other = this.rows.get(ids.at(middle) ?? '');
            if (other && compareLhnRows(other, row, this.priorityMode) < 0) {
                low = middle + 1;
            } else {
                high = middle;
            }
        }
        return low;
    }

    private insertInto(ids: string[], row: LhnIndexRow) {
        ids.splice(this.locate(ids, row), 0, row.reportID);
    }

    private removeFrom(ids: string[], row: LhnIndexRow) {
        const index = this.locate(ids, row);
        if (ids.at(index) === row.reportID) {
            ids.splice(index, 1);
            return;
        }
        const fallback = ids.indexOf(row.reportID);
        if (fallback === -1) {
            return;
        }
        this.repairCount += 1;
        ids.splice(fallback, 1);
    }

    private removeRow(row: LhnIndexRow) {
        this.removeFrom(this.order, row);
        if (row.isUnread) {
            this.removeFrom(this.unread, row);
        }
        if (row.isTodo) {
            this.removeFrom(this.todo, row);
        }
    }
}

export default JsLhnOrderIndex;
export type {LhnOrderLists};
