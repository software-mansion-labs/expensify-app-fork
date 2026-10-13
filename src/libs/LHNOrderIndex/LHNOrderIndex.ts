import type {LHNOrderComparator} from './createLHNOrderComparator';
import type {LHNOrder, LHNOrderInputs, LHNOrderRow} from './types';

import collectLHNOrderChanges from './collectLHNOrderChanges';
import createLHNOrderComparator from './createLHNOrderComparator';

const EMPTY_ORDER: LHNOrder = {reportIDs: [], todoReportIDs: [], unreadReportIDs: [], oldestUnreadActionCreated: undefined};

function toReportID(row: LHNOrderRow): string {
    return row.reportID;
}

/**
 * The LHN order kept as three sorted lists: every displayed report and the two Inbox tabs. An update rebuilds the
 * rows whose inputs changed and moves each changed row to where it now belongs by binary search, so a write to one
 * report costs a pass over the displayed keys and a few splices instead of sorting every displayed report.
 *
 * The order depends only on the latest inputs, never on the ones before, so a render React throws away is harmless.
 */
class LHNOrderIndex {
    private readonly rows = new Map<string, LHNOrderRow>();

    private ordered: LHNOrderRow[] = [];

    private todo: LHNOrderRow[] = [];

    private unread: LHNOrderRow[] = [];

    private inputs: LHNOrderInputs | undefined;

    private compare: LHNOrderComparator | undefined;

    private order: LHNOrder = EMPTY_ORDER;

    /** Returns the order for the inputs, which is the previous order object when no row changed. */
    update(inputs: LHNOrderInputs): LHNOrder {
        const previous = this.inputs;
        const {changedRows, removedKeys} = collectLHNOrderChanges(previous, inputs, this.rows);
        this.inputs = inputs;

        if (!previous || !this.compare || previous.isInDefaultMode !== inputs.isInDefaultMode || previous.localeCompare !== inputs.localeCompare) {
            this.compare = createLHNOrderComparator(inputs.isInDefaultMode, inputs.localeCompare);
            for (const key of removedKeys) {
                this.rows.delete(key);
            }
            for (const [key, row] of changedRows) {
                this.rows.set(key, row);
            }
            this.sortEveryList(this.compare);
        } else if (changedRows.size > 0 || removedKeys.length > 0) {
            for (const key of removedKeys) {
                this.removeRow(key, this.compare);
            }
            for (const [key, row] of changedRows) {
                this.removeRow(key, this.compare);
                this.insertRow(key, row, this.compare);
            }
        } else {
            return this.order;
        }

        this.order = this.createOrder();
        return this.order;
    }

    private sortEveryList(compare: LHNOrderComparator) {
        this.ordered = [...this.rows.values()].sort(compare);
        this.todo = this.ordered.filter((row) => row.isTodo);
        this.unread = this.ordered.filter((row) => row.isUnread);
    }

    private insertRow(key: string, row: LHNOrderRow, compare: LHNOrderComparator) {
        this.rows.set(key, row);
        insertSorted(this.ordered, row, compare);
        if (row.isTodo) {
            insertSorted(this.todo, row, compare);
        }
        if (row.isUnread) {
            insertSorted(this.unread, row, compare);
        }
    }

    private removeRow(key: string, compare: LHNOrderComparator) {
        const row = this.rows.get(key);
        if (!row) {
            return;
        }
        this.rows.delete(key);
        removeSorted(this.ordered, row, compare);
        if (row.isTodo) {
            removeSorted(this.todo, row, compare);
        }
        if (row.isUnread) {
            removeSorted(this.unread, row, compare);
        }
    }

    private createOrder(): LHNOrder {
        let oldestUnreadActionCreated: string | undefined;
        for (const row of this.unread) {
            if (oldestUnreadActionCreated === undefined || row.lastVisibleActionCreated < oldestUnreadActionCreated) {
                oldestUnreadActionCreated = row.lastVisibleActionCreated;
            }
        }
        return {
            reportIDs: this.ordered.map(toReportID),
            todoReportIDs: this.todo.map(toReportID),
            unreadReportIDs: this.unread.map(toReportID),
            oldestUnreadActionCreated,
        };
    }
}

/** The first position whose row does not come before the given row. */
function findPosition(rows: readonly LHNOrderRow[], row: LHNOrderRow, compare: LHNOrderComparator): number {
    let low = 0;
    let high = rows.length;
    while (low < high) {
        const middle = Math.floor((low + high) / 2);
        const other = rows.at(middle);
        if (other && compare(other, row) < 0) {
            low = middle + 1;
        } else {
            high = middle;
        }
    }
    return low;
}

function insertSorted(rows: LHNOrderRow[], row: LHNOrderRow, compare: LHNOrderComparator) {
    rows.splice(findPosition(rows, row, compare), 0, row);
}

function removeSorted(rows: LHNOrderRow[], row: LHNOrderRow, compare: LHNOrderComparator) {
    // The comparator is a total order, so the binary search lands on the row itself.
    const position = findPosition(rows, row, compare);
    const index = rows.at(position) === row ? position : rows.indexOf(row);
    if (index !== -1) {
        rows.splice(index, 1);
    }
}

export default LHNOrderIndex;
