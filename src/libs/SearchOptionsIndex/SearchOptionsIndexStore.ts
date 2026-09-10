import Log from '@libs/Log';
import {createFilteredOptionList, getSearchOptions, processSearchString} from '@libs/OptionsListUtils';
import type {Options} from '@libs/OptionsListUtils';
import {getEngineOptionsMatcher, ingestOptions, isEngineAvailable, searchOptions, setEngineOptionsMatcher} from '@libs/SqlEngine/EngineClient';
import {getSearchRouterEngineMode, isSearchRouterGuardEnabled} from '@libs/SqlEngine/searchRouterEngineMode';
import type {SearchRouterEngineMode} from '@libs/SqlEngine/searchRouterEngineMode';
import type {OptionIndexRef, OptionIndexRow} from '@libs/SqlEngine/wasm/protocol';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {PersonalDetails} from '@src/types/onyx';

import type {SearchCandidateIDs, SearchOptionsFormatConfig, SearchOptionsIndexInputs} from './types';

import buildCandidateOptionList from './buildCandidateOptionList';
import {buildContactIndexRow, buildReportIndexEntry} from './buildOptionIndexRows';
import collectIndexChanges, {REBUILD_ALL} from './collectIndexChanges';
import matchOptionIndexRows from './matchOptionIndexRows';

/**
 * The matcher returns a few times more candidates than the list shows, because `isValidReport` still runs in JS on
 * the survivors and drops some of them. `underflows` counts how often that slack was not enough.
 */
const CANDIDATE_WINDOW = CONST.AUTO_COMPLETE_SUGGESTER.MAX_AMOUNT_OF_SUGGESTIONS * 5;

/** The SearchRouter's own list configuration, which the guard has to reproduce to compare against today's path. */
const GUARD_MAX_RECENT_REPORTS = 100;

type SearchRequest = {
    query: string;
    formatConfig: SearchOptionsFormatConfig;
};

type SearchOptionsIndexSnapshot = {
    query: string;
    version: number;
    options: Options;
    source: SearchRouterEngineMode;
    candidateReportCount: number;
    candidateContactCount: number;
};

type SearchOptionsIndexStats = {
    feeds: number;
    fullRebuilds: number;
    upsertedRows: number;
    deletedRows: number;
    lastFeedMs: number;
    totalFeedMs: number;
    searches: number;
    engineReplies: number;
    staleReplies: number;
    failures: number;
    /** Results shorter than the list while the matcher reported more matches beyond the candidate window. */
    underflows: number;
    lastFormatMs: number;
    totalSearchMs: number;
    /** Results that differed from today's path, counted only while the guard is on. */
    guardComparisons: number;
    mismatches: number;
    rowCount: number;
};

type IndexUpdate = {
    upserts: OptionIndexRow[];
    deletes: OptionIndexRef[];
    full: boolean;
};

const rows = new Map<string, OptionIndexRow>();
const dmReportIDByAccountID = new Map<number, string>();
const subscribers = new Set<() => void>();

let inputs: SearchOptionsIndexInputs | undefined;
let version = 0;
let request: SearchRequest | undefined;
let snapshot: SearchOptionsIndexSnapshot | undefined;

const stats: SearchOptionsIndexStats = {
    feeds: 0,
    fullRebuilds: 0,
    upsertedRows: 0,
    deletedRows: 0,
    lastFeedMs: 0,
    totalFeedMs: 0,
    searches: 0,
    engineReplies: 0,
    staleReplies: 0,
    failures: 0,
    underflows: 0,
    lastFormatMs: 0,
    totalSearchMs: 0,
    guardComparisons: 0,
    mismatches: 0,
    rowCount: 0,
};

function toRowKey(kind: OptionIndexRow['kind'], id: string): string {
    return `${kind}:${id}`;
}

function isSqlMode(mode: SearchRouterEngineMode): mode is 'sql-like' | 'sql-fts' {
    return mode === 'sql-like' || mode === 'sql-fts';
}

/** True when the router should read its search results from the index instead of today's path. */
function isSearchOptionsIndexActive(): boolean {
    const mode = getSearchRouterEngineMode();
    if (mode === 'off') {
        return false;
    }
    if (mode === 'js-index') {
        return true;
    }
    if (!isEngineAvailable()) {
        return false;
    }
    // The worker builds its FTS index at start, so the matcher has to be chosen before the first request.
    const matcher = mode === 'sql-fts' ? 'fts' : 'like';
    if (getEngineOptionsMatcher() !== matcher) {
        setEngineOptionsMatcher(matcher);
    }
    return true;
}

function notify() {
    for (const subscriber of subscribers) {
        subscriber();
    }
}

function areInputsEqual(previous: SearchOptionsIndexInputs, next: SearchOptionsIndexInputs): boolean {
    return (
        previous.reports === next.reports &&
        previous.personalDetails === next.personalDetails &&
        previous.reportAttributes === next.reportAttributes &&
        previous.policies === next.policies &&
        previous.privateIsArchivedMap === next.privateIsArchivedMap &&
        previous.conciergeReportID === next.conciergeReportID &&
        previous.currentUserAccountID === next.currentUserAccountID &&
        previous.locale === next.locale &&
        previous.translate === next.translate
    );
}

function isFormatConfigEqual(previous: SearchOptionsFormatConfig, next: SearchOptionsFormatConfig): boolean {
    const keys = new Set<string>([...Object.keys(previous), ...Object.keys(next)]);
    for (const key of keys) {
        if (!(key in previous) || !(key in next)) {
            return false;
        }
        // Both objects are indexed by the union of their own keys, which the type of `Omit` cannot express.
        const previousValue: unknown = Reflect.get(previous, key);
        const nextValue: unknown = Reflect.get(next, key);
        if (previousValue !== nextValue) {
            return false;
        }
    }
    return true;
}

function setRow(row: OptionIndexRow, update: IndexUpdate) {
    rows.set(toRowKey(row.kind, row.id), row);
    update.upserts.push(row);
}

function removeRow(kind: OptionIndexRow['kind'], id: string, update: IndexUpdate) {
    if (!rows.delete(toRowKey(kind, id))) {
        return;
    }
    update.deletes.push({kind, id});
}

/**
 * Rebuilds one report row and keeps the DM map in step, collecting the accounts whose DM mapping moved. An account
 * keeps the DM it already maps to until that report stops being its DM, so a mere edit never flips the mapping.
 */
function rebuildReportRow(reportID: string, next: SearchOptionsIndexInputs, update: IndexUpdate, movedAccountIDs: Set<number>) {
    const report = next.reports?.[`${ONYXKEYS.COLLECTION.REPORT}${reportID}`];
    const entry = report ? buildReportIndexEntry(report, next) : undefined;

    for (const [accountID, dmReportID] of dmReportIDByAccountID) {
        if (dmReportID === reportID && entry?.dmAccountID !== accountID) {
            dmReportIDByAccountID.delete(accountID);
            movedAccountIDs.add(accountID);
        }
    }

    if (!entry) {
        removeRow('report', reportID, update);
        return;
    }
    setRow(entry.row, update);
    if (entry.dmAccountID !== undefined && !dmReportIDByAccountID.has(entry.dmAccountID)) {
        dmReportIDByAccountID.set(entry.dmAccountID, reportID);
        movedAccountIDs.add(entry.dmAccountID);
    }
}

function rebuildContactRow(accountID: number, next: SearchOptionsIndexInputs, update: IndexUpdate) {
    const detail: PersonalDetails | null | undefined = next.personalDetails?.[accountID];
    if (!detail) {
        removeRow('contact', String(accountID), update);
        return;
    }
    setRow(buildContactIndexRow(detail, dmReportIDByAccountID.has(accountID), next), update);
}

function rebuildEverything(next: SearchOptionsIndexInputs): IndexUpdate {
    const update: IndexUpdate = {upserts: [], deletes: [], full: true};
    rows.clear();
    dmReportIDByAccountID.clear();
    for (const report of Object.values(next.reports ?? {})) {
        if (!report) {
            continue;
        }
        const entry = buildReportIndexEntry(report, next);
        if (!entry) {
            continue;
        }
        rows.set(toRowKey('report', entry.row.id), entry.row);
        update.upserts.push(entry.row);
        if (entry.dmAccountID !== undefined) {
            dmReportIDByAccountID.set(entry.dmAccountID, report.reportID);
        }
    }
    for (const detail of Object.values(next.personalDetails ?? {})) {
        if (!detail) {
            continue;
        }
        const row = buildContactIndexRow(detail, dmReportIDByAccountID.has(detail.accountID ?? CONST.DEFAULT_NUMBER_ID), next);
        rows.set(toRowKey('contact', row.id), row);
        update.upserts.push(row);
    }
    return update;
}

function applyInputs(next: SearchOptionsIndexInputs): IndexUpdate {
    const changes = collectIndexChanges(inputs, next, dmReportIDByAccountID);
    if (changes === REBUILD_ALL) {
        stats.fullRebuilds += 1;
        return rebuildEverything(next);
    }

    const update: IndexUpdate = {upserts: [], deletes: [], full: false};
    const movedAccountIDs = new Set<number>();
    for (const reportID of changes.reportIDs) {
        rebuildReportRow(reportID, next, update, movedAccountIDs);
    }
    for (const accountID of new Set([...changes.accountIDs, ...movedAccountIDs])) {
        rebuildContactRow(accountID, next, update);
    }
    return update;
}

function countMismatch(activeRequest: SearchRequest, activeInputs: SearchOptionsIndexInputs, result: Options) {
    const {formatConfig, query} = activeRequest;
    const todayList = createFilteredOptionList(
        activeInputs.personalDetails,
        activeInputs.reports,
        activeInputs.reportAttributes,
        activeInputs.privateIsArchivedMap,
        activeInputs.policies,
        {
            currentUserAccountID: activeInputs.currentUserAccountID,
            dateFnsLocale: formatConfig.dateFnsLocale,
            convertToDisplayString: formatConfig.convertToDisplayString,
            conciergeReportID: activeInputs.conciergeReportID,
            maxRecentReports: GUARD_MAX_RECENT_REPORTS,
            includeP2P: true,
            isSearching: true,
            deferContactsUntilSearch: true,
            locale: activeInputs.locale,
        },
        formatConfig.allPolicyTags,
        formatConfig.visibleReportActionsData,
        formatConfig.isTrackIntentUser,
        formatConfig.sortedActions,
    );
    const today = getSearchOptions({...formatConfig, options: todayList, searchQuery: query}).options;
    const todayIDs = [...today.recentReports.map((option) => `r:${option.reportID}`), ...today.personalDetails.map((option) => `c:${option.accountID}`)];
    const indexIDs = [...result.recentReports.map((option) => `r:${option.reportID}`), ...result.personalDetails.map((option) => `c:${option.accountID}`)];
    stats.guardComparisons += 1;
    if (todayIDs.length === indexIDs.length && todayIDs.every((id, index) => id === indexIDs.at(index))) {
        return;
    }
    stats.mismatches += 1;
    Log.warn("[SearchOptionsIndex] result differs from today's path", {query, today: todayIDs.join(' '), index: indexIDs.join(' ')});
}

function finishSearch(activeRequest: SearchRequest, searchVersion: number, candidates: SearchCandidateIDs, startedAt: number) {
    if (!inputs) {
        return;
    }
    const formatStartedAt = performance.now();
    const optionList = buildCandidateOptionList(candidates, inputs, dmReportIDByAccountID, activeRequest.formatConfig);
    const {options} = getSearchOptions({...activeRequest.formatConfig, options: optionList, searchQuery: activeRequest.query});
    stats.lastFormatMs = performance.now() - formatStartedAt;
    stats.totalSearchMs += performance.now() - startedAt;

    if (options.recentReports.length < CONST.AUTO_COMPLETE_SUGGESTER.MAX_AMOUNT_OF_SUGGESTIONS && candidates.hasMoreReports) {
        stats.underflows += 1;
    }

    snapshot = {
        query: activeRequest.query,
        version: searchVersion,
        options,
        source: getSearchRouterEngineMode(),
        candidateReportCount: candidates.reportIDs.length,
        candidateContactCount: candidates.accountIDs.length,
    };
    notify();

    if (isSearchRouterGuardEnabled()) {
        countMismatch(activeRequest, inputs, options);
    }
}

function runSearch() {
    const activeRequest = request;
    if (!activeRequest || !inputs) {
        return;
    }
    const mode = getSearchRouterEngineMode();
    const terms = processSearchString(activeRequest.query);
    const searchVersion = version;
    const startedAt = performance.now();
    stats.searches += 1;

    if (!isSqlMode(mode)) {
        finishSearch(activeRequest, searchVersion, matchOptionIndexRows([...rows.values()], terms, CANDIDATE_WINDOW, CANDIDATE_WINDOW), startedAt);
        return;
    }

    searchOptions({version: searchVersion, terms, reportLimit: CANDIDATE_WINDOW, contactLimit: CANDIDATE_WINDOW})
        .then((reply) => {
            if (request !== activeRequest || version !== searchVersion) {
                stats.staleReplies += 1;
                return;
            }
            stats.engineReplies += 1;
            finishSearch(
                activeRequest,
                searchVersion,
                {reportIDs: reply.reportIDs, accountIDs: reply.contactIDs, hasMoreReports: reply.hasMoreReports, hasMoreContacts: reply.hasMoreContacts},
                startedAt,
            );
        })
        .catch((error: unknown) => {
            stats.failures += 1;
            Log.warn('[SearchOptionsIndex] searchOptions failed', {message: error instanceof Error ? error.message : String(error)});
        });
}

/** Feeds the current Onyx snapshots into the index. Safe to call with the snapshots it already holds. */
function feedSearchOptionsIndex(next: SearchOptionsIndexInputs) {
    if (!isSearchOptionsIndexActive() || (inputs && areInputsEqual(inputs, next))) {
        return;
    }
    const startedAt = performance.now();
    const update = applyInputs(next);
    inputs = next;
    version += 1;
    stats.feeds += 1;
    stats.upsertedRows += update.upserts.length;
    stats.deletedRows += update.deletes.length;
    stats.rowCount = rows.size;
    stats.lastFeedMs = performance.now() - startedAt;
    stats.totalFeedMs += stats.lastFeedMs;

    if (isSqlMode(getSearchRouterEngineMode()) && (update.full || update.upserts.length > 0 || update.deletes.length > 0)) {
        ingestOptions({version, ...update}).catch((error: unknown) => {
            stats.failures += 1;
            Log.warn('[SearchOptionsIndex] ingestOptions failed', {message: error instanceof Error ? error.message : String(error)});
        });
    }

    if (request) {
        runSearch();
    }
}

/** Asks for the options of one query. A repeated call with the same query and configuration is a no-op. */
function requestSearchOptions(query: string, formatConfig: SearchOptionsFormatConfig) {
    if (!isSearchOptionsIndexActive() || (request && request.query === query && isFormatConfigEqual(request.formatConfig, formatConfig))) {
        return;
    }
    request = {query, formatConfig};
    runSearch();
}

function subscribeToSearchOptionsIndex(listener: () => void): () => void {
    subscribers.add(listener);
    return () => {
        subscribers.delete(listener);
    };
}

function getSearchOptionsIndexSnapshot(): SearchOptionsIndexSnapshot | undefined {
    return snapshot;
}

function getSearchOptionsIndexStats(): SearchOptionsIndexStats {
    return {...stats};
}

/** Test-only. Drops the rows, the request, the snapshot and every counter. */
function resetSearchOptionsIndexStore() {
    rows.clear();
    dmReportIDByAccountID.clear();
    inputs = undefined;
    version = 0;
    request = undefined;
    snapshot = undefined;
    for (const key of Object.keys(stats)) {
        Reflect.set(stats, key, 0);
    }
}

export {
    CANDIDATE_WINDOW,
    feedSearchOptionsIndex,
    getSearchOptionsIndexSnapshot,
    getSearchOptionsIndexStats,
    isSearchOptionsIndexActive,
    requestSearchOptions,
    resetSearchOptionsIndexStore,
    subscribeToSearchOptionsIndex,
};
export type {SearchOptionsIndexSnapshot, SearchOptionsIndexStats};
