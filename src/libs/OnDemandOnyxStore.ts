import ONYXKEYS from '@src/ONYXKEYS';
import type {Report, ReportMetadata, Transaction} from '@src/types/onyx';

import type {OnyxCollection, OnyxKey} from 'react-native-onyx';

import {queryCollection, registerQueryWatcher} from 'react-native-onyx/dist/OnyxQuery';
import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';

/**
 * Lazy-Onyx POC — shared machinery for the on-demand per-report computes (names, attributes):
 * a scoped store fed by targeted member reads and per-report indexed queries, plus tracked
 * collection Proxies that record every key read (for watcher invalidation) and every miss
 * (fetched before the next fixpoint pass). See OnDemandReportName / OnDemandReportAttributes.
 */

const MAX_PARENT_DEPTH = 10;
const TRANSACTIONS_PAGE_SIZE = 500;

type ScopedStore = {
    /** Fetched values by full Onyx key. `has()` distinguishes "fetched, empty" from "never fetched". */
    values: Map<string, unknown>;
    /** Every key the compute read or the seed fetched — the invalidation set. */
    visited: Set<string>;
    /** Keys the last compute pass read but the store doesn't hold yet. */
    misses: Set<string>;
};

function createScopedStore(): ScopedStore {
    return {values: new Map(), visited: new Set(), misses: new Set()};
}

function fetchIntoStore(store: ScopedStore, keys: string[]): Promise<void> {
    const pendingKeys = keys.filter((key) => !!key && !store.values.has(key));
    return Promise.all(
        pendingKeys.map((key) =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- keys are built from ONYXKEYS collection prefixes; OnyxKey is just their template-literal refinement
            OnyxUtils.get(key as OnyxKey).then((value) => {
                store.values.set(key, value);
                store.visited.add(key);
            }),
        ),
    ).then(() => undefined);
}

/**
 * A collection object backed by the scoped store: keyed reads are served from the store and recorded;
 * reads of keys the store doesn't hold are recorded as misses (fetched before the next fixpoint pass).
 * Stray enumeration sees exactly the scoped members of this collection — never silently everything.
 */
function makeTrackedCollection<TValue>(collectionPrefix: string, store: ScopedStore): OnyxCollection<TValue> {
    const target: Record<string, TValue | undefined> = {};
    return new Proxy(target, {
        get(proxyTarget, property, receiver) {
            if (typeof property !== 'string' || !property.startsWith(collectionPrefix)) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- prototype/symbol passthrough (e.g. hasOwnProperty); never collection data
                return Reflect.get(proxyTarget, property, receiver);
            }
            store.visited.add(property);
            if (!store.values.has(property)) {
                store.misses.add(property);
                return undefined;
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the store is untyped by design; members of this prefix always hold TValue
            return store.values.get(property) as TValue | undefined;
        },
        has(proxyTarget, property) {
            if (typeof property !== 'string' || !property.startsWith(collectionPrefix)) {
                return Reflect.has(proxyTarget, property);
            }
            store.visited.add(property);
            return store.values.has(property);
        },
        ownKeys() {
            return [...store.values.keys()].filter((key) => key.startsWith(collectionPrefix));
        },
        getOwnPropertyDescriptor(proxyTarget, property) {
            if (typeof property !== 'string' || !property.startsWith(collectionPrefix) || !store.values.has(property)) {
                return Reflect.getOwnPropertyDescriptor(proxyTarget, property);
            }
            return {enumerable: true, configurable: true, value: store.values.get(property)};
        },
    });
}

function getStoredReport(store: ScopedStore, reportID: string): Report | undefined {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- report_ members always hold Reports
    return store.values.get(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`) as Report | undefined;
}

function getStoredReportMetadata(store: ScopedStore, reportID: string): ReportMetadata | undefined {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- reportMetadata_ members always hold ReportMetadata
    return store.values.get(`${ONYXKEYS.COLLECTION.REPORT_METADATA}${reportID}`) as ReportMetadata | undefined;
}

/** All of one report's transactions via the indexed query (never a collection scan), drained fully. */
async function fetchReportTransactions(reportID: string): Promise<Transaction[]> {
    const transactions: Transaction[] = [];
    let after;
    let hasMore = true;
    while (hasMore) {
        // eslint-disable-next-line no-await-in-loop -- keyset pagination: each page's cursor comes from the previous one
        const result = await queryCollection(ONYXKEYS.COLLECTION.TRANSACTION, {
            where: [{field: 'reportID', operator: 'eq', value: reportID}],
            orderBy: {field: 'created', direction: 'asc'},
            limit: TRANSACTIONS_PAGE_SIZE,
            after,
        });
        for (const item of result.items) {
            if (!item.value) {
                continue;
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the query DSL returns untyped rows; every transactions_ collection value is a Transaction
            transactions.push(item.value as Transaction);
        }
        after = result.nextCursor;
        hasMore = result.hasMore;
    }
    return transactions;
}

/**
 * Drains the chain's transactions into the store and returns them grouped by reportID — the
 * `reportTransactions` shape the compute functions take.
 */
async function fetchChainTransactions(chainReportIDs: Set<string>, store: ScopedStore): Promise<Record<string, Transaction[]>> {
    const reportTransactions: Record<string, Transaction[]> = {};
    await Promise.all(
        [...chainReportIDs].map(async (chainReportID) => {
            const transactions = await fetchReportTransactions(chainReportID);
            reportTransactions[chainReportID] = transactions;
            for (const transaction of transactions) {
                const transactionKey = `${ONYXKEYS.COLLECTION.TRANSACTION}${transaction.transactionID}`;
                store.values.set(transactionKey, transaction);
                store.visited.add(transactionKey);
            }
        }),
    );
    return reportTransactions;
}

/**
 * Seeds the store with the report's known dependency graph: the parent chain up to the root (report +
 * actions + RNVP + policy per node), each node's chat report (+ its actions — invoice names read the
 * receiver room), the target's policy tags and metadata. Returns the chain's report IDs.
 */
async function seedReportGraph(reportID: string, store: ScopedStore): Promise<Set<string>> {
    const chainReportIDs = new Set<string>();
    let currentReportID: string | undefined = reportID;
    let depth = 0;

    while (currentReportID && !chainReportIDs.has(currentReportID) && depth < MAX_PARENT_DEPTH) {
        chainReportIDs.add(currentReportID);
        // eslint-disable-next-line no-await-in-loop -- the parent chain is inherently sequential: each hop's ID comes from the fetched report
        await fetchIntoStore(store, [`${ONYXKEYS.COLLECTION.REPORT}${currentReportID}`]);
        const report = getStoredReport(store, currentReportID);
        if (!report) {
            break;
        }

        const nodeKeys = [
            `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${currentReportID}`,
            `${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${currentReportID}`,
            report.policyID ? `${ONYXKEYS.COLLECTION.POLICY}${report.policyID}` : '',
        ];
        if (report.chatReportID && report.chatReportID !== currentReportID && !chainReportIDs.has(report.chatReportID)) {
            chainReportIDs.add(report.chatReportID);
            nodeKeys.push(`${ONYXKEYS.COLLECTION.REPORT}${report.chatReportID}`, `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${report.chatReportID}`);
        }
        // eslint-disable-next-line no-await-in-loop -- see above: chain hops are sequential
        await fetchIntoStore(store, nodeKeys.filter(Boolean));

        const chatReport = report.chatReportID ? getStoredReport(store, report.chatReportID) : undefined;
        const receiverPolicyIDs = [report.invoiceReceiver, chatReport?.invoiceReceiver]
            .map((receiver) => (receiver && 'policyID' in receiver ? receiver.policyID : undefined))
            .filter((policyID): policyID is string => !!policyID);
        // eslint-disable-next-line no-await-in-loop -- see above
        await fetchIntoStore(
            store,
            [chatReport?.policyID ? `${ONYXKEYS.COLLECTION.POLICY}${chatReport.policyID}` : '', ...receiverPolicyIDs.map((policyID) => `${ONYXKEYS.COLLECTION.POLICY}${policyID}`)].filter(
                Boolean,
            ),
        );

        currentReportID = report.parentReportID;
        depth++;
    }

    const targetReport = getStoredReport(store, reportID);
    await fetchIntoStore(
        store,
        [targetReport?.policyID ? `${ONYXKEYS.COLLECTION.POLICY_TAGS}${targetReport.policyID}` : '', `${ONYXKEYS.COLLECTION.REPORT_METADATA}${reportID}`].filter(Boolean),
    );

    return chainReportIDs;
}

/**
 * Watches the given dependency keys for writes across the listed collections; also treats a
 * transaction write whose `reportID` belongs to the chain as a hit (a NEW expense isn't in the
 * visited set yet, but changes the result). Returns an unsubscribe function.
 */
function watchScopedDependencies(collectionKeys: readonly OnyxKey[], visitedKeys: Set<string>, chainReportIDs: Set<string>, onInvalidated: () => void): () => void {
    const unsubscribers = collectionKeys.map((collectionKey) =>
        registerQueryWatcher(collectionKey, (key, value) => {
            if (visitedKeys.has(key)) {
                onInvalidated();
                return;
            }
            if (collectionKey !== ONYXKEYS.COLLECTION.TRANSACTION) {
                return;
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the watcher delivers untyped written values; transactions_ members are Transactions
            const writtenReportID = (value as Transaction | undefined)?.reportID;
            if (writtenReportID && chainReportIDs.has(writtenReportID)) {
                onInvalidated();
            }
        }),
    );
    return () => {
        for (const unsubscribe of unsubscribers) {
            unsubscribe();
        }
    };
}

export {
    createScopedStore,
    fetchIntoStore,
    makeTrackedCollection,
    getStoredReport,
    getStoredReportMetadata,
    fetchReportTransactions,
    fetchChainTransactions,
    seedReportGraph,
    watchScopedDependencies,
};
export type {ScopedStore};
