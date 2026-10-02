import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {PersonalDetails, Report} from '@src/types/onyx';

import type {OptionIndexRow, SearchOptionsIndexInputs} from './types';

import buildContactIndexRow from './buildContactIndexRow';
import buildReportIndexRow from './buildReportIndexRow';
import collectIndexChanges, {hasSharedInputChanged} from './collectIndexChanges';

type UpdateResult = {
    /** Whether any row was rebuilt, added or removed, so a result computed before the update may be stale. */
    hasChanged: boolean;
};

type CreateOptionIndexOptions = {
    /** When true, rows are not built during creation and must be populated via `buildChunk` or `flush`. */
    deferPopulation?: boolean;
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

    /** Builds pending items until `budget` is spent, or all of them without one. Returns true once all are indexed. */
    buildChunk: (budget?: BuildChunkBudget) => boolean;

    /** Flushes any remaining pending items synchronously. */
    flush: () => void;

    /** Whether the index has completed its full initial population. */
    isFullyBuilt: () => boolean;

    /** Whether queries can be answered from the rows as they are: fully built, or rebuilding invalidated rows in the background. */
    canAnswer: () => boolean;
};

/** How much of the build one `buildChunk` call may do. Without either bound, it builds everything that is left. */
type BuildChunkBudget = {
    /** Stop once this much time has passed since the call started, which adapts a chunk to the device's speed. */
    timeBudgetMs?: number;

    /** Stop after this many reports and contacts. Deterministic, which is what tests need. */
    maxItems?: number;
};

/** How many items are built between two reads of the clock, so checking the time budget stays negligible. */
const DEADLINE_CHECK_INTERVAL = 8;

/**
 * The most changed rows reconciled synchronously, in the caller's frame. Up to this many stay well under a frame
 * on any device; a larger diff is rebuilt in chunks instead. An absolute count rather than a share of the index,
 * because a frame's budget does not grow with the account: a share would let the largest accounts, which this
 * index exists for, reconcile thousands of rows in one frame.
 */
const MAX_SYNC_RECONCILE_ROWS = 50;

const UNCHANGED: UpdateResult = {hasChanged: false};
const CHANGED: UpdateResult = {hasChanged: true};

/**
 * Starts a build loop's budget and returns whether it is spent after `builtItems` items. It always lets at least one
 * item through, so a spent budget still makes progress, and reads the clock only every `DEADLINE_CHECK_INTERVAL` items.
 */
function startBudget({maxItems = Number.POSITIVE_INFINITY, timeBudgetMs}: BuildChunkBudget): (builtItems: number) => boolean {
    const deadline = timeBudgetMs === undefined ? undefined : performance.now() + timeBudgetMs;
    return (builtItems) => builtItems > 0 && (builtItems >= maxItems || (deadline !== undefined && builtItems % DEADLINE_CHECK_INTERVAL === 0 && performance.now() >= deadline));
}

/** Builds the whole index from one snapshot. Later snapshots go through `update`, which rebuilds far less. */
function createOptionIndex(initialInputs: SearchOptionsIndexInputs, options?: CreateOptionIndexOptions): OptionIndex {
    const reportRows = new Map<string, OptionIndexRow>();
    const contactRows = new Map<string, OptionIndexRow>();
    const dmReportIDByAccountID = new Map<number, string>();

    /** Every live 1:1 DM of each account, in the order the index first saw them. The first one is the one its contact shows. */
    const dmReportIDsByAccountID = new Map<number, Set<string>>();
    const dmAccountIDByReportID = new Map<string, number>();
    let inputs = initialInputs;

    /** What the build goes through, reports then contacts, collected from `inputs` by its first chunk, and how far it got. */
    let pendingReports: Report[] | undefined;
    let pendingPersonalDetails: PersonalDetails[] | undefined;
    let buildCursor = 0;
    let fullyBuilt = false;

    /** The newest snapshots fed while the build was running. The build finishes on `inputs`, then catches up to these. */
    let latestInputs: SearchOptionsIndexInputs | undefined;

    /** Rows invalidated by a diff too large to reconcile synchronously, or by a full refresh, rebuilt by buildChunk while every row keeps answering. */
    let dirtyReportIDs: string[] = [];
    let dirtyAccountIDs: number[] = [];
    let dirtyCursor = 0;
    const dirtyRemappedAccountIDs = new Set<number>();

    /** Whether every row is invalid and the next drain chunk has to queue all of them, which it collects from `inputs`. */
    let isFullRefreshPending = false;
    /** Whether a first full build completed since the last reset, so queries can be answered from the rows as they are. */
    let hasBuiltOnce = false;

    /**
     * Points the contact of an account at the first live 1:1 DM the index knows for it, or at none. Runs whenever
     * the account gains or loses a DM, so losing the DM it shows falls back to another live one.
     */
    function refreshDisplayedDM(accountID: number, remappedAccountIDs: Set<number>) {
        const reportIDs = dmReportIDsByAccountID.get(accountID);
        if (reportIDs?.size === 0) {
            dmReportIDsByAccountID.delete(accountID);
        }
        const displayedReportID = reportIDs?.values().next().value;
        if (dmReportIDByAccountID.get(accountID) === displayedReportID) {
            return;
        }
        if (displayedReportID === undefined) {
            dmReportIDByAccountID.delete(accountID);
        } else {
            dmReportIDByAccountID.set(accountID, displayedReportID);
        }
        remappedAccountIDs.add(accountID);
    }

    /**
     * Records which account, if any, a report is the 1:1 DM of. An account keeps showing the DM it already shows
     * while that report stays one, so an edit never flips it; where an account has several live 1:1 DMs the first
     * one the index saw is shown, while today's path keeps the last one of the snapshot.
     */
    function setDMMapping(reportID: string, dmAccountID: number | undefined, remappedAccountIDs: Set<number>) {
        const previousAccountID = dmAccountIDByReportID.get(reportID);
        if (previousAccountID === dmAccountID) {
            return;
        }
        if (previousAccountID !== undefined) {
            dmAccountIDByReportID.delete(reportID);
            dmReportIDsByAccountID.get(previousAccountID)?.delete(reportID);
            refreshDisplayedDM(previousAccountID, remappedAccountIDs);
        }
        if (dmAccountID === undefined) {
            return;
        }
        dmAccountIDByReportID.set(reportID, dmAccountID);
        const reportIDs = dmReportIDsByAccountID.get(dmAccountID) ?? new Set<string>();
        reportIDs.add(reportID);
        dmReportIDsByAccountID.set(dmAccountID, reportIDs);
        refreshDisplayedDM(dmAccountID, remappedAccountIDs);
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

    /**
     * Drops every row and queues a build from `inputs`. It does not walk the snapshots, so it is cheap wherever it
     * runs, including in the effect that feeds the router as it opens: the first chunk collects what to build.
     */
    function resetBuild() {
        reportRows.clear();
        contactRows.clear();
        dmReportIDByAccountID.clear();
        dmReportIDsByAccountID.clear();
        dmAccountIDByReportID.clear();
        pendingReports = undefined;
        pendingPersonalDetails = undefined;
        buildCursor = 0;
        fullyBuilt = false;
        hasBuiltOnce = false;
        dirtyReportIDs = [];
        dirtyAccountIDs = [];
        dirtyCursor = 0;
        dirtyRemappedAccountIDs.clear();
        isFullRefreshPending = false;
    }

    /** Leaves these rows for the drain to rebuild, while every row, these included, keeps answering until then. */
    function queueDirty(reportIDs: string[], accountIDs: number[]) {
        dirtyReportIDs = reportIDs;
        dirtyAccountIDs = accountIDs;
        dirtyCursor = 0;
        dirtyRemappedAccountIDs.clear();
        fullyBuilt = false;
    }

    /**
     * Leaves every row for the drain to rebuild, for snapshots that invalidate all of them. Unlike `resetBuild` the
     * rows keep answering meanwhile, so a query never has to rebuild the whole index in its own frame. Like it, this
     * walks no snapshot: the first drain chunk collects the rows.
     */
    function queueFullRefresh() {
        queueDirty([], []);
        isFullRefreshPending = true;
    }

    /** Queues every row the index holds or `inputs` may produce, so a full refresh also drops the rows that left them. */
    function queueEveryRow() {
        const reportIDs = new Set(reportRows.keys());
        for (const key of Object.keys(inputs.reports ?? {})) {
            reportIDs.add(key.slice(ONYXKEYS.COLLECTION.REPORT.length));
        }
        const accountIDs = new Set([...contactRows.keys(), ...Object.keys(inputs.personalDetails ?? {})].map(Number));
        queueDirty([...reportIDs], [...accountIDs]);
    }

    /**
     * Rebuilds the rows queued as dirty, by a diff too large to reconcile synchronously or by a full refresh, one
     * budget's worth at a time, while every other row keeps answering. Reports drain before accounts because
     * rebuilding a report can hand an account a new DM mapping (or take one away), which its own contact row then
     * has to reflect.
     */
    function drainDirty(budget: BuildChunkBudget): boolean {
        // Like the first chunk of a first build, collecting what to rebuild is the whole of this chunk.
        if (isFullRefreshPending) {
            isFullRefreshPending = false;
            queueEveryRow();
            return false;
        }

        const isBudgetSpent = startBudget(budget);
        for (let builtItems = 0; dirtyCursor < dirtyReportIDs.length + dirtyAccountIDs.length; builtItems++, dirtyCursor++) {
            if (isBudgetSpent(builtItems)) {
                return false;
            }
            const reportID = dirtyReportIDs.at(dirtyCursor);
            if (reportID === undefined) {
                rebuildContactRow(dirtyAccountIDs.at(dirtyCursor - dirtyReportIDs.length) ?? CONST.DEFAULT_NUMBER_ID);
                continue;
            }
            rebuildReportRow(reportID, dirtyRemappedAccountIDs);
        }

        // Every dirty report and account is rebuilt: also rebuild the contacts a rebuilt report remapped a DM to or
        // away from, since a contact's own row says whether it has one.
        for (const accountID of dirtyRemappedAccountIDs) {
            rebuildContactRow(accountID);
        }
        dirtyReportIDs = [];
        dirtyAccountIDs = [];
        dirtyCursor = 0;
        dirtyRemappedAccountIDs.clear();
        return completeBuild();
    }

    /** Marks the build or drain done, then catches up to the snapshots fed while it ran. */
    function completeBuild(): boolean {
        fullyBuilt = true;
        if (latestInputs) {
            const next = latestInputs;
            latestInputs = undefined;
            applyChanges(next);
        }
        return fullyBuilt;
    }

    function buildChunk(budget: BuildChunkBudget = {}): boolean {
        if (fullyBuilt) {
            return true;
        }
        // A first full build already completed: any pending invalidation is a dirty queue, drained in place of a
        // fresh walk of the snapshots, so the rows that are not dirty keep answering while these are rebuilt.
        if (hasBuiltOnce) {
            return drainDirty(budget);
        }
        // Snapshot order: a partly built index never answers a query (it is flushed first), so the order the rows are
        // built in does not matter, and it is the order today's option list walks the reports in.
        // Decouple the gathering of pending snapshots from building records. If the first call must execute
        // Object.values/filter, it only prepares the pending lists and returns false so building does not exceed its frame budget.
        if (pendingReports === undefined || pendingPersonalDetails === undefined) {
            pendingReports = Object.values(inputs.reports ?? {}).filter((report): report is Report => !!report);
            pendingPersonalDetails = Object.values(inputs.personalDetails ?? {}).filter((detail): detail is PersonalDetails => !!detail);
            return false;
        }

        const isBudgetSpent = startBudget(budget);
        for (let builtItems = 0; buildCursor < pendingReports.length + pendingPersonalDetails.length; builtItems++, buildCursor++) {
            if (isBudgetSpent(builtItems)) {
                return false;
            }
            const report = pendingReports.at(buildCursor);
            if (!report) {
                rebuildContactRow(pendingPersonalDetails.at(buildCursor - pendingReports.length)?.accountID ?? CONST.DEFAULT_NUMBER_ID);
                continue;
            }
            const entry = buildReportIndexRow(report, inputs);
            if (entry) {
                reportRows.set(entry.row.id, entry.row);
                setDMMapping(report.reportID, entry.dmAccountID, new Set());
            }
        }

        hasBuiltOnce = true;
        pendingReports = undefined;
        pendingPersonalDetails = undefined;
        return completeBuild();
    }

    function flush() {
        while (!fullyBuilt) {
            buildChunk();
        }
    }

    /** Rebuilds the rows of a fully built index that the next snapshots invalidate. */
    function applyChanges(next: SearchOptionsIndexInputs): UpdateResult {
        const changes = collectIndexChanges(inputs, next, dmReportIDsByAccountID);
        inputs = next;

        if (changes.shouldRebuildEverything) {
            queueFullRefresh();
            return CHANGED;
        }

        if (changes.reportIDs.size + changes.accountIDs.size > MAX_SYNC_RECONCILE_ROWS) {
            // Diff is too large to reconcile synchronously: keep answering from the rows as they are instead of
            // clearing them, and rebuild only the invalidated ones, in chunks, off the caller's frame. Entered only
            // from a fully built index, so no dirty queue is replaced here.
            queueDirty([...changes.reportIDs], [...changes.accountIDs]);
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

    function update(next: SearchOptionsIndexInputs): UpdateResult {
        if (fullyBuilt) {
            return applyChanges(next);
        }
        // Nothing has ever been built (a fresh, deferred index whose first chunk has not even collected what to
        // build): adopt the newest snapshots instead of diffing later. This has to run before the shared-input
        // check below, because once a first build has completed `pendingReports` stays undefined forever, and this
        // branch must not fire again for a dirty drain, where adopting `next` without diffing would leave rows
        // built from older inputs stale forever.
        if (!hasBuiltOnce && pendingReports === undefined) {
            inputs = next;
            latestInputs = undefined;
            return UNCHANGED;
        }
        // A shared input invalidates every row built so far. Mid the first build nothing answers yet, so starting
        // over is cheapest. Mid a drain the rows answer, so they keep answering while all of them are rebuilt,
        // which also replaces the dirty queue.
        if (hasSharedInputChanged(inputs, next)) {
            inputs = next;
            latestInputs = undefined;
            if (hasBuiltOnce) {
                queueFullRefresh();
            } else {
                resetBuild();
            }
            return CHANGED;
        }
        // Mid the first build or a drain: keep what is built, and reconcile once it finishes instead of diffing against
        // a build-start snapshot that no longer describes what is being built.
        latestInputs = next;
        return UNCHANGED;
    }

    // A deferred index starts out empty with its build queued, and walks nothing until its first chunk.
    if (!options?.deferPopulation) {
        flush();
    }

    return {
        reportRows,
        contactRows,
        dmReportIDByAccountID,
        update,
        getInputs: () => inputs,
        buildChunk,
        flush,
        isFullyBuilt: () => fullyBuilt,
        canAnswer: () => fullyBuilt || hasBuiltOnce,
    };
}

export default createOptionIndex;
export {DEADLINE_CHECK_INTERVAL, MAX_SYNC_RECONCILE_ROWS};
export type {BuildChunkBudget, OptionIndex};
