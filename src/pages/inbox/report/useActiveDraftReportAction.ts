import useAncestors from '@hooks/useAncestors';
import useMemberMap from '@hooks/useMemberMap';
import useOnyx from '@hooks/useOnyx';

import {getOriginalReportID, shouldExcludeAncestorReportAction} from '@libs/ReportUtils';
import type {Ancestor} from '@libs/ReportUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type * as OnyxTypes from '@src/types/onyx';

import type {OnyxCollection} from 'react-native-onyx';

import {useMemo} from 'react';

/**
 * Canonical active edit derived from drafts on an ancestor-original report, the visible report, or a linked transaction thread.
 */
type ResolvedActiveDraftEdit = {
    editingReportID: string | null;
    editingReportActionID: string;
    editingReportAction: OnyxTypes.ReportAction | null;
    draftMessage: string;
};

type UseActiveDraftReportActionArgs = {
    reportID: string | undefined;
    effectiveTransactionThreadReportID?: string;
};

/** When any ancestor carries a persisted draft message for its surfaced action (newest-in-chain wins first in priority). */
function findAncestorWithDraftOnChain(params: {
    ancestors: Ancestor[];
    reportActions: OnyxCollection<OnyxTypes.ReportActions> | undefined;
    reportActionsDrafts: OnyxCollection<OnyxTypes.ReportActionsDrafts> | undefined;
}) {
    const {ancestors, reportActions, reportActionsDrafts} = params;

    const ancestorChainReversedNewestFirst = [...ancestors].slice().reverse();

    return ancestorChainReversedNewestFirst.find(({report: ancestorReport, reportAction}) => {
        const reportActionsForAncestor = reportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${ancestorReport.reportID}`];
        const draftOwnerReportID = getOriginalReportID(ancestorReport.reportID, reportAction, reportActionsForAncestor);
        if (!draftOwnerReportID) {
            return false;
        }

        const draftBucketForOwner = reportActionsDrafts?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS}${draftOwnerReportID}`];
        const draftPayload = draftBucketForOwner?.[reportAction.reportActionID];

        return draftPayload?.message !== undefined;
    });
}

/** Pure resolution from scoped Onyx slices (runs each render once snapshots are fresh). */
function computeResolvedActiveDraftEdit(inputs: {
    ancestors: Ancestor[];
    reportActions: OnyxCollection<OnyxTypes.ReportActions> | undefined;
    reportActionsDrafts: OnyxCollection<OnyxTypes.ReportActionsDrafts> | undefined;
    reportID: string | undefined;
    transactionThreadReportID: string | undefined;
}): ResolvedActiveDraftEdit | null {
    const {ancestors, reportActions, reportActionsDrafts, reportID, transactionThreadReportID} = inputs;

    const ancestorWithDraft = findAncestorWithDraftOnChain({ancestors, reportActions, reportActionsDrafts});

    if (ancestorWithDraft != null) {
        const {report: ancestorReport, reportAction: ancestorReportAction} = ancestorWithDraft;
        const actionsRowForAncestor = reportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${ancestorReport.reportID}`];
        const draftOwningReportID = getOriginalReportID(ancestorReport.reportID, ancestorReportAction, actionsRowForAncestor);
        const draftsForOwningReport = draftOwningReportID != null ? reportActionsDrafts?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS}${draftOwningReportID}`] : undefined;
        const persistedDraftPayload = draftsForOwningReport?.[ancestorReportAction.reportActionID];

        const nextMessage = persistedDraftPayload?.message ?? null;
        if (nextMessage == null) {
            return null;
        }

        return {
            editingReportID: ancestorReport.reportID,
            editingReportActionID: ancestorReportAction.reportActionID,
            editingReportAction: ancestorReportAction,
            draftMessage: nextMessage,
        };
    }

    const draftsBucketForVisibleReport = reportActionsDrafts?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS}${reportID}`];
    const draftEntryOnVisibleReport = Object.entries(draftsBucketForVisibleReport ?? {}).find(([, draft]) => draft?.message !== undefined);

    if (draftEntryOnVisibleReport != null) {
        const [reportActionIDCarryingDraft, reportActionDraftPersisted] = draftEntryOnVisibleReport;
        const nextMessageFromVisibleDraft = reportActionDraftPersisted?.message ?? null;
        if (nextMessageFromVisibleDraft === null) {
            return null;
        }

        const reportActionsMapForVisibleReport = reportID != null ? reportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportID}`] : undefined;

        return {
            editingReportID: reportID ?? null,
            editingReportActionID: reportActionIDCarryingDraft,
            editingReportAction: reportActionsMapForVisibleReport?.[reportActionIDCarryingDraft] ?? null,
            draftMessage: nextMessageFromVisibleDraft,
        };
    }

    if (transactionThreadReportID == null) {
        return null;
    }

    const draftsOnTransactionThread = reportActionsDrafts?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS}${transactionThreadReportID}`];
    const transactionThreadDraftEntry = Object.entries(draftsOnTransactionThread ?? {}).find(([, draftRow]) => draftRow?.message !== undefined);

    const [threadDraftReportActionID, threadPersistedDraft] = transactionThreadDraftEntry ?? [undefined, undefined];

    if (threadDraftReportActionID == null || threadPersistedDraft?.message === undefined) {
        return null;
    }

    const actionsMapForTransactionThread = reportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${transactionThreadReportID}`];
    const hydratedThreadReportAction = actionsMapForTransactionThread?.[threadDraftReportActionID];

    if (hydratedThreadReportAction == null) {
        return null;
    }

    return {
        editingReportID: transactionThreadReportID,
        editingReportActionID: threadDraftReportActionID,
        editingReportAction: hydratedThreadReportAction,
        draftMessage: threadPersistedDraft.message,
    };
}

/**
 * Narrow Onyx subscriptions and resolve which single report/action (if any) has edit draft state.
 *
 * Preference order matches the provider: ancestor chain first, visible report draft, transaction-thread draft.
 */
function useActiveDraftReportAction({reportID, effectiveTransactionThreadReportID}: UseActiveDraftReportActionArgs): ResolvedActiveDraftEdit | null {
    const [report] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`);
    const ancestors = useAncestors(report, shouldExcludeAncestorReportAction);

    const transactionThreadReportID =
        !effectiveTransactionThreadReportID || effectiveTransactionThreadReportID === CONST.FAKE_REPORT_ID || effectiveTransactionThreadReportID === reportID
            ? undefined
            : effectiveTransactionThreadReportID;

    // Lazy-Onyx POC: the old whole-collection subscriptions (with slicing selectors) hydrated ALL
    // report actions and drafts to serve a bounded, known ID set — the visible report, the
    // transaction thread, and the ancestors. Member maps subscribe to exactly those keys.
    const actionsReportIDs = useMemo(() => [reportID, transactionThreadReportID, ...ancestors.map((ancestor) => ancestor.report.reportID)], [reportID, transactionThreadReportID, ancestors]);
    const reportActions = useMemberMap<OnyxTypes.ReportActions>(ONYXKEYS.COLLECTION.REPORT_ACTIONS, actionsReportIDs);

    const draftsReportIDs = useMemo(
        () => [
            reportID,
            transactionThreadReportID,
            // A draft can live on the report that OWNS the ancestor action (getOriginalReportID), not
            // necessarily the ancestor itself — mirror the old selector's bucket resolution.
            ...ancestors.map((ancestor) =>
                getOriginalReportID(ancestor.report.reportID, ancestor.reportAction, reportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${ancestor.report.reportID}`]),
            ),
        ],
        [reportID, transactionThreadReportID, ancestors, reportActions],
    );
    const reportActionsDrafts = useMemberMap<OnyxTypes.ReportActionsDrafts>(ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS, draftsReportIDs);

    return computeResolvedActiveDraftEdit({ancestors, reportActions, reportActionsDrafts, reportID, transactionThreadReportID});
}

export default useActiveDraftReportAction;
