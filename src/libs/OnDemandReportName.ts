import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {computeReportName} from '@libs/ReportNameUtils';
import {getPendingDeleteMemberAccountIDs, isValidReport} from '@libs/ReportUtils';

import ONYXKEYS from '@src/ONYXKEYS';
import type {PersonalDetailsList, Policy, PolicyTagLists, Report, ReportActions, ReportMetadata, ReportNameValuePairs, Transaction} from '@src/types/onyx';

import type {Locale as DateFnsLocale} from 'date-fns';
import type {OnyxCollection, OnyxKey} from 'react-native-onyx';

import {queryCollection, registerQueryWatcher} from 'react-native-onyx/dist/OnyxQuery';
import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';

/**
 * Lazy-Onyx POC (derived retirement, per-item reportAttributes): computes ONE report's name from
 * targeted member reads and per-report indexed queries instead of the whole-app REPORT_ATTRIBUTES
 * derived value, whose engine has to hydrate every dependency collection to serve any single name.
 *
 * How: seed a scoped store with the report's dependency graph (parent chain, chat report, their
 * actions/policies/RNVPs, the chain's transactions via `transactions where reportID = X`), then run
 * the SAME `computeReportName` the derived config uses against Proxy-wrapped collections that record
 * every key read. Keys read but absent from the store are fetched and the compute re-runs, to a
 * fixpoint — so exotic name shapes (moved transactions, invoice receiver rooms, unapproved-transaction
 * reports...) resolve their own dependencies without this module enumerating every branch. The
 * recorded key set doubles as the invalidation set for live updates (see `watchOnDemandReportName`).
 *
 * Reachability audit (docs-poc plan, per-item lane): after the `isClosedExpenseReportWithNoExpenses`
 * fix, `computeReportName` reads the passed collections by key only, so the scoped store is sound.
 * Deeper ReportUtils helpers may still fall back to their module-level caches; those remain primed
 * while the module-connect lane is unretired, so results stay correct either way.
 */

const MAX_PARENT_DEPTH = 10;
const MAX_FIXPOINT_PASSES = 6;
const TRANSACTIONS_PAGE_SIZE = 500;

/** Collections the compute may read by key — each gets a tracked Proxy over the scoped store. */
const TRACKED_COLLECTIONS = [
    ONYXKEYS.COLLECTION.REPORT,
    ONYXKEYS.COLLECTION.REPORT_ACTIONS,
    ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS,
    ONYXKEYS.COLLECTION.TRANSACTION,
    ONYXKEYS.COLLECTION.POLICY,
    ONYXKEYS.COLLECTION.POLICY_TAGS,
] as const;

/** Collections watched for live updates — the tracked ones plus report metadata (read directly, not via a proxy). */
const WATCHED_COLLECTIONS = [...TRACKED_COLLECTIONS, ONYXKEYS.COLLECTION.REPORT_METADATA] as const;

type ScopedStore = {
    /** Fetched values by full Onyx key. `has()` distinguishes "fetched, empty" from "never fetched". */
    values: Map<string, unknown>;
    /** Every key the compute read or the seed fetched — the invalidation set. */
    visited: Set<string>;
    /** Keys the last compute pass read but the store doesn't hold yet. */
    misses: Set<string>;
};

type OnDemandNameContext = {
    personalDetailsList: PersonalDetailsList | undefined;
    currentUserAccountID: number;
    currentUserLogin: string;
    translate: LocalizedTranslate;
    dateFnsLocale: DateFnsLocale | undefined;
    conciergeReportID: string | undefined;
    isTrackIntentUser: boolean | undefined;
};

type OnDemandNameResult = {
    /** `undefined` when the report is missing or invalid — mirroring the derived value, which holds no entry for such reports. */
    name: string | undefined;
    /** Full Onyx keys the compute depends on — a write to any of them invalidates the name. */
    visitedKeys: Set<string>;
    /** The target + ancestor + chat report IDs — a NEW transaction landing on any of them invalidates too. */
    chainReportIDs: Set<string>;
};

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
 * Seeds the store with the report's known dependency graph: the parent chain up to the root (report +
 * actions + RNVP + policy per node), each node's chat report (+ its actions — invoice names read the
 * receiver room), the target's policy tags and metadata. Returns the chain's report IDs.
 */
async function seedStore(reportID: string, store: ScopedStore): Promise<Set<string>> {
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

async function computeReportNameOnDemand(reportID: string, context: OnDemandNameContext): Promise<OnDemandNameResult> {
    const store: ScopedStore = {values: new Map(), visited: new Set(), misses: new Set()};
    const chainReportIDs = await seedStore(reportID, store);

    // The chain's transactions: money-request/invoice names read `reportTransactions[reportID]` for
    // the target AND (through the thread-name recursion) for ancestors.
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- reportMetadata_ members always hold ReportMetadata
    const reportMetadata = store.values.get(`${ONYXKEYS.COLLECTION.REPORT_METADATA}${reportID}`) as ReportMetadata | undefined;
    const pendingDeleteMemberAccountIDs = getPendingDeleteMemberAccountIDs(reportMetadata?.pendingChatMembers);

    // Same semantics as the derived value: a missing or invalid report has NO attributes entry, so its
    // name is `undefined` (consumers fall back through `getReportName`) — never a computed-empty ''.
    const targetReport = getStoredReport(store, reportID);
    if (!targetReport || !isValidReport(targetReport)) {
        return {name: undefined, visitedKeys: store.visited, chainReportIDs};
    }

    let name: string | undefined;
    for (let pass = 0; pass < MAX_FIXPOINT_PASSES; pass++) {
        store.misses.clear();
        name = computeReportName({
            report: getStoredReport(store, reportID),
            reports: makeTrackedCollection<Report>(ONYXKEYS.COLLECTION.REPORT, store),
            policies: makeTrackedCollection<Policy>(ONYXKEYS.COLLECTION.POLICY, store),
            transactions: makeTrackedCollection<Transaction>(ONYXKEYS.COLLECTION.TRANSACTION, store),
            allReportNameValuePairs: makeTrackedCollection<ReportNameValuePairs>(ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS, store),
            allPolicyTags: makeTrackedCollection<PolicyTagLists>(ONYXKEYS.COLLECTION.POLICY_TAGS, store),
            reportActions: makeTrackedCollection<ReportActions>(ONYXKEYS.COLLECTION.REPORT_ACTIONS, store),
            personalDetailsList: context.personalDetailsList,
            currentUserAccountID: context.currentUserAccountID,
            currentUserLogin: context.currentUserLogin,
            translate: context.translate,
            dateFnsLocale: context.dateFnsLocale,
            conciergeReportID: context.conciergeReportID,
            reportAttributes: undefined,
            reportTransactions,
            isTrackIntentUser: context.isTrackIntentUser,
            pendingDeleteMemberAccountIDs,
        });
        if (store.misses.size === 0) {
            break;
        }
        // eslint-disable-next-line no-await-in-loop -- fixpoint: this pass's misses decide the next pass's fetches
        await fetchIntoStore(store, [...store.misses]);
    }

    return {name, visitedKeys: store.visited, chainReportIDs};
}

/**
 * Watches the result's dependency keys for writes; also treats a transaction write whose `reportID`
 * belongs to the chain as a hit (a NEW expense isn't in the visited set yet, but changes the name).
 * Returns an unsubscribe function.
 */
function watchOnDemandReportName(result: OnDemandNameResult, onInvalidated: () => void): () => void {
    const unsubscribers = WATCHED_COLLECTIONS.map((collectionKey) =>
        registerQueryWatcher(collectionKey, (key, value) => {
            if (result.visitedKeys.has(key)) {
                onInvalidated();
                return;
            }
            if (collectionKey !== ONYXKEYS.COLLECTION.TRANSACTION) {
                return;
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the watcher delivers untyped written values; transactions_ members are Transactions
            const writtenReportID = (value as Transaction | undefined)?.reportID;
            if (writtenReportID && result.chainReportIDs.has(writtenReportID)) {
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

export {computeReportNameOnDemand, watchOnDemandReportName};
export type {OnDemandNameContext, OnDemandNameResult};
