import {getIsOffline} from '@libs/NetworkState';
import {getOneTransactionThreadReportID} from '@libs/ReportActionsUtils';

import {computeForReport} from '@userActions/OnyxDerived/configs/sortedReportActions';
import startScopedMaterializer from '@userActions/OnyxDerived/scopedMaterializer';
import type {ScopedWrite} from '@userActions/OnyxDerived/scopedMaterializer';

import ONYXKEYS from '@src/ONYXKEYS';
import type {Report, ReportAction, ReportActions} from '@src/types/onyx';
import type {SortedReportActionsDerivedValue} from '@src/types/onyx/DerivedValues';

import type {OnyxCollection} from 'react-native-onyx';

import Onyx from 'react-native-onyx';
import {queryCollection} from 'react-native-onyx/dist/OnyxQuery';
import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';

/**
 * Lazy-Onyx POC, scoped-store derived (SOTA step 3): RAM_ONLY_SORTED_REPORT_ACTIONS as a write-time
 * materializer. The classic engine subscribed to the whole REPORT_ACTIONS and REPORT collections;
 * scoped, a write recomputes just the affected report's entry from targeted reads (its actions, its
 * report + chat report, and — for one-transaction threads — the thread's actions). The output is
 * RAM_ONLY, so every engine start rebuilds via a sweep (the classic engine's full first compute,
 * without pinning the inputs in RAM afterwards).
 *
 * Fan-out: a reportActions_ write recomputes its own report (matching the classic incremental path —
 * a thread's write does not refresh the parent's combined view there either); a report_ write
 * recomputes that report plus its children (`reports where chatReportID = X`, indexed) because
 * children read the chat report; an offline flip sweeps (it feeds the one-transaction-thread
 * resolution), matching the classic full recompute on NETWORK changes.
 */

const SCOPED_SORTED_REPORT_ACTIONS_VERSION = 1;

const CHILD_FANOUT_PAGE_SIZE = 500;

type SortedEntry = {
    sortedReportActions: ReportAction[];
    transactionThreadReportID: string | undefined;
    lastAction: ReportAction | undefined;
};

async function childReportIDsOf(chatReportID: string): Promise<string[]> {
    const childIDs: string[] = [];
    let after;
    let hasMore = true;
    while (hasMore) {
        // eslint-disable-next-line no-await-in-loop -- keyset pagination: each page's cursor comes from the previous one
        const result = await queryCollection(ONYXKEYS.COLLECTION.REPORT, {
            where: [{field: 'chatReportID', operator: 'eq', value: chatReportID}],
            orderBy: {field: 'reportID', direction: 'asc'},
            limit: CHILD_FANOUT_PAGE_SIZE,
            after,
        });
        for (const item of result.items) {
            const childID = item.key.slice(ONYXKEYS.COLLECTION.REPORT.length);
            if (childID !== chatReportID) {
                childIDs.push(childID);
            }
        }
        after = result.nextCursor;
        hasMore = result.hasMore;
    }
    return childIDs;
}

async function entryIDsForWrites(writes: ScopedWrite[]): Promise<Set<string>> {
    const entryIDs = new Set<string>();
    const chatFanoutIDs = new Set<string>();
    for (const write of writes) {
        if (write.collectionKey === ONYXKEYS.COLLECTION.REPORT_ACTIONS) {
            entryIDs.add(write.key.slice(ONYXKEYS.COLLECTION.REPORT_ACTIONS.length));
        } else if (write.collectionKey === ONYXKEYS.COLLECTION.REPORT) {
            const reportID = write.key.slice(ONYXKEYS.COLLECTION.REPORT.length);
            entryIDs.add(reportID);
            chatFanoutIDs.add(reportID);
        }
    }
    await Promise.all(
        [...chatFanoutIDs].map(async (chatReportID) => {
            for (const childID of await childReportIDsOf(chatReportID)) {
                entryIDs.add(childID);
            }
        }),
    );
    return entryIDs;
}

async function allEntryIDs(): Promise<string[]> {
    const allKeys = await OnyxUtils.getAllKeys();
    const reportIDs: string[] = [];
    for (const key of allKeys) {
        if (typeof key === 'string' && key.startsWith(ONYXKEYS.COLLECTION.REPORT_ACTIONS)) {
            reportIDs.push(key.slice(ONYXKEYS.COLLECTION.REPORT_ACTIONS.length));
        }
    }
    return reportIDs;
}

async function computeEntry(reportID: string): Promise<SortedEntry | null> {
    const actions = await OnyxUtils.get(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportID}`);
    if (!actions) {
        return null;
    }
    const report = await OnyxUtils.get(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`);
    const chatReport = report?.chatReportID ? await OnyxUtils.get(`${ONYXKEYS.COLLECTION.REPORT}${report.chatReportID}`) : undefined;

    // Scoped mini-collections holding exactly what computeForReport looks up by key. The
    // one-transaction thread's actions are resolved up front so the combined view can embed them.
    const miniReports: OnyxCollection<Report> = {
        [`${ONYXKEYS.COLLECTION.REPORT}${reportID}`]: report,
    };
    if (report?.chatReportID) {
        miniReports[`${ONYXKEYS.COLLECTION.REPORT}${report.chatReportID}`] = chatReport;
    }
    const miniReportActions: OnyxCollection<ReportActions> = {
        [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportID}`]: actions,
    };
    const transactionThreadReportID = getOneTransactionThreadReportID(report, chatReport, actions, getIsOffline());
    if (transactionThreadReportID) {
        miniReportActions[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${transactionThreadReportID}`] = await OnyxUtils.get(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${transactionThreadReportID}`);
    }

    return computeForReport(reportID, actions, miniReportActions, miniReports, getIsOffline());
}

function applyEntries(entries: Map<string, SortedEntry | null>): void {
    // Read-modify-SET on the RAM_ONLY blob (see the reportAttributes materializer for why not merge).
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the derived key always holds a SortedReportActionsDerivedValue
    const currentValue = OnyxUtils.tryGetCachedValue(ONYXKEYS.DERIVED.RAM_ONLY_SORTED_REPORT_ACTIONS) as SortedReportActionsDerivedValue | undefined;
    const nextValue: SortedReportActionsDerivedValue = {
        sortedActions: {...currentValue?.sortedActions},
        lastActions: {...currentValue?.lastActions},
        transactionThreadIDs: {...currentValue?.transactionThreadIDs},
    };
    for (const [reportID, entry] of entries) {
        if (entry) {
            nextValue.sortedActions[reportID] = entry.sortedReportActions;
            nextValue.transactionThreadIDs[reportID] = entry.transactionThreadReportID;
            if (entry.lastAction) {
                nextValue.lastActions[reportID] = entry.lastAction;
            } else {
                delete nextValue.lastActions[reportID];
            }
        } else {
            delete nextValue.sortedActions[reportID];
            delete nextValue.lastActions[reportID];
            delete nextValue.transactionThreadIDs[reportID];
        }
    }
    Onyx.set(ONYXKEYS.DERIVED.RAM_ONLY_SORTED_REPORT_ACTIONS, nextValue);
}

function startSortedReportActionsScopedMaterializer(): void {
    startScopedMaterializer<SortedEntry>({
        outputKey: ONYXKEYS.DERIVED.RAM_ONLY_SORTED_REPORT_ACTIONS,
        version: SCOPED_SORTED_REPORT_ACTIONS_VERSION,
        isOutputPersisted: false,
        watchCollections: [ONYXKEYS.COLLECTION.REPORT_ACTIONS, ONYXKEYS.COLLECTION.REPORT],
        entryIDsForWrites,
        allEntryIDs,
        computeEntry,
        applyEntries,
        ensureOutputs: () => {
            Onyx.merge(ONYXKEYS.DERIVED.RAM_ONLY_SORTED_REPORT_ACTIONS, {sortedActions: {}, lastActions: {}, transactionThreadIDs: {}});
        },
        connectTriggers: ({requestSweep}) => {
            let isNetworkInitialized = false;
            let wasOffline = false;
            Onyx.connectWithoutView({
                key: ONYXKEYS.NETWORK,
                callback: () => {
                    const isOffline = getIsOffline();
                    const hasFlipped = isNetworkInitialized && isOffline !== wasOffline;
                    wasOffline = isOffline;
                    isNetworkInitialized = true;
                    if (hasFlipped) {
                        requestSweep('offline state flipped');
                    }
                },
            });
        },
    });
}

export default startSortedReportActionsScopedMaterializer;
