import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {translate as translateForLocale} from '@libs/Localize';
import {computeReportAttributesOnDemand} from '@libs/OnDemandReportAttributes';
import type {OnDemandNameContext} from '@libs/OnDemandReportName';

import {buildLHNProjectionEntry, getDisplayNameChanges} from '@userActions/OnyxDerived/configs/reportAttributes';
import startScopedMaterializer from '@userActions/OnyxDerived/scopedMaterializer';
import type {ScopedWrite} from '@userActions/OnyxDerived/scopedMaterializer';

import CONST from '@src/CONST';
import type {Locale} from '@src/CONST/LOCALES';
import IntlStore from '@src/languages/IntlStore';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Beta, PersonalDetailsList, Session, Transaction} from '@src/types/onyx';
import type {LHNReportAttributes, ReportAttributes, ReportAttributesDerivedValue} from '@src/types/onyx/DerivedValues';

import type {OnyxEntry} from 'react-native-onyx';

import {isTrackIntentUserSelector} from '@selectors/Onboarding';
import Onyx from 'react-native-onyx';
import {queryCollection} from 'react-native-onyx/dist/OnyxQuery';
import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';

/**
 * Lazy-Onyx POC, scoped-store derived (SOTA step 3): reportAttributes as a WRITE-TIME materializer.
 *
 * Replaces the classic engine for DERIVED.REPORT_ATTRIBUTES: instead of subscribing to (and thereby
 * hydrating) every dependency collection, this listens to member writes, maps them to the affected
 * reports, and recomputes ONLY those entries via the per-item scoped compute
 * (computeReportAttributesOnDemand) — which also builds the LHN projection member in the same pass.
 * Outputs: fragment merges into the legacy whole-map blob (whole-map consumers keep working) and the
 * indexed `derivedReportAttributes_` projection.
 *
 * Fan-out rules (mirroring the classic config's incremental paths):
 * - report_/rnvp_/reportMetadata_ writes → that report (+ its chat, for badge propagation);
 * - reportActions_ writes → that report + child reports referenced by the written actions;
 * - transaction_ writes → the transaction's report + its chat;
 * - transactionViolations_ writes → the violation's transaction's report (targeted transaction read);
 * - policy_/policyTags_ writes → `reports where policyID = X` (indexed query);
 * - session/locale/betas/intro changes and real display-name renames → full sweep (rare; chunked,
 *   background). NEW conciergeReportID → just that report.
 *
 * Known deltas vs classic (documented POC trade-offs): a transaction DELETED without an accompanying
 * report/actions write can't be mapped to its report (the payload is gone) — in practice deletions
 * always rewrite report totals/actions, which re-drives the entry; NETWORK flips don't recompute
 * (classic's incremental path effectively skipped them too).
 */

/** Bump when compute semantics change — mismatch with the persisted stamp triggers a rebuild. */
const SCOPED_REPORT_ATTRIBUTES_VERSION = 1;

const POLICY_FANOUT_PAGE_SIZE = 500;
const PROJECTION_WRITE_CHUNK_SIZE = 500;

type ScopedEntry = {
    attributes: ReportAttributes;
    projection: LHNReportAttributes | null;
};

// Singleton inputs held by the trigger connects (never whole collections).
let session: OnyxEntry<Session>;
let personalDetailsList: OnyxEntry<PersonalDetailsList>;
let betas: OnyxEntry<Beta[]>;
let conciergeReportID: OnyxEntry<string>;
let isTrackIntentUser: boolean | undefined;
let currentLocale: Locale | undefined;

function buildContext(): OnDemandNameContext {
    const locale = currentLocale ?? IntlStore.getCurrentLocale();
    const translate: LocalizedTranslate = (path, ...parameters) => translateForLocale(locale, path, ...parameters);
    return {
        personalDetailsList,
        currentUserAccountID: session?.accountID ?? CONST.DEFAULT_NUMBER_ID,
        currentUserLogin: session?.email ?? '',
        translate,
        dateFnsLocale: IntlStore.getDateFnsLocale(locale),
        conciergeReportID: conciergeReportID ?? undefined,
        isTrackIntentUser,
    };
}

/** All report IDs for `reports where policyID = X` — the policy/policyTags fan-out. */
async function reportIDsForPolicy(policyID: string): Promise<string[]> {
    const reportIDs: string[] = [];
    let after;
    let hasMore = true;
    while (hasMore) {
        // eslint-disable-next-line no-await-in-loop -- keyset pagination: each page's cursor comes from the previous one
        const result = await queryCollection(ONYXKEYS.COLLECTION.REPORT, {
            where: [{field: 'policyID', operator: 'eq', value: policyID}],
            orderBy: {field: 'reportID', direction: 'asc'},
            limit: POLICY_FANOUT_PAGE_SIZE,
            after,
        });
        for (const item of result.items) {
            reportIDs.push(item.key.slice(ONYXKEYS.COLLECTION.REPORT.length));
        }
        after = result.nextCursor;
        hasMore = result.hasMore;
    }
    return reportIDs;
}

async function entryIDsForWrites(writes: ScopedWrite[]): Promise<Set<string>> {
    const entryIDs = new Set<string>();
    const violationTransactionIDs = new Set<string>();
    const reportsNeedingChat = new Set<string>();
    const policyIDs = new Set<string>();

    for (const write of writes) {
        switch (write.collectionKey) {
            case ONYXKEYS.COLLECTION.REPORT: {
                const reportID = write.key.slice(ONYXKEYS.COLLECTION.REPORT.length);
                entryIDs.add(reportID);
                // The write stream delivers merge DELTAS, which may not carry chatReportID — the
                // targeted-read pass below resolves the merged value's chat for badge propagation.
                reportsNeedingChat.add(reportID);
                break;
            }
            case ONYXKEYS.COLLECTION.REPORT_ACTIONS: {
                const reportID = write.key.slice(ONYXKEYS.COLLECTION.REPORT_ACTIONS.length);
                entryIDs.add(reportID);
                // Actions can reference child reports (threads/IOU previews) whose attributes depend on them.
                for (const action of Object.values(write.value ?? {})) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- reportActions_ members hold action maps
                    const childReportID = (action as {childReportID?: string} | undefined)?.childReportID;
                    if (childReportID) {
                        entryIDs.add(childReportID);
                    }
                }
                break;
            }
            case ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS:
                entryIDs.add(write.key.slice(ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS.length));
                break;
            case ONYXKEYS.COLLECTION.REPORT_METADATA:
                entryIDs.add(write.key.slice(ONYXKEYS.COLLECTION.REPORT_METADATA.length));
                break;
            case ONYXKEYS.COLLECTION.TRANSACTION: {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- transactions_ members are Transactions
                const reportID = (write.value as Transaction | undefined)?.reportID;
                if (reportID) {
                    entryIDs.add(reportID);
                    reportsNeedingChat.add(reportID);
                } else {
                    // A merge delta without reportID — resolve it from the merged transaction.
                    violationTransactionIDs.add(write.key.slice(ONYXKEYS.COLLECTION.TRANSACTION.length));
                }
                break;
            }
            case ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS:
                violationTransactionIDs.add(write.key.slice(ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS.length));
                break;
            case ONYXKEYS.COLLECTION.POLICY:
                policyIDs.add(write.key.slice(ONYXKEYS.COLLECTION.POLICY.length));
                break;
            case ONYXKEYS.COLLECTION.POLICY_TAGS:
                policyIDs.add(write.key.slice(ONYXKEYS.COLLECTION.POLICY_TAGS.length));
                break;
            default:
                break;
        }
    }

    // Violations are keyed by transaction ID — resolve the owning report with a targeted read.
    await Promise.all(
        [...violationTransactionIDs].map(async (transactionID) => {
            const transaction = await OnyxUtils.get(`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`);
            if (transaction?.reportID) {
                entryIDs.add(transaction.reportID);
                reportsNeedingChat.add(transaction.reportID);
            }
        }),
    );

    // A money-report change can flip the badge on its parent chat.
    await Promise.all(
        [...reportsNeedingChat].map(async (reportID) => {
            const report = await OnyxUtils.get(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`);
            if (report?.chatReportID && report.chatReportID !== reportID) {
                entryIDs.add(report.chatReportID);
            }
        }),
    );

    // Policy/policyTags fan-out through the indexed query — never a collection scan.
    await Promise.all(
        [...policyIDs].map(async (policyID) => {
            for (const reportID of await reportIDsForPolicy(policyID)) {
                entryIDs.add(reportID);
            }
        }),
    );

    return entryIDs;
}

async function allEntryIDs(): Promise<string[]> {
    const allKeys = await OnyxUtils.getAllKeys();
    const reportIDs: string[] = [];
    for (const key of allKeys) {
        if (typeof key === 'string' && key.startsWith(ONYXKEYS.COLLECTION.REPORT) && !key.startsWith(ONYXKEYS.COLLECTION.REPORT_DRAFT)) {
            reportIDs.push(key.slice(ONYXKEYS.COLLECTION.REPORT.length));
        }
    }
    return reportIDs;
}

async function computeEntry(reportID: string): Promise<ScopedEntry | null> {
    const result = await computeReportAttributesOnDemand(reportID, buildContext(), ({attributes, reports, transactionViolations, transactions, reportNameValuePairs}) =>
        buildLHNProjectionEntry({
            reportID,
            attributes,
            reportAttributesMap: {[reportID]: attributes},
            reports,
            transactionViolations,
            transactions,
            reportNameValuePairs,
            betas,
            session,
            conciergeReportID: conciergeReportID ?? undefined,
        }),
    );
    if (!result.attributes) {
        return null;
    }
    return {attributes: result.attributes, projection: result.projection ?? null};
}

function applyEntries(entries: Map<string, ScopedEntry | null>): void {
    const projectionMembers: Record<string, LHNReportAttributes | null> = {};

    // The blob is REPLACED (read-modify-set), not merged: an entry whose error/badge fields went back
    // to `undefined` must drop them, and Onyx.merge keeps absent fields. The blob is a warm cached
    // singleton, and one whole-blob write per batch is exactly the classic engine's flush cost.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the derived key always holds a ReportAttributesDerivedValue
    const currentBlob = OnyxUtils.tryGetCachedValue(ONYXKEYS.DERIVED.REPORT_ATTRIBUTES) as ReportAttributesDerivedValue | undefined;
    const nextReports: Record<string, ReportAttributes> = {...currentBlob?.reports};
    for (const [reportID, entry] of entries) {
        if (entry) {
            nextReports[reportID] = entry.attributes;
        } else {
            delete nextReports[reportID];
        }
        projectionMembers[`${ONYXKEYS.COLLECTION.DERIVED_REPORT_ATTRIBUTES}${reportID}`] = entry?.projection ?? null;
    }
    Onyx.set(ONYXKEYS.DERIVED.REPORT_ATTRIBUTES, {reports: nextReports, locale: currentBlob?.locale ?? currentLocale ?? null});

    const memberEntries = Object.entries(projectionMembers);
    for (let chunkStart = 0; chunkStart < memberEntries.length; chunkStart += PROJECTION_WRITE_CHUNK_SIZE) {
        const chunk = Object.fromEntries(memberEntries.slice(chunkStart, chunkStart + PROJECTION_WRITE_CHUNK_SIZE));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the chunk holds this collection's member shapes by contract
        Onyx.mergeCollection(ONYXKEYS.COLLECTION.DERIVED_REPORT_ATTRIBUTES, chunk as Parameters<typeof Onyx.mergeCollection>[1]);
    }
}

function ensureOutputs(): void {
    // Legacy whole-map consumers expect the blob to exist once the engine runs (and again post-clear).
    // Merge (not set): idempotent, and it can never clobber entry fragments racing in concurrently.
    Onyx.merge(ONYXKEYS.DERIVED.REPORT_ATTRIBUTES, {reports: {}, locale: IntlStore.getCurrentLocale() ?? null});
}

function startReportAttributesScopedMaterializer(): void {
    startScopedMaterializer<ScopedEntry>({
        ensureOutputs,
        outputKey: ONYXKEYS.DERIVED.REPORT_ATTRIBUTES,
        version: SCOPED_REPORT_ATTRIBUTES_VERSION,
        watchCollections: [
            ONYXKEYS.COLLECTION.REPORT,
            ONYXKEYS.COLLECTION.REPORT_ACTIONS,
            ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS,
            ONYXKEYS.COLLECTION.REPORT_METADATA,
            ONYXKEYS.COLLECTION.TRANSACTION,
            ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS,
            ONYXKEYS.COLLECTION.POLICY,
            ONYXKEYS.COLLECTION.POLICY_TAGS,
        ],
        entryIDsForWrites,
        allEntryIDs,
        computeEntry,
        applyEntries,
        connectTriggers: ({requestSweep, requestEntries}) => {
            let isSessionInitialized = false;
            Onyx.connectWithoutView({
                key: ONYXKEYS.SESSION,
                callback: (value) => {
                    const hasUserChanged = isSessionInitialized && (value?.accountID !== session?.accountID || value?.email !== session?.email);
                    session = value;
                    isSessionInitialized = true;
                    if (hasUserChanged) {
                        requestSweep('session user changed');
                    }
                },
            });

            Onyx.connectWithoutView({
                key: ONYXKEYS.PERSONAL_DETAILS_LIST,
                callback: (value) => {
                    personalDetailsList = value;
                    // Narrow via display-name signatures (shared with the classic config): most
                    // personal-details merges change nothing name-related and are no-ops here.
                    const changes = getDisplayNameChanges(value);
                    // 'all' = first data with no baseline. Entries may already have been computed
                    // BEFORE the details arrived (ordering isn't guaranteed), so both cases sweep —
                    // one background sweep per session, the same cost as the classic engine's
                    // startup full recompute.
                    if (changes === 'all' || (changes instanceof Set && changes.size > 0)) {
                        requestSweep(changes === 'all' ? 'personal details baseline established' : `display names changed for ${changes.size} account(s)`);
                    }
                },
            });

            let areBetasInitialized = false;
            Onyx.connectWithoutView({
                key: ONYXKEYS.BETAS,
                callback: (value) => {
                    const haveBetasChanged = areBetasInitialized && value !== betas;
                    betas = value;
                    areBetasInitialized = true;
                    if (haveBetasChanged) {
                        requestSweep('betas changed');
                    }
                },
            });

            let isConciergeInitialized = false;
            Onyx.connectWithoutView({
                key: ONYXKEYS.CONCIERGE_REPORT_ID,
                callback: (value) => {
                    const previousConciergeReportID = conciergeReportID;
                    const hasChanged = isConciergeInitialized && value !== previousConciergeReportID;
                    conciergeReportID = value;
                    isConciergeInitialized = true;
                    if (hasChanged) {
                        requestEntries([previousConciergeReportID, value].filter((reportID): reportID is string => !!reportID));
                    }
                },
            });

            let isIntroInitialized = false;
            Onyx.connectWithoutView({
                key: ONYXKEYS.NVP_INTRO_SELECTED,
                callback: (value) => {
                    const nextIsTrackIntentUser = isTrackIntentUserSelector(value);
                    const hasChanged = isIntroInitialized && nextIsTrackIntentUser !== isTrackIntentUser;
                    isTrackIntentUser = nextIsTrackIntentUser;
                    isIntroInitialized = true;
                    if (hasChanged) {
                        requestSweep('intro selection changed');
                    }
                },
            });

            // Locale: recompute names only once the new translations actually load (mirrors the classic engine).
            Onyx.connectWithoutView({
                key: ONYXKEYS.RAM_ONLY_ARE_TRANSLATIONS_LOADING,
                callback: (isLoading) => {
                    if (isLoading ?? true) {
                        return;
                    }
                    const nextLocale = IntlStore.getCurrentLocale();
                    if (!nextLocale || nextLocale === currentLocale) {
                        currentLocale = nextLocale ?? currentLocale;
                        return;
                    }
                    const isFirstLocale = currentLocale === undefined;
                    currentLocale = nextLocale;
                    Onyx.merge(ONYXKEYS.DERIVED.REPORT_ATTRIBUTES, {locale: nextLocale});
                    if (!isFirstLocale) {
                        requestSweep(`locale changed to ${nextLocale}`);
                    }
                },
            });
        },
    });
}

export default startReportAttributesScopedMaterializer;
