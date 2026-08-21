import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy, Report, ReportActions, ReportNameValuePairs, Transaction, TransactionViolation} from '@src/types/onyx';
import type {LHNReportAttributes, ReportAttributes} from '@src/types/onyx/DerivedValues';

import type {OnyxCollection} from 'react-native-onyx';

import {queryCollection} from 'react-native-onyx/dist/OnyxQuery';

import type {ScopedStore} from './OnDemandOnyxStore';
import type {OnDemandNameContext} from './OnDemandReportName';

import {getOldestPreviewActionID, isActionable, needsViolationFix} from './actions/OnyxDerived/configs/reportAttributes';
import Log from './Log';
import {getIsOffline} from './NetworkState';
import {createScopedStore, fetchChainTransactions, fetchIntoStore, getStoredReport, makeTrackedCollection, seedReportGraph, watchScopedDependencies} from './OnDemandOnyxStore';
import {computeNameFromStore, WATCHED_COLLECTIONS} from './OnDemandReportName';
import {getLoginByAccountID} from './PersonalDetailsUtils';
import {isDeletedAction} from './ReportActionsUtils';
import {generateIsEmptyReport, generateReportAttributes, hasVisibleReportFieldViolations, isArchivedReport, isPolicyAdmin, isPolicyExpenseChat, isValidReport} from './ReportUtils';
import SidebarUtils from './SidebarUtils';

/**
 * Lazy-Onyx POC (derived retirement, per-item reportAttributes): computes ONE report's FULL
 * attributes (brick road, action badge, errors, name...) from targeted member reads and per-report
 * indexed queries — the drop-in for reading `DERIVED.REPORT_ATTRIBUTES.reports[reportID]`, whose
 * engine would hydrate every dependency collection to serve one report. Runs the exact same pieces
 * the derived config runs per report (generateReportAttributes, field violations,
 * SidebarUtils.getReasonAndReportActionThatHasRedBrickRoad, the badge rules, and the parent-chat
 * error propagation), against the same scoped-store machinery as OnDemandReportName.
 *
 * Parent-chat propagation: the derived config sweeps ALL reports to mark chats whose child IOU
 * reports carry errors. Per item we instead query `reports where chatReportID = <target>` and run the
 * per-child error check for up to CHILD_REPORTS_CAP children (capped work is logged — a chat beyond
 * the cap may miss the propagated Fix badge until the derived engine's post-ready pass covers the
 * whole map for LHN anyway).
 */

const MAX_FIXPOINT_PASSES = 6;
const CHILD_REPORTS_CAP = 100;

/** Builds one LHN projection member from the scoped store's tracked collections — see the scoped materializer. */
type OnDemandProjectionBuilder = (params: {
    reportID: string;
    attributes: ReportAttributes;
    reports: OnyxCollection<Report>;
    transactionViolations: OnyxCollection<TransactionViolation[]>;
    transactions: OnyxCollection<Transaction>;
    reportNameValuePairs: OnyxCollection<ReportNameValuePairs>;
}) => LHNReportAttributes | null;

type OnDemandAttributesResult = {
    /** `undefined` when the report is missing or invalid — mirroring the derived value, which holds no entry for such reports. */
    attributes: ReportAttributes | undefined;
    /** The LHN projection member, when a builder was passed (null = delete; undefined = not requested/no attributes). */
    projection?: LHNReportAttributes | null;
    /** Full Onyx keys the compute depends on — a write to any of them invalidates the attributes. */
    visitedKeys: Set<string>;
    /** The target + ancestors + chat + child report IDs — a NEW transaction landing on any of them invalidates too. */
    chainReportIDs: Set<string>;
};

/** The target's + children's violation members, so hasViolations-style keyed reads hit the store. */
async function seedViolations(store: ScopedStore, reportTransactions: Record<string, Transaction[]>): Promise<void> {
    const violationKeys = Object.values(reportTransactions)
        .flat()
        .map((transaction) => `${ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS}${transaction.transactionID}`);
    await fetchIntoStore(store, violationKeys);
}

/** Child reports of a chat via the query API (never a collection scan), for the error propagation. */
async function fetchChildReports(chatReportID: string): Promise<Report[]> {
    const result = await queryCollection(ONYXKEYS.COLLECTION.REPORT, {
        where: [{field: 'chatReportID', operator: 'eq', value: chatReportID}],
        orderBy: {field: 'reportID', direction: 'asc'},
        limit: CHILD_REPORTS_CAP + 1,
    });
    if (result.hasMore) {
        Log.warn('[OnDemandReportAttributes] Chat has more child reports than the propagation cap; the Fix badge may be incomplete until the derived engine covers it', {
            chatReportID,
            cap: CHILD_REPORTS_CAP,
        });
    }
    return (
        result.items
            .slice(0, CHILD_REPORTS_CAP)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the query DSL returns untyped rows; every report_ collection value is a Report
            .map((item) => item.value as Report | undefined)
            .filter((report): report is Report => !!report?.reportID && report.reportID !== chatReportID)
    );
}

/**
 * The derived config's per-report body (lines around 548-657 there), executed against the scoped
 * store's tracked proxies. Returns everything the config stores per report except the name.
 */
function computeAttributesCore(reportID: string, store: ScopedStore, currentUserAccountID: number, currentUserLogin: string) {
    const reports = makeTrackedCollection<Report>(ONYXKEYS.COLLECTION.REPORT, store);
    const policies = makeTrackedCollection<Policy>(ONYXKEYS.COLLECTION.POLICY, store);
    const transactions = makeTrackedCollection<Transaction>(ONYXKEYS.COLLECTION.TRANSACTION, store);
    const transactionViolations = makeTrackedCollection<TransactionViolation[]>(ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS, store);
    const reportActions = makeTrackedCollection<ReportActions>(ONYXKEYS.COLLECTION.REPORT_ACTIONS, store);
    const reportNameValuePairs = makeTrackedCollection<ReportNameValuePairs>(ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS, store);

    const report = reports?.[`${ONYXKEYS.COLLECTION.REPORT}${reportID}`];
    if (!report || !isValidReport(report)) {
        return undefined;
    }

    const chatReport = reports?.[`${ONYXKEYS.COLLECTION.REPORT}${report.chatReportID}`];
    const reportNameValuePair = reportNameValuePairs?.[`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${report.reportID}`];
    const reportActionsList = reportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${report.reportID}`];
    const isReportArchived = isArchivedReport(reportNameValuePair);
    const isOffline = getIsOffline();

    const {
        hasAnyViolations,
        requiresAttention,
        reportErrors,
        oneTransactionThreadReportID,
        actionBadge: actionGreenBadge,
        actionTargetReportActionID: actionGreenTargetReportActionID,
    } = generateReportAttributes({
        report,
        chatReport,
        reportActions,
        transactionViolations,
        isReportArchived,
        allTransactions: transactions,
        reports,
        policies,
        currentUserAccountID,
        currentUserLogin,
    });

    const policy = policies?.[`${ONYXKEYS.COLLECTION.POLICY}${report.policyID}`];
    const hasFieldViolations = hasVisibleReportFieldViolations(report, policy, currentUserAccountID);

    let brickRoadStatus;
    let actionBadge;
    let actionTargetReportActionID;
    let needsParentChatErrorPropagation = false;
    const reasonAndReportAction = SidebarUtils.getReasonAndReportActionThatHasRedBrickRoad({
        report,
        chatReport,
        reportActions: reportActionsList,
        hasViolations: hasAnyViolations || hasFieldViolations,
        reportErrors,
        transactions,
        isOffline,
        currentUserAccountID,
        transactionViolations,
        isReportArchived: !!isReportArchived,
        reports,
    });

    // When the report is ready to submit, always show the green Submit badge regardless of violations.
    const willShowGreenSubmit = requiresAttention && actionGreenBadge === CONST.REPORT.ACTION_BADGE.SUBMIT;

    if (reasonAndReportAction && !willShowGreenSubmit) {
        needsParentChatErrorPropagation = true;

        // RBR/Fix mirrors GBR's access rule: only show on the child when the user can't already see it
        // on the parent workspace chat (the propagation pass surfaces it there).
        const chatPolicy = chatReport?.policyID ? policies?.[`${ONYXKEYS.COLLECTION.POLICY}${chatReport.policyID}`] : undefined;
        const isChildOfAccessiblePolicyExpenseChat = !!chatReport && isPolicyExpenseChat(chatReport) && (!!chatReport.isOwnPolicyExpenseChat || isPolicyAdmin(chatPolicy));
        if (!isChildOfAccessiblePolicyExpenseChat) {
            brickRoadStatus = CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR;
            actionBadge = CONST.REPORT.ACTION_BADGE.FIX;
            actionTargetReportActionID = reasonAndReportAction.reportAction?.reportActionID;
        }
    }
    if (brickRoadStatus !== CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR && requiresAttention) {
        brickRoadStatus = CONST.BRICK_ROAD_INDICATOR_STATUS.INFO;
        actionBadge = actionGreenBadge;
        actionTargetReportActionID = actionGreenTargetReportActionID;
    }

    return {
        report,
        chatReport,
        isEmpty: generateIsEmptyReport(report, isReportArchived),
        brickRoadStatus,
        requiresAttention,
        actionBadge,
        actionTargetReportActionID,
        reportErrors,
        oneTransactionThreadReportID,
        needsParentChatErrorPropagation,
    };
}

async function computeReportAttributesOnDemand(reportID: string, context: OnDemandNameContext, buildProjection?: OnDemandProjectionBuilder): Promise<OnDemandAttributesResult> {
    const store = createScopedStore();
    const chainReportIDs = await seedReportGraph(reportID, store);
    const reportTransactions = await fetchChainTransactions(chainReportIDs, store);
    await seedViolations(store, reportTransactions);

    const targetReport = getStoredReport(store, reportID);
    if (!targetReport || !isValidReport(targetReport)) {
        return {attributes: undefined, visitedKeys: store.visited, chainReportIDs};
    }

    // Propagation inputs: the target's child reports (it may be a chat whose children carry errors),
    // their graphs, transactions and violations.
    const childReports = await fetchChildReports(reportID);
    const childReportIDs: string[] = [];
    for (const childReport of childReports) {
        childReportIDs.push(childReport.reportID);
        chainReportIDs.add(childReport.reportID);
        const childKey = `${ONYXKEYS.COLLECTION.REPORT}${childReport.reportID}`;
        store.values.set(childKey, childReport);
        store.visited.add(childKey);
    }
    await Promise.all(
        childReportIDs.map((childReportID) =>
            fetchIntoStore(store, [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${childReportID}`, `${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${childReportID}`]),
        ),
    );
    const childPolicyKeys = childReports.map((childReport) => (childReport.policyID ? `${ONYXKEYS.COLLECTION.POLICY}${childReport.policyID}` : '')).filter(Boolean);
    await fetchIntoStore(store, childPolicyKeys);
    const childTransactions = await fetchChainTransactions(new Set(childReportIDs), store);
    await seedViolations(store, childTransactions);

    // Fixpoint over the whole attribute compute (core + propagation): any keyed read the deep helpers
    // make that the seed missed is fetched and the compute re-runs.
    let attributes: ReportAttributes | undefined;
    for (let pass = 0; pass < MAX_FIXPOINT_PASSES; pass++) {
        store.misses.clear();

        const core = computeAttributesCore(reportID, store, context.currentUserAccountID, context.currentUserLogin);
        if (!core) {
            return {attributes: undefined, visitedKeys: store.visited, chainReportIDs};
        }

        // Parent-chat error propagation (the config's whole-map sweep, scoped to this chat's children):
        // an errored child marks THIS report when this report is the child's parent chat.
        let brickRoadStatus = core.brickRoadStatus;
        let actionBadge = core.actionBadge;
        let actionTargetReportActionID = core.actionTargetReportActionID;
        const reports = makeTrackedCollection<Report>(ONYXKEYS.COLLECTION.REPORT, store);
        const reportActions = makeTrackedCollection<ReportActions>(ONYXKEYS.COLLECTION.REPORT_ACTIONS, store);
        const policies = makeTrackedCollection<Policy>(ONYXKEYS.COLLECTION.POLICY, store);
        const transactionViolations = makeTrackedCollection<TransactionViolation[]>(ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS, store);

        const erroredChildReportIDs: string[] = [];
        for (const childReport of childReports) {
            // Skip children whose parent action in this chat was deleted — no actionable surface here.
            const parentReportAction = childReport.parentReportActionID
                ? reportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${childReport.parentReportID}`]?.[childReport.parentReportActionID]
                : undefined;
            if (isDeletedAction(parentReportAction)) {
                continue;
            }
            const childCore = computeAttributesCore(childReport.reportID, store, context.currentUserAccountID, context.currentUserLogin);
            if (childCore?.needsParentChatErrorPropagation || childCore?.brickRoadStatus === CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR) {
                erroredChildReportIDs.push(childReport.reportID);
            }
        }

        if (erroredChildReportIDs.length > 0) {
            const chatReportActions = reportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportID}`];
            actionTargetReportActionID =
                getOldestPreviewActionID(reportID, erroredChildReportIDs, reports, chatReportActions, isActionable) ??
                getOldestPreviewActionID(reportID, childReportIDs, reports, chatReportActions, (childReport) =>
                    needsViolationFix(
                        childReport,
                        getLoginByAccountID(childReport?.ownerAccountID, context.personalDetailsList),
                        policies,
                        transactionViolations,
                        context.currentUserAccountID,
                        context.currentUserLogin,
                    ),
                ) ??
                getOldestPreviewActionID(reportID, erroredChildReportIDs, reports, chatReportActions) ??
                actionTargetReportActionID;
            brickRoadStatus = CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR;
            actionBadge = CONST.REPORT.ACTION_BADGE.FIX;
        }

        attributes = {
            // Filled in below — the name has its own internal miss-fetch fixpoint, so it runs once after this loop.
            reportName: '',
            isEmpty: core.isEmpty,
            brickRoadStatus,
            requiresAttention: core.requiresAttention,
            actionBadge,
            actionTargetReportActionID,
            reportErrors: core.reportErrors,
            oneTransactionThreadReportID: core.oneTransactionThreadReportID,
            needsParentChatErrorPropagation: core.needsParentChatErrorPropagation,
        };

        if (store.misses.size === 0) {
            break;
        }
        // eslint-disable-next-line no-await-in-loop -- fixpoint: this pass's misses decide the next pass's fetches
        await fetchIntoStore(store, [...store.misses]);
    }

    if (attributes) {
        attributes.reportName = await computeNameFromStore(reportID, store, reportTransactions, context);
    }

    // Scoped write-time materializer support: build the LHN projection member inside the SAME store,
    // with its own small miss-fetch fixpoint (eligibility reads mostly seeded keys, but e.g. the
    // parent chain of an unseeded shape can miss).
    let projection: LHNReportAttributes | null | undefined;
    if (attributes && buildProjection) {
        for (let pass = 0; pass < MAX_FIXPOINT_PASSES; pass++) {
            store.misses.clear();
            projection = buildProjection({
                reportID,
                attributes,
                reports: makeTrackedCollection<Report>(ONYXKEYS.COLLECTION.REPORT, store),
                transactionViolations: makeTrackedCollection<TransactionViolation[]>(ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS, store),
                transactions: makeTrackedCollection<Transaction>(ONYXKEYS.COLLECTION.TRANSACTION, store),
                reportNameValuePairs: makeTrackedCollection<ReportNameValuePairs>(ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS, store),
            });
            if (store.misses.size === 0) {
                break;
            }
            // eslint-disable-next-line no-await-in-loop -- fixpoint: this pass's misses decide the next pass's fetches
            await fetchIntoStore(store, [...store.misses]);
        }
    }

    return {attributes, projection, visitedKeys: store.visited, chainReportIDs};
}

/** Watches the result's dependency keys (same collection set as the name path, plus violations). */
function watchOnDemandReportAttributes(result: OnDemandAttributesResult, onInvalidated: () => void): () => void {
    return watchScopedDependencies([...WATCHED_COLLECTIONS, ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS], result.visitedKeys, result.chainReportIDs, onInvalidated);
}

export {computeReportAttributesOnDemand, watchOnDemandReportAttributes};
export type {OnDemandAttributesResult, OnDemandProjectionBuilder};
