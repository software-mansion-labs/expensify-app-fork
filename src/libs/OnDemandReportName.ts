import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import ONYXKEYS from '@src/ONYXKEYS';
import type {PersonalDetailsList, Policy, PolicyTagLists, Report, ReportActions, ReportNameValuePairs, Transaction} from '@src/types/onyx';

import type {Locale as DateFnsLocale} from 'date-fns';

import type {ScopedStore} from './OnDemandOnyxStore';

import {
    createScopedStore,
    fetchChainTransactions,
    fetchIntoStore,
    getStoredReport,
    getStoredReportMetadata,
    makeTrackedCollection,
    seedReportGraph,
    watchScopedDependencies,
} from './OnDemandOnyxStore';
// eslint-disable-next-line no-restricted-imports -- this module IS the on-demand engine behind the derived report names; it runs the exact compute the derived value uses
import {computeReportName} from './ReportNameUtils';
import {getPendingDeleteMemberAccountIDs, isValidReport} from './ReportUtils';

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
 * (post-app-ready) while the module-connect lane is unretired, so results stay correct either way.
 */

const MAX_FIXPOINT_PASSES = 6;

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

/**
 * Runs `computeReportName` against the scoped store to a miss-fetch fixpoint. The store must already
 * be seeded (seedReportGraph) and the chain's transactions drained (fetchChainTransactions) — shared
 * with the attributes compute so one store serves both.
 */
async function computeNameFromStore(reportID: string, store: ScopedStore, reportTransactions: Record<string, Transaction[]>, context: OnDemandNameContext): Promise<string> {
    const pendingDeleteMemberAccountIDs = getPendingDeleteMemberAccountIDs(getStoredReportMetadata(store, reportID)?.pendingChatMembers);

    let name = '';
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

    return name;
}

async function computeReportNameOnDemand(reportID: string, context: OnDemandNameContext): Promise<OnDemandNameResult> {
    const store = createScopedStore();
    const chainReportIDs = await seedReportGraph(reportID, store);
    // The chain's transactions: money-request/invoice names read `reportTransactions[reportID]` for
    // the target AND (through the thread-name recursion) for ancestors.
    const reportTransactions = await fetchChainTransactions(chainReportIDs, store);

    // Same semantics as the derived value: a missing or invalid report has NO attributes entry, so its
    // name is `undefined` (consumers fall back through `getReportName`) — never a computed-empty ''.
    const targetReport = getStoredReport(store, reportID);
    if (!targetReport || !isValidReport(targetReport)) {
        return {name: undefined, visitedKeys: store.visited, chainReportIDs};
    }

    const name = await computeNameFromStore(reportID, store, reportTransactions, context);
    return {name, visitedKeys: store.visited, chainReportIDs};
}

/**
 * Watches the result's dependency keys for writes; a transaction write whose `reportID` belongs to
 * the chain also counts (a NEW expense isn't in the visited set yet, but changes the name).
 * Returns an unsubscribe function.
 */
function watchOnDemandReportName(result: OnDemandNameResult, onInvalidated: () => void): () => void {
    return watchScopedDependencies(WATCHED_COLLECTIONS, result.visitedKeys, result.chainReportIDs, onInvalidated);
}

export {computeReportNameOnDemand, computeNameFromStore, watchOnDemandReportName, WATCHED_COLLECTIONS};
export type {OnDemandNameContext, OnDemandNameResult};
